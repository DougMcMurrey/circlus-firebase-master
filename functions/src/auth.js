const functions = require('firebase-functions')
const admin = require('firebase-admin')

const { db, stripe } = require('../get-db')

const { deleteClub } = require('./shared/ClubManager')

const logger = require('../config/logger')

exports.onUserCreate = functions.auth.user().onCreate(async user => {
	const DISABLE_SIGNUP = functions.config().website.disable_signup

	if (DISABLE_SIGNUP) {
		console.log(
			'Tried to create user',
			user.email,
			'while signups were disabled. Disabling instead...'
		)
		await admin.auth().updateUser(user.uid, {
			disabled: true
		})

		console.log('Disabled new user', user.email)
	}

	const customer = await stripe().customers.create({
		email: user.email,
		metadata: {
			uid: user.uid
		}
	})

	await db()
		.collection('users')
		.doc(user.uid)
		.set({
			ownedClubs: {},
			stripeCustomerId: customer.id
		})

	logger.log(`user created (${user.uid}, stripe: ${customer.id})`)
})

/**
 * An extremely dangerous function. When a Firebase user is deleted, ALL
 * their associated data, clubs, stripe subscriptions and customer data,
 * are also deleted. You should not delete firebase users without good reason!
 */
exports.onUserDelete = functions.auth.user().onDelete(async user => {
	const u = `${user.email} (${user.uid})`

	console.log(`user ${u} has been deleted. Deleting associated data...`)

	const userDoc = await db()
		.collection('users')
		.doc(user.uid)
		.get()

	const { stripeCustomerId, ownedClubs } = userDoc.data()

	try {
		console.log(`Deleting ${u}: deleting all clubs...`)
		await Promise.all(Object.keys(ownedClubs).map(clubId => deleteClub(clubId)))
	} catch (err) {
		console.error(err)
	}

	try {
		console.log(`Deleting ${u}: deleting user record...`)
		await db()
			.collection('users')
			.doc(user.uid)
			.delete()
	} catch (err) {
		console.error(err)
	}

	try {
		console.log(`Deleting ${u}: deleting stripe customer...`)

		await stripe().customers.del(stripeCustomerId)
	} catch (err) {
		console.error(err)
	}

	console.log(`${u} deleted.`)
})
