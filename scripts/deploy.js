require('dotenv-flow').config()
const { promisify } = require('util')
const spawn = promisify(require('child_process').spawn)
const execSync = require('child_process').execSync
const inquirer = require('inquirer')

const main = async () => {
	const env = process.env.NODE_ENV

	console.log('env', env)
	if (env !== 'production' && env !== 'development') {
		const { deploy_target } = await inquirer.prompt({
			type: 'list',
			name: 'deploy_target',
			message: 'Where do you want to deploy?',
			choices: ['development', 'production'],
			default: 0
		})

		process.env.NODE_ENV = deploy_target
	}

	if (process.env.NODE_ENV === 'production') {
		const { confirmation } = await inquirer.prompt({
			type: 'confirm',
			name: 'confirmation',
			message: 'Are you sure you want to deploy to production?',
			default: false
		})
		if (!confirmation) process.exit()
	}

	// if (process.env.NODE_ENV === 'production') {
	// execSync('npm run export-favicon', {
	// 	env: process.env,
	// 	stdio: 'inherit'
	// })
	execSync('npm run build', {
		env: {
			NODE_ENV: process.env.NODE_ENV
		},
		stdio: 'inherit'
	})
	// }

	execSync('cd ./functions && node setup.js', {
		env: {
			NODE_ENV: process.env.NODE_ENV
		},
		stdio: 'inherit'
	})

	execSync(`firebase deploy -P ${process.env.NODE_ENV}`, {
		env: {
			NODE_ENV: process.env.NODE_ENV
		},
		stdio: 'inherit'
	})

	// await spawn('npm', ['run', 'build'], {
	// 	stdio: 'inherit',
	// 	env: process.env
	// })
	// await spawn('node', ['setup.js'], {
	// 	stdio: 'inherit',
	// 	cwd: './functions',
	// 	env: process.env
	// })
	// await spawn(`firebase deploy -P ${process.env.NODE_ENV}`, [], {
	// 	stdio: 'inherit',
	// 	env: process.env
	// })
}
main()
