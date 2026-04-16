const functions = require('firebase-functions')
const admin = require('firebase-admin')

const util = require('util')
const express = require('express')
const bearerToken = require('express-bearer-token')
const argon2 = require('argon2')
const shajs = require('sha.js')
const cors = require('cors')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const ms = require('ms')
const jwt = require('jsonwebtoken')
const crs = require('crypto-random-string')
const jwtSecret = functions.config().jwt
	? functions.config().jwt.key
	: 'didnt load jwt secret' // TODO!!!
//const jwtSecret = "???";
const jwtVerify = util.promisify(jwt.verify)

const { spawn } = require('child-process-promise')
const fs = require('fs')

const vcfer = require('vcfer')
const VCard = vcfer.default

const logger = require('../config/logger')
const { db } = require('../get-db')
const { sortMap, isBlankMemberListItem } = require('./shared')
const { clubPaymentStatusOkay } = require('./shared/ClubManager')
const {
	uploadMemberImage,
	deleteMemberImage
} = require('./shared/MemberImageManager')

const { processCard } = require('./shared/CardManager')

const app = express()

let corsOrigin = functions.config().website.url + ''

// remove trailing slash
if (corsOrigin[corsOrigin.length - 1] === '/') {
	corsOrigin = corsOrigin.substring(0, corsOrigin.length - 1)
}

// TODO disable CORS on development server.
const corsOptions = cors(
	functions.config().env.env === 'production'
		? {
				origin: [corsOrigin],
				credentials: true
				// allowedHeaders: ['Content-Type', 'Authorization']
		  }
		: {
				origin: [
					/http:\/\/[0-9a-z-A-Z]+\.ngrok\.io/, // for mobile testing.
					'http://localhost:3000'
				],
				credentials: true
				// allowedHeaders: ['Content-Type', 'Authorization']
		  }
)

// [
// 	/http:\/\/[0-9a-z-A-Z]+\.ngrok\.io/, // for mobile testing.
// 	'http://localhost:3000',
// 	''
// ]

// this is not 'app options' but a route for 'OPTIONS' mode requests
// app.options('*', corsOptions)
app.use(corsOptions)

const logRequests = (req, res, next) => {
	console.log('> ' + req.path)
	console.log('> ' + JSON.stringify(req.body, null, 2))
	next()
}
app.use(logRequests)
app.use(cookieParser())

// commented out. avatar upload path does not parse to json,
// it parses to raw. apply this as a middleware to every path, instead.
// app.use(bodyParser.json())
app.use(bearerToken())

const MSG_MEMBER_NOT_FOUND = 'Member not found.'
const memberForEditUrl = (club, editUrl) => {
	return db()
		.collection('clubs')
		.doc(club)
		.collection('members')
		.where('editUrl', '==', editUrl)
		.get()
		.then(res => {
			if (res.empty) return null
			return res.docs[0]
		})
}

const ACCESS_TOKEN_EXPIRES_IN = '15 minutes' // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = '7 days' // 7 days

const createTokens = async (club, isEditor, editUrl) => {
	if (isEditor && editUrl) {
		const memberDoc = await memberForEditUrl(club, editUrl)
		if (!memberDoc) throw new Error('Member not found')
	}

	const newToken = {
		club,
		isEditor,
		editUrl
	}
	const accessToken = jwt.sign(newToken, jwtSecret, {
		expiresIn: ACCESS_TOKEN_EXPIRES_IN
	})

	const refreshToken = jwt.sign(newToken, jwtSecret, {
		expiresIn: REFRESH_TOKEN_EXPIRES_IN
	})

	return { accessToken, refreshToken }
}

/**
 *
 * @param {Express.Response} res
 * @param {string} club
 * @param {boolean} sendCookie
 * @param {boolean} isEditor
 * @param {string=} editUrl
 */
const sendTokens = async (res, club, sendCookie, isEditor, editUrl) => {
	const expiresIn = new Date()
	expiresIn.setMilliseconds(
		expiresIn.getMilliseconds() + ms(REFRESH_TOKEN_EXPIRES_IN)
	)

	const { accessToken, refreshToken } = await createTokens(
		club,
		isEditor,
		isEditor ? editUrl : undefined
	)

	sendCookie
		? res
				.status(200)
				.cookie('circlus.refresh_token', refreshToken, {
					// path: `/c/${club}`,
					httpOnly: true,
					expiresIn
					// domain: '127.0.0.1' //functions.config().website.url
				})
				.json({ token: accessToken })
		: res.status(200).json({ token: accessToken })
}

