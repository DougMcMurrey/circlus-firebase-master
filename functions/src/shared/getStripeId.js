const { db } = require('../../get-db')
/**
 * Query firestore to get stripe customer ID from a given user UID.
 * @param {string} uid
 * @returns {Promise<string>}
 */
module.exports = async uid => {
	const userDoc = await db()
		.collection('users')
		.doc(uid)
		.get()

	if (!userDoc.exists) throw new Error(`User doc ${uid} does not exist`)

	return userDoc.data().stripeCustomerId
}
