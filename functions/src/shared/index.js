const crs = require('crypto-random-string')
const vcfer = require('vcfer')
const VCard = vcfer.default

/**
 *
 * @param {import('vcfer').default} card
 * @param {string} key
 */
exports.getPreferred = (card, key) => {
	//return card.get(key, "pref")[0] || card.get(key)[0]
	return card.getOne(key)
}
/**
 *
 * @param {string} email
 * @param {string} cardJsonString
 *
 * @returns {{
 * 	email: string,
 * 	name: string
 * 	org: string
 * 	error: string | undefined
 * }}
 */
exports.sortMap = (email, cardJsonString) => {
	/** @type {import('vcfer').default} */
	let card
	try {
		card = new VCard(JSON.parse(cardJsonString))
	} catch (err) {
		// console.error("invalid JSON file");
		console.warn('sortMap error: ', err.message, card)
		return {
			email: email || '',
			name: '',
			org: '',
			error: 'invalid JSON file'
		}
	}

	const name = card.getOne('n')
	const org = card.getOne('org')

	return {
		email: email || '',
		name: name ? name.value : '',
		org: org ? org.value : '',
		error: ''
	}
}

const MEMBER_ID_LENGTH = 10
const EDIT_URL_LENGTH = 128

exports.memberIdBuilder = () => {
	return crs({ length: MEMBER_ID_LENGTH })
}

exports.editUrlBuilder = () => {
	return crs({ length: EDIT_URL_LENGTH })
}

exports.parseJCardString = jCardString => {
	return new VCard(JSON.parse(jCardString))
}

/**
 * @param {VCard} card
 */
exports.toJCardString = card => {
	return JSON.stringify(card.toJCard())
}

/**
 * Returns true if `name` is some variant of `";;;;"` or `""` etc
 * AND if org is blank as well
 */
exports.isBlankMemberListItem = ({ name, error, org }) => {
	let hasName = false
	name.split(';').forEach(e => {
		if (!!e) hasName = true
	})
	let hasOrg = !!org

	return !hasName && !hasOrg
}

/**
 * @param {Promise<any>[]} promises
 *
 * https://medium.com/trabe/using-promise-allsettled-now-e1767d43e480
 */
exports.promiseAllSettled = promises =>
	Promise.all(
		promises.map((promise, i) =>
			promise
				.then(value => ({
					status: 'resolved',
					value
				}))
				.catch(reason => ({
					status: 'rejected',
					reason
				}))
		)
	)
