// https://claritydev.net/blog/testing-firestore-locally-with-firebase-emulators/

const functions = require('firebase-functions')
const admin = require('firebase-admin')

const tools = require('firebase-tools')

const Stripe = require('stripe')

const stripe = new Stripe(functions.config().stripe.key)

/** @type {FirebaseFirestore.Firestore} */
let db

/** @type {import('@google-cloud/storage').Bucket} */
let bucket

if (process.env.NODE_ENV !== 'test') {
	db = admin.firestore()
	bucket = admin.storage().bucket(process.env.FIREBASE_CONFIG.storageBucket)
}

exports.db = () => {
	return db
}

exports.setDb = _db => {
	db = _db
}

exports.bucket = () => {
	return bucket
}

exports.setBucket = _bucket => {
	bucket = _bucket
}

exports.stripe = () => stripe
exports.clubProductId = functions.config().stripe.club_product_id

exports.clubPlanId = functions.config().stripe.club_plan_id
