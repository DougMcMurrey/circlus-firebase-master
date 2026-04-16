const vcfer = require('vcfer')
const VCard = vcfer.default

/**
 *
 * @param {VCard | string | undefined} card
 */
const processCard = card => {
	try {
		let c = card
		if (typeof c === 'string') c = new VCard(JSON.parse(card))
		else if (!c) c = new VCard()
		c.set('prodid', '-//circl.us//Web App//EN')
		return c
	} catch (err) {
		throw new Error('Error parsing vcard: ' + err.msg)
	}
}

/**
 *
 * @param {string | VCard | undefined} card
 */
const processCardString = card => JSON.stringify(processCard(card).toJCard())

module.exports = {
	processCard,
	processCardString
}