/**
 *
 * token expiration
 * password enabled: 1 week
 * password disabled: 1 hour
 *
 * in the future, maybe make the passsword-enabled expiry time settable
 * by the Administrator of the club.
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {boolean} isEditor
 */
const tokenPath = async (req, res, isEditor) => {
	try {
		const club = req.body.club
		const pass = req.body.pass
		const editUrl = req.body.editUrl

		const clubDoc = await db()
			.collection('clubs')
			.doc(club)
			.get()

		if (!clubDoc.exists)
			return res.status(401).json({ error: 'Unknown club or invalid password' })

		if (clubDoc.data().passwordEnabled === true) {
			const clubUrlHash = shajs('sha256')
				.update(club)
				.digest('hex')
			const hashDoc = await db()
				.collection('passHashes')
				.doc(clubUrlHash)
				.get()
			if (!hashDoc.exists)
				console.error(`${club} exists, but its hash document does not.`)
			// console.log(`checking ${pass} against ${hashDoc.data().passHash}`)

			const validPass = await argon2.verify(hashDoc.data().passHash, pass)

			if (validPass) {
				await sendTokens(res, club, true, isEditor, editUrl)
			} else {
				return res
					.status(401)
					.json({ error: 'Unknown club or invalid password' })
			}
		} else {
			await sendTokens(res, club, true, isEditor, editUrl)
		}
	} catch (err) {
		console.error(err)
		console.log(req.body)
		console.log(req.body.club)
		return res.status(500).json({ error: err.toString() })
	}
}

/** ================================================================== */
/** ================================================================== */
/** ================================================================== */
/** ================================================================== */

/**
 * TODO - documentation
 */
app.post('/visitor_token', bodyParser.json(), async (req, res) => {
	await tokenPath(req, res, false)
})

/**
 * TODO - documentation
 */
app.post('/editor_token', bodyParser.json(), async (req, res) => {
	await tokenPath(req, res, true)
})

app.post('/refresh_token', bodyParser.json(), async (req, res) => {
	const refreshTokenCookie = req.cookies['circlus.refresh_token']

	try {
		if (!refreshTokenCookie)
			throw new Error('refresh token cookie not present in request')

		const { club, isEditor, editUrl } = jwt.verify(
			refreshTokenCookie,
			jwtSecret
		)

		await sendTokens(res, club, false, isEditor, editUrl)
	} catch (err) {
		res.status(400).json({ error: err.message })
	}
})

const clubRouter = express.Router({ mergeParams: true })
app.use('/clubs/:club', bodyParser.json(), clubRouter)

const verifyToken = async (req, res, next, isEditor) => {
	try {
		if (!req.token) return res.status(401).json({ error: 'No token' })
		const editUrl = req.params.editUrl
		// this line throws if the JWT token is invalid
		const token = await jwtVerify(req.token, jwtSecret)

		if (
			isEditor ? editUrl && token.isEditor && token.editUrl === editUrl : true
		) {
			return next()
		} else {
			return res.status(401).json({ error: 'Invalid token' })
		}
	} catch (err) {
		console.error(err)
		if (err.message === 'jwt expired') {
			return res.status(400).json({ error: err.message })
		}
		return res.status(500).json({ error: err.message })
	}
}

const visitorOnly = async (req, res, next) => {
	await verifyToken(req, res, next, false)
}

const editorOnly = async (req, res, next) => {
	await verifyToken(req, res, next, true)
}

const obscureFields = (docSnap, fields) => {
	let doc = docSnap.data()
	fields.forEach(k => (doc[k] = undefined))
	return doc
}

const clubPaymentCheck = async clubId => {
	const club = await db()
		.collection('clubs')
		.doc(clubId)
		.get()

	return clubPaymentStatusOkay(club.data().status)
}

// TODO this way of verifying payment for the API doubles up
// the amount of db reads for fetching/editing members.
// not for directly fetching the club, however.
// might need a better solution
const clubPaymentMiddleware = async (req, res, next) => {
	const s = await clubPaymentCheck(req.params.club)

	if (!s) {
		return res.status(403).send({
			error: 'Administrator did not complete payment'
		})
	}

	next()
}
/**
 * TODO - documentation
 */
