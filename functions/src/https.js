const functions = require('firebase-functions')
const admin = require('firebase-admin')
const crs = require('crypto-random-string')
const argon2 = require('argon2')
const shajs = require('sha.js')
const moment = require('moment')
const vcfer = require('vcfer')
const VCard = vcfer.default

const logger = require('../config/logger')
const vcfFiller = require('./vcf-filler')
const {
	getPreferred,
	sortMap,
	memberIdBuilder,
	editUrlBuilder,
	promiseAllSettled
} = require('./shared')
const {
	uploadMemberImage,
	deleteMemberImage
} = require('./shared/MemberImageManager')
const { uploadImage } = require('./shared/ImageManager')
const { db, setDb, clubPlanId, clubProductId } = require('../get-db')

const { sendEmail } = require('./email/email')

const {
	validateClubName,
	deleteClub,
	clubPaymentStatusOkay
} = require('./shared/ClubManager')

const { processCard, processCardString } = require('./shared/CardManager')

// TODO real key
const Stripe = require('stripe')
const stripe = new Stripe(functions.config().stripe.key)

const WEBSITE_URL = functions.config().website.url

// const db = getDb()

const FieldValue = admin.firestore.FieldValue

/**
 * @typedef {import('firebase-functions').https.CallableContext} CallableContext
 */

/**
 * @param {FirebaseFirestore.DocumentSnapshot} clubDoc
 * @param {CallableContext} context
 */
const ownsClub = (clubDoc, context) => clubDoc.data().owner === context.auth.uid

/**
 *
 * @param {string} clubId
 * @param {CallableContext} context
 */
const ownsClubId = async (clubId, context) => {
	const clubDoc = await db()
		.collection('clubs')
		.doc(clubId)
		.get()

	return ownsClub(clubDoc, context)
}

/**
 * @param {{ club: string }} data
 * @param {CallableContext} context
 * @param {
  (
    t: FirebaseFirestore.Transaction,
    clubDoc?: FirebaseFirestore.DocumentSnapshot
  ) => FirebaseFirestore.Transaction
} transaction
*/
const ownerTransaction = async (
	data,
	context,
	transaction,
	allowIfBadClub = false
) => {
	return await db().runTransaction(async t => {
		const clubRef = db()
			.collection('clubs')
			.doc(data.club)
		const clubDoc = await t.get(clubRef)
		if (!allowIfBadClub && !clubPaymentStatusOkay(clubDoc.data().status))
			throw new Error('Club subscription not okay: ' + clubDoc.data().status)
		if (!ownsClub(clubDoc, context))
			throw new Error('Not the owner of this club')
		return await transaction(t, clubDoc)
	})
}

/** ================================================================== */
/** ================================================================== */
/** ================================================================== */
/** ================================================================== */

/**
 * @param {*} data
 * @param {CallableContext} context
 */
const ping = async (data, context) => {
	return data
}

const myCustomerInfo = async (data, context) => {
	const userDoc = await db()
		.collection('users')
		.doc(context.auth.uid)
		.get()

	const customer = await stripe.customers.retrieve(
		userDoc.data().stripeCustomerId,
		{
			expand: ['subscriptions.data.latest_invoice']
		}
	)

	return { customer }
}

const paymentSuccessUrl = (clubId, creating = false) =>
	WEBSITE_URL + '/app/club/' + clubId + (creating ? '?creating=true' : '')
const PAYMENT_CANCEL_URL = WEBSITE_URL + '/app'

/**
 *
 * @param {{name: string}} param0
 * @param {CallableContext} context
 */
const payForClub = async ({ name }, context) => {
	try {
		const validName = validateClubName(name)

		const clubId = crs({ length: 10 })

		if (!(await admin.auth().getUser(context.auth.uid)).emailVerified) {
			throw new Error(
				"This user's email is not verified. You must verify your account to purchase a club."
			)
		}

		const userDoc = await db()
			.collection('users')
			.doc(context.auth.uid)
			.get()

		const session = await stripe.checkout.sessions.create({
			payment_method_types: ['card'],
			customer: userDoc.data().stripeCustomerId,
			subscription_data: {
				items: [
					{
						plan: clubPlanId,
						quantity: 1
					}
				],
				metadata: {
					name: validName,
					owner: context.auth.uid,
					clubId
				}
				// trial_end: moment()
				// 	.add(49, 'hours')
				// 	.unix()
			},
			// TODO real URL parsing
			success_url: paymentSuccessUrl(clubId, true),
			cancel_url: PAYMENT_CANCEL_URL
		})

		console.log(
			`started payment sesion ${session.id}, trying to create a club named ${validName}`
		)
		return {
			sessionId: session.id
		}
	} catch (err) {
		console.error(err)
		return err
	}
}

