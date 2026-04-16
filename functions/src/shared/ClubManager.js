const functions = require('firebase-functions')
const admin = require('firebase-admin')
const firebase_tools = require('firebase-tools')
const shajs = require('sha.js')
const crs = require('crypto-random-string')
const logger = require('../../config/logger')
const moment = require('moment')
const base64Img = require('base64-img')
const { spawn } = require('child-process-promise')
const createClubFunction = require('./createClub')
const deleteClubFunction = require('./deleteClub')

const { db, bucket } = require('../../get-db')

const Stripe = require('stripe')
const stripe = new Stripe(functions.config().stripe.key)

/** @param {string} _name @returns {string} */
const validateClubName = require('./validateClubName')

const validateClubPass = pass => {
	if (!pass) throw new Error('Must provide password for club')
	if (typeof pass !== 'string') throw new Error('Password must be a string')
	return pass
}

/**
 *
 * @param {string} clubId
 */
const getClubDoc = async clubId => {
	const club = await db()
		.collection('clubs')
		.doc(clubName)
		.get()
	return club
}

/**
 *
 * @param {*} clubId
 * @param {*} name
 * @param {*} ownerUid
 * @param {import('stripe').subscriptions.ISubscription} subscription
 */
const createClub = (clubId, name, ownerUid, subscription) =>
	createClubFunction(db(), clubId, name, ownerUid, subscription)

/**
 * Deletes a club. steps:
 * 1. set club status to deleted
 * 2. delete passHashes record
 * 3. delete members collection
 * 4. delete storage folder
 * 5. delete club record
 * @param {string} clubId
 */
const deleteClub = async clubId =>
	deleteClubFunction(db(), bucket(), stripe, functions.config(), clubId)

/**
 * Adds 1 month to a unix timestamp date.
 * @param {number} date
 */
const clubNextSubscription = date => {
	return moment(date)
		.add(1, 'month')
		.valueOf()
}

const clubPaymentStatusOkay = status =>
	['active', 'trialing', 'past_due'].includes(status)

const uploadClubBannerImage = async (club, imageBase64) => {
	const clubDoc = await getClubDoc(club)
	if (!clubDoc.exists) throw new Error(`club ${club} does not exist`)

	const bucketPath = [
		clubDoc.data().owner,
		'clubs',
		clubDoc.id,
		'banner',
		'banner.jpg'
	].join('/')

	const imageType = imageData.substr(5).split(';')[0] // image/png

	const tmpFileName = crs({ length: 10 })
	const tmpFilePath = `/tmp/${tmpFileName}`
	const tmpConvertedFilePath = `/tmp/${tmpFileName}.jpg`

	console.log('donwloading to tmp directory', tmpFilePath)

	const resPath = base64Img.imgSync(imageData, '/tmp/', `${tmpFileName}`)

	const dim = 1000 + 'x' + 400

	console.log('converting', resPath, 'to', tmpConvertedFilePath)

	try {
		const convert = await spawn('convert', [
			resPath,
			`-thumbnail`,
			`${dim}^`,
			`-gravity`,
			`center`,
			`-extent`,
			`${dim}`,
			tmpConvertedFilePath
		])
		console.log(convert.stdout)
	} catch (err) {
		console.error('imageMagick error in uploadClubBannerImage')
		console.error(err)
		throw new Error(err)
	}
	console.log('uploading to bucket at', bucketPath)
	return await bucket().upload(tmpConvertedFilePath, {
		destination: bucketPath
	})
}

module.exports = {
	clubDoc: getClubDoc,
	validateClubName,
	validateClubPass,
	createClub,
	deleteClub,
	clubNextSubscription,
	clubPaymentStatusOkay
}
