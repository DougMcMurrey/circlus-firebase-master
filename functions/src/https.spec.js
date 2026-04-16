/**
 * @jest-environment node
 */
const firebase = require('@firebase/testing')
const { assertFails } = firebase
const vcfer = require('vcfer')
const VCard = vcfer.default
const {
	newTestFeatures,
	newTestAdmin,
	destroyTestAndAdmin,
	testUser,
	cleanupAfterEach
} = require('../testing')
const { toJCardString, parseJCardString } = require('./shared')
const { setDb } = require('../get-db')
let httpsFunctions = require('./https')
const filler = require('./vcf-filler')

const USER_ID = 'cooluser100'
const USER_EMAIL = 'cool@yes.gov'

const test = newTestFeatures()
const admin = newTestAdmin()

beforeAll(() => {
	setDb(admin.firestore())
})

beforeEach(async () => {
	await testUser(admin, USER_ID, USER_EMAIL)
})

afterEach(async () => {
	await cleanupAfterEach(test)
})

afterAll(async () => {
	await destroyTestAndAdmin(test, admin)
})

jest.mock('../src/firestore')

describe('function : ping()', () => {
	it('invokes', async () => {
		const wrapped = test.wrap(httpsFunctions.ping)
		const data = {
			pingData: 'hello, world',
			broadcastAt: new Date()
		}
		const res = await wrapped({
			data: data,
			ref: {
				set: jest.fn()
			}
		})
		expect(res.data.pingData).toEqual('hello, world')
		expect(res.data).toEqual(data)
	})
})

const makeClub = async (name, pass) => {
	const wrapped = test.wrap(httpsFunctions.createClub)
	return await wrapped(
		{
			name,
			pass,
			stripeData: {}
		},
		{
			auth: {
				uid: USER_ID
			}
		}
	)
}

// TODO
describe('function : createClub', () => {
	it('creates a club', async () => {
		const res = await makeClub('createClub test club', 'password')
		expect(
			await admin
				.firestore()
				.doc(`users/${USER_ID}`)
				.get()
				.then(res => res.data().ownedClubs)
		).toHaveProperty(res.url)
		expect(res.name).toBe('createClub test club')
		expect(res.url).toBeDefined()
	})
	it('trims', async () => {
		const res = await makeClub('\nspace test club\t\t\t', 'password')
		// console.log('"' + res.name + '"')
		expect(res.name).toBe('space test club')
	})
	it('fails without a password', async () => {
		await expect(makeClub('no password club', '')).rejects.toEqual(
			new Error('Must provide password for club')
		)
	})
})
describe('function : createMember', () => {
	const createMemberWrapped = test.wrap(httpsFunctions.createMember)

	let clubUrl

	beforeEach(async () => {
		const { url } = await makeClub('createMember test club', 'password')
		clubUrl = url
	})

	it('creates a member', async () => {
		const res = await createMemberWrapped(
			{
				email: 'newmember@no.yes',
				card: filler.gump,
				club: clubUrl
			},
			{
				auth: { uid: USER_ID }
			}
		)
		expect(res).toHaveProperty('id')
		expect(res.email).toBe('newmember@no.yes')
		expect(res.card).toBe(filler.gump)
		expect(res.club).toBe(clubUrl)
		await expect(
			admin
				.firestore()
				.doc(`clubs/${clubUrl}/members/${res.id}`)
				.get()
				.then(res => res.data().card)
		).resolves.toBe(filler.gump)
	})

	it('fails on invalid parameters', async () => {
		// bad club url
		await expect(
			Promise.all([
				assertFails(
					createMemberWrapped(
						{
							email: 'newmember@no.yes',
							card: filler.gump,
							club: 'bad_club_url_throws'
						},
						{
							auth: { uid: USER_ID }
						}
					)
				),
				assertFails(
					createMemberWrapped(
						{
							email: 'newmember@no.yes',
							card: filler.gump,
							club: clubUrl
						},
						{
							auth: { uid: 'bad uid throws' }
						}
					)
				),
				assertFails(
					createMemberWrapped(
						{
							card: filler.gump,
							club: clubUrl
						},
						{
							auth: { uid: 'bad uid throws' }
						}
					)
				)
			])
		).resolves.not.toThrow()
	})
})

describe('function : deleteMember', () => {
	const deleteMemberWrapped = test.wrap(httpsFunctions.deleteMember)
	const createMemberWrapped = test.wrap(httpsFunctions.createMember)
	/** @type {string} */
	let url
	/** @type {string} */
	let memberId
	beforeEach(async () => {
		const { url: clubUrl } = await makeClub(
			'deleteMember test club',
			'password'
		)
		url = clubUrl
		const { id } = await createMemberWrapped(
			{
				email: 'deleteme@yes.gov',
				card: filler.gump,
				club: url
			},
			{
				auth: { uid: USER_ID }
			}
		)
		memberId = id
	})

	// firebase emulator does not support FieldValue.delete()
	// https://github.com/firebase/firebase-js-sdk/issues/1799
	// must test deletion on server, later...
	// 12/4/2019: still doesn't work? github appears to say this
	// will be fixed on 'next release of CLI' circa may 2019.
	// I've downloaded an update since then but it still is throwing
	// If it's a fieldValue.
	// TODO test deleteMember on server side
	it.skip('deletes a member', async () => {
		const res = await deleteMemberWrapped(
			{
				id: memberId,
				club: url
			},
			{
				auth: { uid: USER_ID }
			}
		)
		expect(res.success).toBe(true)
	})
})