clubRouter.get('/', bodyParser.json(), visitorOnly, async (req, res) => {
	try {
		const club = obscureFields(
			await db()
				.collection('clubs')
				.doc(req.params.club)
				.get(),
			['passwordSet', 'stripe'] // TODO this may be outdated
		)

		const okay = clubPaymentStatusOkay(club.status)

		if (!okay) {
			res.status(403).send({
				error: 'Administrator did not complete payment'
			})
		}

		/**
			filter the memberList object of things that visitors shouldn't see
			- blank, incomplete entries
			- secret emails
			does a single loop over the entire memberList, value **n**
		*/
		for (const k in club.memberList) {
			// remove blank contacts
			if (isBlankMemberListItem(club.memberList[k]))
				club.memberList[k] = undefined
			// remove email
			else club.memberList[k].email = undefined
		}

		return res.send(club)
	} catch (err) {
		console.error(err)
		return res.status(500).json({ error: err.toString() })
	}
})

/**
 * TODO - documentation
 */
clubRouter.get('/needs_password', async (req, res) => {
	try {
		const club = await db()
			.collection('clubs')
			.doc(req.params.club)
			.get()

		return res.json(!!club.data().passwordEnabled)
	} catch (err) {
		console.error(err)
		return res.status(500).json({ error: err.toString() })
	}
})

/**
 * TODO - documentation
 */
clubRouter.get(
	'/members/:member',
	bodyParser.json(),
	visitorOnly,
	clubPaymentMiddleware,
	async (req, res) => {
		try {
			const member = await db()
				.collection('clubs')
				.doc(req.params.club)
				.collection('members')
				.doc(req.params.member)
				.get()

			if (!member.exists)
				throw new Error(
					`member ${req.params.member} does not exist in club ${req.params.club}`
				)
			return res.json({
				...obscureFields(member, [/*'owner',*/ 'email', 'editUrl']),
				id: member.id
			})
		} catch (err) {
			console.error(err)
			return res.status(500).json({ error: err.toString() })
		}
	}
)

/**
 * TODO - documentation
 */
clubRouter.get(
	'/edit/:editUrl',
	bodyParser.json(),
	editorOnly,
	clubPaymentMiddleware,
	async (req, res) => {
		try {
			const member = await memberForEditUrl(req.params.club, req.params.editUrl)
			if (!member) return res.status(403).json({ error: 'Member not found' })
			return res.send({ ...member.data(), id: member.id })
		} catch (err) {
			console.error(err)
			return res.status(500).json({ error: err.toString() })
		}
	}
)

/**
 * TODO - documentation
 */
// clubRouter.options('/edit/:editUrl', corsOptions)
clubRouter.post(
	'/edit/:editUrl',
	bodyParser.json(),
	editorOnly,
	clubPaymentMiddleware,
	async (req, res) => {
		try {
			const v = processCard(req.body.card)
		} catch (err) {
			console.error(err)
			return res.status(400).json({ error: 'Invalid card format.' })
		}
		try {
			const member = await memberForEditUrl(req.params.club, req.params.editUrl)
			if (!member) return res.status(403).json({ error: 'Member not found' })

			const clubRef = db()
				.collection('clubs')
				.doc(req.params.club)

			const updateBatch = db().batch()

			updateBatch.update(member.ref, {
				card: req.body.card,
				email: req.body.email || member.data().email
			})

			updateBatch.update(clubRef, {
				[`memberList.${member.id}`]: sortMap(
					req.body.email || member.data().email,
					req.body.card
				)
			})

			await updateBatch.commit()

			return res.status(200).json({ success: true })
		} catch (err) {
			console.error(err)
			return res.status(400).json({ error: err.message })
		}
	}
)

clubRouter.post(
	'/edit/:editUrl/upload',
	// 5mb limit prevents downloading massive files, but images are
	// downsized to 500x500 later anyways.
	// bodyParser.raw({ limit: '5mb', type: 'image/*' }),
	editorOnly,
	clubPaymentMiddleware,
	async (req, res) => {
		const { image: imageData } = req.body
		try {
			const img = await uploadMemberImage(imageData, req.params)
			return res.status(200).json({ success: true })
		} catch (err) {
			return res.status(500).json({ error: err.message })
		}
	}
)

clubRouter.post(`/edit/:editUrl/delete`, editorOnly, async (req, res) => {
	try {
		await deleteMemberImage(req.params)
		return res.status(200).json({ success: true })
	} catch (err) {
		return res.status(500).json({ error: err.message })
	}
})

module.exports = functions.https.onRequest(app)
