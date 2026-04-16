/** @param {string} _name @returns {string} */
const validateClubName = _name => {
	let name = _name.replace(/\s+/gi, ' ').trim()
	// https://regex101.com/r/aq6n7A/2/tests
	const validator = /^[\S ]{3,50}$/s
	if (!name) throw new Error('Must provide name for club')
	if (!validator.test(name)) throw new Error('Invalid club name: ' + name)
	return name
}

module.exports = validateClubName