/**
 *
 * @param {{clubId: string}} param0
 * @param {CallableContext} context
 */
const updateClubPayment = async ({ clubId }, context) => {
	const clubDoc = await db()
		.collection('clubs')
		.doc(clubId)
		.get()

	if (!clubDoc.exists) throw new Error('Club does not already exist.')

	if (clubDoc.data().owner != context.auth.uid)
		throw new Error(`User ${context.auth.uid} does not own club ${clubDoc.id}`)

	const userDoc = await db()
		.collection('users')
		.doc(context.auth.uid)
		.get()

	const session = await stripe.checkout.sessions.create({
		payment_method_types: ['card'],
		mode: 'setup',
		setup_intent_data: {
			metadata: {
				customer_id: userDoc.data().stripeCustomerId,
				subscription_id: clubDoc.data().stripe
			}
		},
		success_url: paymentSuccessUrl(clubId),
		cancel_url: PAYMENT_CANCEL_URL
	})

	return {
		sessionId: session.id
	}
}

// const sendClubInvoice = async ({ clubId }, context) => {
// 	const clubDoc = await db()
// 		.collection('clubs')
// 		.doc(clubId)
// 		.get()

// 	if (!clubDoc.exists) throw new Error('Club does not already exist.')

// 	if (clubDoc.data().owner != context.auth.uid)
// 		throw new Error(`User ${context.auth.uid} does not own club ${clubDoc.id}`)

// 	const subscription = await stripe.subscriptions.retrieve(
// 		clubDoc.data().stripe
// 	)

// 	await stripe.invoices.sendInvoice(subscription.latest_invoice.id)

// 	return {
// 		invoiceUrl: subscription.latest_invoice.hosted_invoice_url
// 	}
// }

/**
 * This is a function for the esoteric possibility that
 * A club's subscription will be canceled in its entirety.
 * @param {{name: string}} param0
 * @param {CallableContext} context
 */
const payForExistingClub = async ({ clubId }, context) => {
	const clubDoc = await db()
		.collection('clubs')
		.doc(clubId)
		.get()

	if (!clubDoc.exists) {
		throw new Error('Club does not already exist.')
	}

	const userDoc = await db()
		.collection('users')
		.doc(context.auth.uid)
		.get()

	const session = await stripe.checkout.sessions.create({
		payment_method_types: ['card'],
		customer: userDoc.data().stripeCustomerId,
		subscription_data: {
			items: [
				{
					plan: clubPlanId,
					quantity: 1
				}
			],
			metadata: {
				name: clubDoc.data().name,
				owner: context.auth.uid,
				clubId
			}
		},
		//TODO real url parsing
		success_url: paymentSuccessUrl(clubId),
		cancel_url: PAYMENT_CANCEL_URL
	})

	return {
		sessionId: session.id
	}
}

const changeClubPassword = async ({ club, pass1, pass2 }, context) => {
	if (pass1 !== pass2) throw new Error('Passwords do not match')
	const pass = pass1
	const passHash = await argon2.hash(pass)
	const clubUrlHash = shajs('sha256')
		.update(club)
		.digest('hex')

	await ownerTransaction({ club }, context, (t, clubDoc) =>
		t
			.set(
				db()
					.collection('passHashes')
					.doc(clubUrlHash),
				{
					passHash
				}
			)
			.update(clubDoc.ref, {
				passwordSet: true,
				passwordEnabled: clubDoc.data().passwordSet
					? clubDoc.data().passwordEnabled
					: true // the first time you set the password, change passwordEnabled to true.
			})
	)
}

const changeClubName = async ({ club, name: cname }, context) => {
	const name = validateClubName(cname)

	const upd = {}
	upd[`ownedClubs.${club}`] = name
	await ownerTransaction({ club }, context, (t, clubDoc) =>
		t
			// change club doc
			.update(clubDoc.ref, {
				name
			})
			// change user doc
			.update(
				db()
					.collection('users')
					.doc(clubDoc.data().owner),
				upd
			)
	)
}

