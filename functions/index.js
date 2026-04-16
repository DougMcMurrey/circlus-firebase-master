const functions = require('firebase-functions')
functions.config()
const admin = require('firebase-admin')

const ENV = functions.config().env.env
console.log(ENV)

const adminKey = require(`./admin-key.${ENV}.json`)

adminConfig = JSON.parse(process.env.FIREBASE_CONFIG)

console.log('Firebase config: ', adminConfig)

adminConfig.credential = admin.credential.cert(adminKey)

admin.initializeApp(adminConfig)

exports.visitorApi = require('./src/api')

exports.stripeWebhook = require('./src/stripe-webhooks/stripe-webhooks')

Object.assign(exports, require('./src/https'))
Object.assign(exports, require('./src/https/club'))
Object.assign(exports, require('./src/https/payment'))
// if (process.env.NODE_ENV !== 'test') {
// Object.assign(exports, require('./src/storage'))
Object.assign(exports, require('./src/auth'))
Object.assign(exports, require('./src/firestore'))
Object.assign(exports, require('./src/scheduled'))
// }
