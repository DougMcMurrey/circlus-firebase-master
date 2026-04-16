module.exports = {
	plugins: [
		{
			plugin: require('@semantic-ui-react/craco-less')
		},
		{
			plugin: require('babel-plugin-transform-semantic-ui-react-imports')
		}
		// {
		// 	plugin: require('@babel/plugin-proposal-optional-chaining')
		// }
	],
	ignore: ['test', '**/*.spec.js', '**/*.test.js'],
	eslint: {
		configure: {
			rules: {
				'no-unused-vars': 'off'
			}
		}
	}
	// jest: {
	// 	babel: {
	// 		addPresets: true,
	// 		addPlugins: true
	// 	},
	// 	configure: (jestConfig, { env, pasth, proxy, allowedHost}) => {
	// 		return jestConfig;
	// 	}
	// }
}
