const { createClub } = require('../shared/ClubManager')
const { db, stripe } = require('../../get-db')

// this is the webhook for a completed Checkout session.
// used when a user enters payment information to create a new club.

// this is also the webhook that fires for a payment update session.
// that does not happen on customer.subscription.updated.

/**
 *
 * @param {import('stripe').checkouts.sessions.ICheckoutSession} session
 */
const handleSubscriptionCreated = async session => {
	const sub = await stripe().subscriptions.retrieve(session.subscription)
	const customer = await stripe().customers.retrieve(session.customer)
	// if customer has no default payment method, set one.
	if (!customer.invoice_settings.default_payment_method) {
		await stripe().customers.update(customer.id, {
			invoice_settings: {
				default_payment_method: sub.default_payment_method
			}
		})
	}

	const { name, owner, clubId } = sub.metadata

	const clubDoc = await db()
		.collection('clubs')
		.doc(clubId)
		.get()

	if (!clubDoc.exists) {
		return await createClub(clubId, name, owner, sub)
	} else {
		if (clubDoc.data().owner != owner) {
			const res = `${owner} tried to pay for existing club ${name} (${clubId}) they do not own. (owned by ${
				clubDoc.data().owner
			})`

			console.log(res)
			return res
		}

		await clubDoc.ref.update({
			stripe: sub.id,
			status: sub.status
		})

		// attempt to pay the latest invoice of the club.
		if (
			sub.status === 'incomplete' ||
			sub.status === 'incomplete_expired' ||
			sub.status === 'past_due'
		) {
			await stripe().invoices.pay(sub.latest_invoice, {
				payment_method: sub.default_payment_method
			})
			return `paid latest invoice for existing club ${name} (${clubId}), using payment method ${sub.default_payment_method}`
		}

		return `checkout for existing club ${name} (${clubId}), subscription ${sub.id}`
	}
}

/**
 *
 * @param {import('stripe').checkouts.sessions.ICheckoutSession} session
 */
const handleSetupIntent = async session => {
	const intent = await stripe().setupIntents.retrieve(session.setup_intent)

	const { customer_id, subscription_id } = intent.metadata
	const payment_method = intent.payment_method

	console.log(
		'attaching payment method',
		payment_method,
		'to customer',
		customer_id
	)
	await stripe().paymentMethods.attach(payment_method, {
		customer: customer_id
	})

	console.log(
		'attaching payment method',
		payment_method,
		'to subscription',
		subscription_id
	)
	await stripe().subscriptions.update(subscription_id, {
		default_payment_method: payment_method
	})
}

/**
 * @param {import('stripe').events.IEvent} e
 */
module.exports = async e => {
	/** @type {import('stripe').checkouts.sessions.ICheckoutSession} */
	const session = e.data.object

	// new subscription handler
	if (session.subscription) return await handleSubscriptionCreated(session)

	// update subscription handler
	if (session.setup_intent) return await handleSetupIntent(session)

	const err =
		`No 'subscription' or 'setup_intent' object in checkout for ` +
		`customer ${session.customer}. Nothing will be retried. (event: ${e.id})`
	console.error(err)
	return err
}
