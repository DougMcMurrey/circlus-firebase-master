const { assertFails, assertSucceeds } = require('@firebase/testing')
const {
	newTestFeatures,
	newTestAdmin,
	destroyTestAndAdmin,
	testUser,
	cleanupAfterEach
} = require('../testing')
const {
	editUrlBuilder,
	memberIdBuilder,
	parseJCardString,
	toJCardString
} = require('./shared')
const { gump } = require('./vcf-filler')
const vcfer = require('vcfer')
const VCard = vcfer.default

const firestoreFunctions = require('./firestore')
const httpsFunctions = require('./https')
const { setDb } = require('../get-db')

const USER_ID = 'firestoretestuser100'
const USER_EMAIL = 'firestore@test.user'

const CLUB_NAME = 'firestore testing club'

let CLUB_URL

const test = newTestFeatures()
const admin = newTestAdmin()

beforeAll(async () => {
	setDb(admin.firestore())
})

beforeEach(async () => {
	await testUser(admin, USER_ID, USER_EMAIL)
	const club = await makeClub(CLUB_NAME, 'password', USER_ID)
	CLUB_URL = club.url
})

afterEach(async () => {
	await cleanupAfterEach(test)
})

afterAll(async () => {
	await destroyTestAndAdmin(test, admin)
})

const makeClub = async (name, pass, ownerId) => {
	const wrapped = test.wrap(httpsFunctions.createClub)
	return await wrapped(
		{
			name,
			pass,
			stripeData: {}
		},
		{
			auth: {
				uid: ownerId
			}
		}
	)
}

/**
 *
 * @param {object} data
 * @param {string} data.email
 * @param {string} data.card
 * @param {string} data.club
 */
const makeMember = async data => {
	const wrapped = test.wrap(httpsFunctions.createMember)
	return await wrapped(data)
}

/**
 * @typedef MemberData
 * @property {string} card
 * @property {string} editUrl
 * @property {string} email
 * @property {string} owner
 */

/**
 * @param {string} club
 * @param {string} memberId
 * @param {string} memberEmail
 * @param {VCard} beforeCard
 * @param {(data: MemberData) => MemberData} change
 */
const makeMemberChange = (club, memberId, memberEmail, beforeCard, change) => {
	const beforeData = {
		email: memberEmail,
		owner: USER_ID,
		card: toJCardString(beforeCard)
	}
	// const memberId = memberIdBuilder()
	const memberDocPath = `clubs/${club}/members/${memberId}`
	const beforeSnap = test.firestore.makeDocumentSnapshot(
		beforeData,
		memberDocPath
	)

	const afterData = change({ ...beforeData }) // deep clone
	const afterSnap = test.firestore.makeDocumentSnapshot(
		afterData,
		memberDocPath
	)

	return test.makeChange(beforeSnap, afterSnap)
}

describe('onMemberUpdate', () => {
	let MEMBER_ID

	beforeEach(async () => {
		const res = await makeMember({
			email: 'on@member.update',
			card: gump,
			club: CLUB_URL
		})
		MEMBER_ID = res.id
	})

	// TODO unit test for firestore triggers...
	it.skip('updates memberList entry', async () => {
		const wrapped = test.wrap(firestoreFunctions.onMemberUpdate)

		const gumpCard = parseJCardString(gump)

		const change = makeMemberChange(
			CLUB_URL,
			MEMBER_ID,
			'on@member.update',
			gumpCard,
			data => {
				const c = parseJCardString(data.card)
				c.set('title', 'Professional Jogger')
				c.set('n', 'Gump;BigMan;;;')
				return { ...data, card: toJCardString(c) }
			}
		)

		await wrapped(change)
	})
})
