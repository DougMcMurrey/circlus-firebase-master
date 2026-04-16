const functions = require('firebase-functions')
const getStripeId = require('../shared/getStripeId')

const Stripe = require('stripe')
const stripe = new Stripe(functions.config().stripe.key)

module.exports = {
	updatePaymentMethod: functions.https.onCall(
		async ({ action, paymentId }, context) => {
			let stripeId = ''

			const actions = {
				delete: async () => {},
				update: async () => {}
			}

			if (!actions[action])
				return new Error(
					`invalid action ${action}, must be one of: ` +
						Object.keys(actions).join(', ')
				)

			stripeId = await getStripeId(context.auth.uid)

			await actions[action]()
		}
	)
}
