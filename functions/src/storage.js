const functions = require('firebase-functions')
const admin = require('firebase-admin')
const { spawn } = require('child-process-promise')
const { tmpdir } = require('os')
const path = require('path')
const fs = require('fs')

const { db, bucket } = require('../get-db')

const onMemberImageFinalize = functions.storage
	.object()
	.onFinalize(async object => {})

module.exports = { onMemberImageFinalize }