const sendMassClubEmail = async ({ club }, context) => {
	const clubDoc = await db()
		.collection('clubs')
		.doc(club)
		.get()

	if (!ownsClub(clubDoc, context))
		return new Error(`You do not own club ${club}`)

	/** @type {{[id: string]: MemberSortInfo}} */
	const memberList = clubDoc.data().memberList

	// string of all members that do have an email address
	const ids = Object.entries(memberList)
		.filter(([id, val]) => !!val.email)
		.map(e => e[0])

	console.log(
		`Sending mass email for club ${clubDoc.data().name} to ${
			ids.length
		} inboxes (Out of ${Object.keys(memberList).length} members)...`
	)

	const res = await promiseAllSettled(
		ids.map(async id => {
			try {
				const memberDoc = await clubDoc.ref
					.collection('members')
					.doc(id)
					.get()

				await sendEmail(
					memberDoc.data().email,
					'edit_link',
					`Edit Your Contact in ${clubDoc.data().name}`,
					{
						clubName: clubDoc.data().name,
						club,
						editKey: memberDoc.data().editUrl
					}
				)
				console.log(`sent to ${memberDoc.data().email}`)
			} catch (err) {
				console.error(err)
				throw err
			}
		})
	)

	const resolved = res.filter(r => r.status == 'resolved').length
	const rejected = res.filter(r => r.status == 'rejected').length

	console.log(
		`Out of ${res.length} emails, ${resolved} sent, and ${rejected} rejected.`
	)

	return {
		total: res.length,
		resolved,
		rejected
	}
}

/**
 *
 * @param {*} param0
 * @param {CallableContext} context
 */
const requestDeleteEmail = async ({ club }, context) => {
	const clubUrlHash = shajs('sha256')
		.update(club)
		.digest('hex')

	const deleteKey = crs({ length: 30 })

	await ownerTransaction(
		{ club },
		context,
		(t, clubDoc) =>
			t.update(
				db()
					.collection('passHashes')
					.doc(clubUrlHash),
				{
					deleteKey,
					deleteKeyExpiration: moment()
						.add(1, 'hour') // link expiration: 1 HOUR
						.valueOf()
				}
			),
		true // allow deletion request, even if club invoice isn't paid.
	)

	const clubDoc = await db()
		.collection('clubs')
		.doc(club)
		.get()

	const clubName = clubDoc.data().name

	// const deleteUrl = `${WEBSITE_URL}/app/club/${club}/confirm_delete/${deleteKey}`

	const userEmail = await admin
		.auth()
		.getUser(context.auth.uid)
		.then(u => u.email)

	await sendEmail(userEmail, 'delete_club', `Delete club ${clubName}`, {
		clubName,
		club,
		deleteKey
	})
}

/**
 *
 * @param {*} param0
 * @param {CallableContext} context
 */
const deleteClubFromKey = async ({ club, deleteKey }, context) => {
	const clubUrlHash = shajs('sha256')
		.update(club)
		.digest('hex')

	const hashDoc = await db()
		.collection('passHashes')
		.doc(clubUrlHash)
		.get()

	const { deleteKey: fetchedDeleteKey, deleteKeyExpiration } = hashDoc.data()

	if (deleteKey !== fetchedDeleteKey) throw new Error('incorrect delete key')

	if (moment().valueOf() > deleteKeyExpiration)
		throw new Error('expired delete key')

	await deleteClub(club)
}

/**
 * @typedef MemberReturn
 *
 * This is the standardized object returned from
 * - `createMember()`
 * - `updateMember()`
 *
 * @property {success} boolean
 * @property {id} string
 * @property {email=} string
 * @property {card=} string
 * @property {club} string
 * @property {error=} string
 */

/**
 * @function createMember
 * @param {object} data
 * @param {string} data.email
 * @param {string} data.card
 * @param {string} data.club
 * @param {CallableContext} context
 *
 * @returns {MemberReturn}
 */
const createMember = async (data, context) => {
	const { email, card, club } = data
	const id = memberIdBuilder()
	const editUrl = editUrlBuilder()
	const upd = {}

	upd[`memberList.${id}`] = sortMap(email, card)

	await ownerTransaction(data, context, (t, clubDoc) =>
		t
			.set(clubDoc.ref.collection('members').doc(id), {
				email: email && typeof email === 'string' ? String(email) : '',
				card: processCardString(card ? String(card) : vcfFiller.blank),
				owner: clubDoc.data().owner,
				editUrl
			})
			.update(clubDoc.ref, upd)
	)

	logger.log(`member ${id} created in club ${club}`)
	return {
		success: true,
		id,
		email,
		card,
		club
	}
}

/**
 * @function createMembersFromEmails
 *
 * @param {object} data
 * @param {{email: string, card: string}[]} data.members
 * @param {CallableContext} context
 */
const createBulkMembers = async ({ club, members }, context) => {
	await ownerTransaction({ club }, context, (t, clubDoc) => {
		let transaction = t
		for (const [i, { email, card }] of members.entries()) {
			const id = memberIdBuilder()
			const editUrl = editUrlBuilder()
			let cardString = card

			try {
				if (card) new VCard(JSON.parse(card))
				else cardString = vcfFiller.blank
			} catch (err) {
				throw new Error(`Error in member at index ${i}: ${err.message}`)
			}

			transaction = transaction
				.set(clubDoc.ref.collection('members').doc(id), {
					email: String(email),
					card: cardString,
					owner: clubDoc.data().owner,
					editUrl
				})
				.update(clubDoc.ref, {
					[`memberList.${id}`]: sortMap(email, cardString)
				})
		}
		return transaction
	})

	return {
		success: true,
		length: members.length
	}
}

