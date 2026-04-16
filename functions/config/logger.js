const silent = process.env.NODE_ENV === 'test'

module.exports = {
	log: (...args) => {
		if (!silent) console.log(...args)
	},
	info: (...args) => {
		if (!silent) console.info(...args)
	},
	warn: (...args) => {
		if (!silent) console.warn(...args)
	},
	error: (...args) => {
		if (!silent) console.error(...args)
	}
}
