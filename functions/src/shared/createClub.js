const shajs = require('sha.js')
const moment = require('moment')
const validateClubName = require('./validateClubName')
const logger = require('../../config/logger')

/**
 *
 * a version of createClub that takes a firestore db inststance.
 * Used in some of my CLI scripts.
 * Also used in ClubManager, in a version without the db argument.
 * (that one is the one used in all firebase functions)
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} clubId
 * @param {string} name
 * @param {string} ownerUid
 * @param {import('stripe').subscriptions.ISubscription} subscription
 */
const createClub = async (db, clubId, name, ownerUid, subscription) => {
	const validName = validateClubName(name)
	// the ID is generated in the https event payForClub.
	const id = clubId

	if (!id || id.length != 10) {
		throw new Error('invalid id: ' + id)
	}

	const clubUrlHash = shajs('sha256')
		.update(id)
		.digest('hex')

	const upd = {}
	upd[`ownedClubs.${id}`] = name

	const dateCreated = moment().valueOf()

	await db
		.batch()
		.set(db.collection('clubs').doc(id), {
			owner: ownerUid,
			name: validName,
			passwordEnabled: false,
			passwordSet: false,
			memberList: {},
			status: subscription.status,
			stripe: subscription.id,
			dateCreated
		})
		.set(db.collection('passHashes').doc(clubUrlHash), {
			passHash: ''
		})
		.update(db.collection('users').doc(ownerUid), upd)
		.commit()

	logger.info(`New club created: "${validName}" (${id})`)

	return { id, name }
}

module.exports = createClub
