const { db, stripe } = require('../../get-db')

// https://stripe.com/docs/webhooks/best-practices#duplicate-events

const MAX_EVENTS_LOG_LENGTH = 50

/**
 *
 * @returns {Promise<string[]>}
 */
const stripeEventsLog = async () => {
	const eventsLogRef = db()
		.collection('misc')
		.doc('stripe')

	const eventsLog = await eventsLogRef.get()

	if (!eventsLog.exists) {
		await eventsLogRef.set({
			events: []
		})
		return []
	}

	return eventsLog.data().events
}

/**
 *
 * @param {string[]} log
 */
const setStripeEventsLog = async log => {
	const eventsLogRef = db()
		.collection('misc')
		.doc('stripe')

	eventsLogRef.set(
		{
			events: log
		},
		{
			merge: true
		}
	)

	return log
}

/**
 *
 * @param {string} event
 */
const pushStripeEvent = async event => {
	let log = await stripeEventsLog()
	log.push(event)
	if (log.length > MAX_EVENTS_LOG_LENGTH) log.shift()

	await setStripeEventsLog(log)

	return log
}

const eventInLog = async event => {
	let log = await stripeEventsLog()
	return log.includes(event)
}

module.exports = {
	stripeEventsLog,
	setStripeEventsLog,
	pushStripeEvent,
	eventInLog
}
