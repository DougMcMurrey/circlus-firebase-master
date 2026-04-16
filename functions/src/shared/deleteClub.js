const shajs = require('sha.js')
const firebase_tools = require('firebase-tools')
const admin = require('firebase-admin')
const functions = require('firebase-functions')

/**
 * Deletes a club. steps:
 * 1. set club status to deleted
 * 2. delete passHashes record
 * 3. delete members collection
 * 4. delete storage folder
 * 5. delete club record
 * @param {FirebaseFirestore.Firestore} db
 * @param {import('@google-cloud/storage').Bucket} bucket
 * @param {import('stripe')} stripe
 * @param {object} config
 * @param {string} clubId
 */
const deleteClub = async (db, bucket, stripe, config, clubId) => {
	const clubDoc = await db
		.collection('clubs')
		.doc(clubId)
		.get()

	const { owner, name: clubName, stripe: stripeSubscriptionId } = clubDoc.data()

	console.log(`deleting club ${clubName} (${clubId})...`)

	await db
		.collection('clubs')
		.doc(clubId)
		.update({
			status: 'deleted'
		})

	const clubUrlHash = shajs('sha256')
		.update(clubId)
		.digest('hex')

	await Promise.all([
		stripe.subscriptions
			.del(stripeSubscriptionId)
			.then(res => console.log(`cancelled ${clubName} Stripe subscription`)),
		db
			.collection('passHashes')
			.doc(clubUrlHash)
			.delete()
			.then(() => console.log(`passHashes doc for ${clubName} deleted`)),
		firebase_tools.firestore
			.delete(`clubs/${clubId}`, {
				project: admin.instanceId().app.options.projectId, //process.env.GCP_PROJECT,
				recursive: true,
				yes: true,
				// token: functions.config().fb.key
				token: config.fb.key
			})
			.then(() => console.log(`deleted ${clubName} doc and subcollections`))
			.then(async () => {
				let deletionUpdate = {}
				deletionUpdate[
					`ownedClubs.${clubId}`
				] = admin.firestore.FieldValue.delete()

				await db
					.collection('users')
					.doc(owner)
					.update(deletionUpdate)
			}),
		// db
		// 	.collection('clubs')
		// 	.doc(clubId)
		// 	.delete()
		// 	.then(() => console.log(`main doc for ${clubName} deleted`)),
		bucket
			.deleteFiles({
				prefix: `${owner}/clubs/${clubId}/`
			})
			.then(() => console.log(`storage for ${clubName} deleted`))
	])
		.catch(error => console.error(error))
		.then(() => console.log(`Club ${clubName} (${clubId}) deleted.`))
}

module.exports = deleteClub
