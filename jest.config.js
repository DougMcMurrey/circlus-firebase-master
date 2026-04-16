// const { createJestConfig } = require('@craco/craco');

// const cracoConfig = require('./craco.config.js');

// module.exports = createJestConfig(cracoConfig);

module.exports = {
	roots: ['<rootDir>/src', '<rootDir>/test'],
	moduleNameMapper: {
		'\\.less$': 'identity-obj-proxy'
	},
	collectCoverage: true,
	collectCoverageFrom: ['<rootDir>/src/**/*.js'],
	moduleFileExtensions: ['js', 'json', 'jsx', 'vcf']
}
