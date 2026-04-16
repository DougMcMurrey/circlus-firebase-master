const functions = require('firebase-functions')
const admin = require('firebase-admin')
const app = require('express')()

const bodyParser = require('body-parser')
const cors = require('cors')

const Stripe = require('stripe')
const cfg = functions.config()

const eventsLog = require('./stripeEventsLog')

if (!cfg.stripe) console.error('no stripe config keys')

if (!cfg.stripe.key) console.error('config stripe.key missing')

if (!cfg.stripe.endpoint_key)
	console.error('config stripe.endpoint_key missing')

const stripe = new Stripe(cfg.stripe.key)

const isDevelopment = functions.config().env.env === 'development'

// disable CORS on development server.
app.use(cors({ origin: !isDevelopment, credentials: !isDevelopment }))

// app.use(bodyParser.raw({ type: 'application/json' }))
app.use(bodyParser.json())

app.post('/', async (req, res) => {
	const stripeSignature = req.headers['stripe-signature']

	/** @type {import('stripe').events.IEvent} */
	const event = req.body

	try {
		// TODO verify stripe webhook signatures
		// const event = stripe.webhooks.constructEvent(
		// 	req.body,
		// 	stripeSignature,
		// 	cfg.stripe.endpoint_key
		// )

		/** @type {{[event: import('stripe').events.EventType]: *}} */
		const eventHandlers = {
			// 'customer.subscription.created': require('./customerSubscriptionCreated'),
			'customer.subscription.updated': require('./customerSubscriptionUpdated'),
			'customer.subscription.deleted': require('./customerSubscriptionUpdated'),
			'checkout.session.completed': require('./checkoutSessionCompleted')
		}

		if (eventHandlers[event.type]) {
			console.log(`stripe event: ${event.type} (${event.id})`)
			const alreadyProcessed = await eventsLog.eventInLog(event.id)
			if (alreadyProcessed) {
				console.log(
					`duplicate event ${event.id} already processed, cancelling.`
				)
				return res.status(208).send()
			}

			// perform event handler and get its return result
			const eventResult = await eventHandlers[event.type](event)

			// only pushes event if the event handler does not throw.
			await eventsLog.pushStripeEvent(event.id)
			return res.status(200).json(eventResult)
		} else {
			const err = `No event handler written for ${event.type} (${event.id})`
			console.error(err)
			return res.status(204).send(err)
		}
	} catch (err) {
		console.error(
			`Error in webhook event ${event.type} (${event.id}), Stripe will retry...`
		)
		console.error(err)
		res.status(400).send(`Webhook error: ${err.message}`)
		throw err
	}
})

module.exports = functions.https.onRequest(app)
