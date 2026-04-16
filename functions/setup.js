require('dotenv-flow').config()

const tools = require('firebase-tools')

const Stripe = require('stripe')

const stripe = new Stripe(process.env.STRIPE_KEY)

console.log('NODE_ENV:', process.env.NODE_ENV)
/**
 * Creates the club product and plan.
 * This should only be run ONCE for the entire service.
 */
const createClubProductAndPlan = async () => {
	console.log(`Creating club product and plan... This should only happen once.`)

	// const { club_product_id, club_plan_id } = functions.config().stripe

	// if (club_product_id) {
	// 	throw new Error(
	// 		`config option stripe.club_product_id already set (${club_product_id}), not creating a new one.`
	// 	)
	// }

	// if (club_plan_id) {
	// 	throw new Error(
	// 		`config option stripe.club_plan_id already set (${club_plan_id}), not creating a new one.`
	// 	)
	// }

	const product = await stripe.products.create({
		name: 'Circlus Club',
		type: 'service',
		description: 'A club in Circlus',
		attributes: ['club_name', 'club_id']
	})
	const plan = await stripe.plans.create({
		currency: 'usd',
		interval: 'month',
		product: product.id,
		nickname: 'Circlus Club Monthly Subscription',
		amount: 10 * 100
	})

	await tools.functions.config.set(
		[`stripe.club_product_id=${product.id}`, `stripe.club_plan_id=${plan.id}`],
		{ project: process.env.PROJECT_ID }
	)

	console.log(`Created new product (${product.id}) and plan (${plan.id})`)
	return {
		product,
		plan
	}
}

const setup = async () => {
	console.log(`Running setup.js for ${process.env.PROJECT_ID}...`)

	console.log('Setting all firebase function config keys...')

	const keys = {
		'website.url': process.env.WEBSITE_URL,
		'website.disable_signup': process.env.DISABLE_SIGNUP,
		'env.env': process.env.ENV,
		'jwt.key': process.env.JWT_KEY,
		'stripe.key': process.env.STRIPE_KEY,
		'stripe.endpoint_key': process.env.STRIPE_ENDPOINT_KEY,
		'fb.key': process.env.FIREBASE_KEY,
		'sendgrid.key': process.env.SENDGRID_KEY
	}

	for (const k in keys)
		if (!keys[k]) throw new Error(`${k} needs to be defined`)

	await tools.functions.config.set(
		Object.entries(keys).map(([k, v]) => `${k}=${v}`),
		{
			project: process.env.PROJECT_ID
		}
	)

	console.log('Setting stripe products and plans...')

	const club_plan_id = await tools.functions.config.get('stripe.club_plan_id', {
		project: process.env.PROJECT_ID
	})

	const club_product_id = await tools.functions.config.get(
		'stripe.club_product_id',
		{
			project: process.env.PROJECT_ID
		}
	)

	if (!club_plan_id && !club_product_id) {
		await createClubProductAndPlan()
	} else {
		console.log(
			`club_plan_id (${club_plan_id}) or club_product_id (${club_product_id}) already exist, skipping...`
		)
	}

	console.log(
		'Setup done. Remember to run "firebase deploy" to reflect config changes.'
	)
}

setup()
