const functions = require('firebase-functions')
const firestore = require('@google-cloud/firestore')
const util = require('util')

const client = new firestore.v1.FirestoreAdminClient()

exports.firestoreBackup = functions.pubsub
	.schedule('every 24 hours')
	.onRun(context => {
		const bucketUrl = `gs://circlus-backup`
		const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT
		const databaseName = client.databasePath(projectId, '(default)')

		console.log(
			`Performing scheduled backup. bucket url:`,
			bucketUrl,
			'- project id:',
			projectId,
			'- database name:',
			databaseName
		)

		return client
			.exportDocuments({
				name: databaseName,
				outputUriPrefix: bucketUrl,
				collectionIds: []
			})
			.then(responses => {
				const response = responses[0]
				console.log(`Operation Name: ${response['name']}`)
				return response
			})
			.catch(err => {
				console.error(err)
				throw new Error('Firestore scheduled backup FAILED!')
			})
	})
