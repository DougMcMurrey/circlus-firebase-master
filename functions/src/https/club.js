const functions = require('firebase-functions')
const admin = require('firebase-admin')
const moment = require('moment')

const Stripe = require('stripe')
const stripe = new Stripe(functions.config().stripe.key)

module.exports = {
	getClubSubscription: functions.https.onCall(async ({ clubId }, context) => {
		const club = await admin
			.firestore()
			.collection('clubs')
			.doc(clubId)
			.get()
			.then(d => d.data())

		if (club.owner != context.auth.uid)
			return new Error('You do not own this club.')

		const subscription = await stripe.subscriptions.retrieve(club.stripe, {
			expand: ['latest_invoice']
		})

		return subscription
	})
}