/**
 * @function deleteMember
 * @param {object} data
 * @param {string} data.id
 * @param {string} data.club
 * @param {CallableContext} context
 * @returns {{ success: boolean, id?: string, error?: string}}
 */
const deleteMember = async (data, context) => {
	const { id, club } = data
	const upd = {
		[`memberList.${id}`]: FieldValue.delete()
	}
	await ownerTransaction(data, context, (t, clubDoc) =>
		t
			// delete the record
			.delete(clubDoc.ref.collection('members').doc(id))
			// delete the field from the club sort
			.update(clubDoc.ref, upd)
	)

	logger.log(`member ${id} deleted in club ${club}`)
	return {
		success: true,
		id
	}
}

/**
 * @function updateMember
 * @param {object} data
 * @param {string} data.id
 * @param {string} data.club
 * @param {string=} data.email
 * @param {string=} data.card
 * @param {string} context
 *
 * @returns {MemberReturn}
 */
const updateMember = async (data, context) => {
	const { id, email, card, club } = data

	const update = {}
	if (email !== undefined) update.email = email
	if (card) update.card = processCardString(card)
	await ownerTransaction(data, context, (t, clubDoc) => {
		t.update(clubDoc.ref.collection('members').doc(id), update).update(
			clubDoc.ref,
			{
				[`memberList.${id}`]: sortMap(email, card)
			}
		)
	})
	logger.log(`member ${id} updated in club ${club}`)
	return {
		success: true,
		id,
		card,
		email,
		club
	}
}

const uploadMemberImageOwner = async (
	{ club, member, imageBase64 },
	context
) => {
	if (!(await ownsClubId(club, context)))
		throw new Error(`does not own club ${club}`)

	console.log(imageBase64.substring(0, 40), '...')

	const res = (await uploadMemberImage(imageBase64, { club, member }))[0]

	console.log(res.name)

	return {
		fileName: res.name
	}
}

const deleteMemberImageOwner = async ({ club, member }, context) => {
	if (!(await ownsClubId(club, context)))
		throw new Error(`does not own club ${club}`)

	await deleteMemberImage({ club, member })

	return {
		success: true
	}
}

const uploadClubBanner = async ({ club, imageBase64 }, context) => {
	const clubDoc = await db()
		.collection('clubs')
		.doc(club)
		.get()

	if (!clubDoc.exists) return new Error(`club ${club} does not exist`)

	const res = (
		await uploadImage(
			imageBase64,
			[clubDoc.data().owner, 'clubs', clubDoc.id, 'banner', 'banner.jpg'].join(
				'/'
			),
			1000,
			400
		)
	)[0]

	console.log(res.name)
	return { fileName: res.name }
}

const signupsDisabled = async (i, context) => {
	return functions.config().website.disable_signup
}

module.exports = {
	ping: functions.https.onCall(ping),
	myCustomerInfo: functions.https.onCall(myCustomerInfo),
	payForClub: functions.https.onCall(payForClub),
	updateClubPayment: functions.https.onCall(updateClubPayment),
	// sendClubInvoice: functions.https.onCall(sendClubInvoice),
	payForExistingClub: functions.https.onCall(payForExistingClub),
	changeClubPassword: functions.https.onCall(changeClubPassword),
	changeClubName: functions.https.onCall(changeClubName),
	sendMassClubEmail: functions
		.runWith({ timeoutSeconds: 100, memory: '2GB' })
		.https.onCall(sendMassClubEmail),
	requestDeleteEmail: functions.https.onCall(requestDeleteEmail),
	deleteClubFromKey: functions
		.runWith({ timeoutSeconds: 300, memory: '1GB' })
		.https.onCall(deleteClubFromKey),
	createMember: functions.https.onCall(createMember),
	createBulkMembers: functions.https.onCall(createBulkMembers),
	deleteMember: functions.https.onCall(deleteMember),
	updateMember: functions.https.onCall(updateMember),
	uploadMemberImage: functions
		.runWith({ memory: '2GB' })
		.https.onCall(uploadMemberImageOwner),
	deleteMemberImage: functions.https.onCall(deleteMemberImageOwner),
	uploadClubBanner: functions
		.runWith({ memory: '2GB' })
		.https.onCall(uploadClubBanner),
	signupsDisabled: functions.https.onCall(signupsDisabled)
}
