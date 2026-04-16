const functions = require('firebase-functions')
const path = require('path')
const jwt = require('jsonwebtoken')

const Email = require('email-templates')

const mailer = require('@sendgrid/mail')

mailer.setApiKey(functions.config().sendgrid.key)

const templatesPath = path.resolve('src', 'email', 'templates')

const templates = new Email({
	message: {
		from: 'noreply@circl.us'
	},
	transport: {},
	views: {
		root: templatesPath
	},
	preview: false,
	juice: true,
	juiceResources: {
		preserveImportant: true,
		webResources: {
			relativeTo: templatesPath
		}
	},
	send: true
})

/**
 *
 * @param {string} to email to send message to
 * @param {string} template Name of template in src/email/templates
 * @param {string} subject Automatically prepends "Circlus - " to this string
 * @param {{[name: string]: string}} templateVars
 */
const sendEmail = async (to, template, subject, templateVars) => {
	const spamKey = jwt.sign(
		{
			to,
			template,
			templateVars
		},
		functions.config().jwt.key
	)

	const html = await templates.render(template, {
		...templateVars,
		spamKey,
		baseUrl: functions.config().website.url
	})

	console.log(`Sending email to ${to}: "Circlus - ${subject}"`)
	await mailer.send({
		from: 'noreply@circl.us',
		to,
		subject: 'Circlus - ' + subject,
		html
	})
	console.log(`Email sent to ${to}: "Circlus - ${subject}"`)
}

module.exports = {
	mailer,
	templates,
	sendEmail
}
