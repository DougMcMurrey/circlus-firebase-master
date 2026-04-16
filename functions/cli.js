require('dotenv-flow').config({
	// node_env: 'development'
})
process.env.FIREBASE_CONFIG = 'zzz'
process.env.GCLOUD_PROJECT = 'zzz'
const serviceAccount = require(`./admin-key.${process.env.NODE_ENV ||
	'development'}.json`)
const createClub = require('./src/shared/createClub')
const deleteClub = require('./src/shared/deleteClub')

const Vorpal = require('vorpal')
const moment = require('moment')
const exec = require('child-process-promise').exec
const crs = require('crypto-random-string')
const chalk = require('chalk')
const Papa = require('papaparse')
const faker = require('faker')
const { table } = require('table')

const admin = require('firebase-admin')
const Stripe = require('stripe')

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount)
})

const stripe = new Stripe(process.env.STRIPE_KEY)
const vorpal = new Vorpal()

// vorpal
// 	.command('interactive', 'enter interactive prompt')
// 	.alias('i')
// 	.action(args => {
// 		vorpal.delimiter(`${serviceAccount.project_id} > `).show()
// 	})

/**
 * 
 * @param {{
		user: string,
		name: string,
		options: {
			trial: boolean,
			method: string
		}
	}} args 
 */
const createFxn = async args => {
	console.log('getting functions config...')
	const config = await exec('firebase functions:config:get').then(res =>
		JSON.parse(res.stdout)
	)

	console.log('fetching user data...')
	/** @type {{ownedClubs: {[nmae: string]: string}, stripeCustomerId: string}} */
	const user = (
		await admin
			.firestore()
			.collection('users')
			.doc(args.user)
			.get()
	).data()

	const clubId = crs({ length: 10 })

	console.log('creating subscription...')
	const subscription = await stripe.subscriptions.create({
		customer: user.stripeCustomerId,
		items: [
			{
				plan: config.stripe.club_plan_id
			}
		],
		metadata: {
			name: args.name,
			owner: args.user,
			clubId
		},
		default_payment_method: args.options.method,
		trial_end: args.options.trial
			? moment()
					.add(1, 'minute')
					.unix()
			: undefined
	})

	console.log('creating club...')
	try {
		const clubRes = await createClub(
			admin.firestore(),
			clubId,
			args.name,
			args.user,
			subscription
		)
		console.log(chalk.green('Club created!'))
		console.log(clubRes)
		console.log(
			'subscription:',
			`https://dashboard.stripe.com/test/subscriptions/${subscription.id}`
		)
		process.exit()
	} catch (err) {
		console.log('error creating club; cancelling subscription', subscription.id)
		await stripe.subscriptions.del(subscription.id)
		throw new Error(err)
	}
}

vorpal
	.command(
		'create <user> <name>',
		'creates a club for user <user> with name <name>'
	)
	.option('-m, --method <method>', 'Payment method')
	.option('-t, --trial', 'Use a 2-minute trial')
	.action(createFxn)

/**
 * @param {{ clubId: string}} args
 */
const deleteFxn = async args => {
	console.log('getting functions config...')
	const config = await exec('firebase functions:config:get').then(res =>
		JSON.parse(res.stdout)
	)
	await deleteClub(
		admin.firestore(),
		admin.storage().bucket(`${serviceAccount.project_id}.appspot.com`),
		stripe,
		config,
		args.clubId
	)
}

vorpal.command('delete <clubId>', 'deletes a club.').action(deleteFxn)

vorpal.command('list', 'list all clubs').action(async args => {
	const clubs = await admin
		.firestore()
		.collection('clubs')
		.get()
		.then(res =>
			res.docs
				.map(doc => doc.data())
				.map(d => ({
					name: d.name,
					owner: d.owner,
					status: d.status,
					stripe: d.stripe
				}))
		)

	vorpal.log(
		table([Object.keys(clubs[0]), ...clubs.map(c => Object.values(c))])
	)
})

vorpal
	.command('csv [rows]', 'Generate a CSV file of random data. (defaults to 20)')
	.action(args => {
		const rows = args.rows || 20
		let vals = []

		const chance = (gen, chance) => {
			if (Math.random() * 100 > chance) return null
			return gen
		}

		for (i = 0; i < rows; i++) {
			vals.push({
				FIRST: chance(faker.name.firstName(), 95),
				LAST: chance(faker.name.lastName(), 95),
				MIDDLE: chance(faker.name.firstName(), 25),
				ASSOCIATED_EMAIL: chance(faker.internet.exampleEmail(), 90),
				EMAIL: chance(faker.internet.exampleEmail(), 75),
				PHONE: chance(faker.phone.phoneNumber(), 60),
				ADDRESS: chance(faker.address.streetAddress(), 40),
				TITLE: chance(faker.name.title(), 20),
				NICKNAME: chance(faker.name.firstName(), 20),
				URL: chance(faker.internet.url(), 10),
				DEPARTMENT: chance(faker.commerce.department(), 10),
				NOTE: chance(faker.lorem.sentences(), 10),
				GENDER: chance(faker.random.arrayElement(['M', 'F', 'O', 'U']), 10),
				PREFIX: chance(faker.name.prefix(), 20),
				SUFFIX: chance(faker.name.suffix(), 20)
			})
		}

		const res = Papa.unparse(vals, {
			newline: '\n'
		})

		vorpal.log('\n')
		vorpal.log(res)
		vorpal.log('\n')
		return 0
	})

vorpal.delimiter(`${serviceAccount.project_id} > `).show()
// vorpal.parse(process.argv)
