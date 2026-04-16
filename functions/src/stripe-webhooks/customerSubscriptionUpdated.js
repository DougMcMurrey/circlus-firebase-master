const { db } = require('../../get-db')
const logger = require('../../config/logger')

/**
 * @param {import('stripe').events.IEvent} e
 */
module.exports = async e => {
	/** @type {import('stripe').subscriptions.ISubscription} */
	const sub = e.data.object

	if (!sub.metadata)
		return `Missing metadata for subscription ${sub.id}: ${JSON.stringify(
			sub.metadata
		)}`

	const clubDoc = await db()
		.collection('clubs')
		.doc(sub.metadata.clubId)
		.get()

	// if (!clubDoc.exists) {
	// 	throw new Error(
	// 		`club ${sub.metadata.clubId} does not exist, something went wrong in event customer.subscription.updated`
	// 	)
	// }

	if (!clubDoc.exists) {
		return `Club ${sub.metadata.clubId} does not exist, could not update status to ${sub.status}`
	}

	await db()
		.collection('clubs')
		.doc(sub.metadata.clubId)
		.update({
			status: sub.status
		})

	logger.log(
		`updated club ${sub.metadata.name} (${sub.metadata.clubId}) status to ${sub.status}`
	)

	// switch (sub.status) {
	// 	case 'active':
	// 		return

	// 	case 'canceled':
	// 		return

	// 	case 'incomplete':
	// 		return

	// 	case 'incomplete_expired':
	// 		return

	// 	case 'past_due':
	// 		return

	// 	case 'trialing':
	// 		return

	// 	case 'unpaid':
	// 		return
	// }
}