describe(' function : updateMember', () => {
	const createMemberWrapped = test.wrap(httpsFunctions.createMember)
	const updateMemberWrapped = test.wrap(httpsFunctions.updateMember)

	/** @type {string} */
	let url
	/** @type {string} */
	let memberId

	beforeEach(async () => {
		const { url: clubUrl } = await makeClub(
			'deleteMember test club',
			'password'
		)
		url = clubUrl
		const { id } = await createMemberWrapped(
			{
				email: 'update@yes.gov',
				card: filler.gump,
				club: url
			},
			{
				auth: { uid: USER_ID }
			}
		)
		memberId = id
	})

	const getSortMap = async () => {
		const c = await admin
			.firestore()
			.doc(`clubs/${url}`)
			.get()
		return c.data().memberList[memberId]
	}

	it("updates a member's email", async () => {
		const memberRef = admin.firestore().doc(`clubs/${url}/members/${memberId}`)

		let sortMap = await getSortMap()
		expect(sortMap.email).toBe('update@yes.gov')

		const oldMemberData = await memberRef.get().then(d => d.data())
		expect(oldMemberData.email).toBe('update@yes.gov')

		const NEW_EMAIL = 'i_got_updated@woo.biz'

		const res = await updateMemberWrapped(
			{
				id: memberId,
				club: url,
				email: NEW_EMAIL
			},
			{
				auth: { uid: USER_ID }
			}
		)
		expect(res.success).toBe(true)
		expect(res.id).toBe(memberId)
		expect(res.email).toBe(NEW_EMAIL)
		expect(res.card).toBeUndefined()
		expect(res.club).toBe(url)

		sortMap = await getSortMap()
		expect(sortMap.email).toBe(NEW_EMAIL)

		const memberData = await memberRef.get().then(d => d.data())

		expect(memberData.email).toBe(NEW_EMAIL)
	})

	it("removes a member's email if it equals ''", async () => {
		const memberRef = admin.firestore().doc(`clubs/${url}/members/${memberId}`)

		let sortMap = await getSortMap()
		expect(sortMap.email).toBe('update@yes.gov')

		const res = await updateMemberWrapped(
			{
				id: memberId,
				club: url,
				email: ''
			},
			{
				auth: { uid: USER_ID }
			}
		)

		expect(res.success).toBe(true)
		expect(res.id).toBe(memberId)
		expect(res.email).toBe('')
		expect(res.card).toBeUndefined()
		expect(res.club).toBe(url)

		sortMap = await getSortMap()
		expect(sortMap.email).toBe('')

		const memberData = await memberRef.get().then(d => d.data())

		expect(memberData.email).toBe('')
	})

	it("updates a member's card", async () => {
		const memberRef = admin.firestore().doc(`clubs/${url}/members/${memberId}`)
		const oldMemberData = await memberRef.get().then(d => d.data())
		const card = parseJCardString(oldMemberData.card)
		expect(card.getOne('title').value).toBe('Shrimp Man')
		expect(card.get('tel').length).toBe(2)
		let sortMap = await getSortMap()
		// console.log(sortMap)
		expect(sortMap.name).toBe('Gump;Forrest;;;')

		// do update
		const NEW_NAME = 'Gump;CoolPantz;McGoo;;'
		const NEW_ORG = 'CoolPantz Industries'
		const NEW_PHONE = new vcfer.Property('tel', 'tel:+19999999999')

		card.set('n', NEW_NAME)
		card.set('org', NEW_ORG)
		card.add(NEW_PHONE)

		const res = await updateMemberWrapped(
			{
				id: memberId,
				club: url,
				card: toJCardString(card)
			},
			{
				auth: { uid: USER_ID }
			}
		)
		expect(res.success).toBe(true)
		expect(res.id).toBe(memberId)
		expect(res.email).toBeUndefined()
		expect(res.card).toBe(toJCardString(card))
		expect(res.club).toBe(url)

		sortMap = await getSortMap()
		// console.log(sortMap)
		expect(sortMap.name).toBe(NEW_NAME)
		expect(sortMap.org).toBe(NEW_ORG)

		const memberData = await memberRef.get().then(d => d.data())
		expect(memberData.editUrl).toBe(oldMemberData.editUrl)
		expect(memberData.owner).toBe(oldMemberData.owner)
		const newCard = parseJCardString(memberData.card)
		expect(newCard.get('tel').length).toBe(3)
	})
})
