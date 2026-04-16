const functions = require('firebase-functions')
const admin = require('firebase-admin')
const vcfer = require('vcfer')
const VCard = vcfer.default

const crs = require('crypto-random-string')
const argon2 = require('argon2')

// const vcfFiller = require("./vcf-filler")

const { sortMap } = require('./shared')
const { db, setDb } = require('../get-db')

const fs = functions.firestore
// const db = getDb()
const FieldValue = admin.firestore.FieldValue

/**
 * @function onClubDelete
 * @param {*} change
 * @param {*} context
 */
const onMemberUpdate = async (change, context) => {
	const { club, member } = context.params

	const oldData = change.before.data()
	const newData = change.after.data()

	const oldSortMap = sortMap(oldData.email, oldData.card)
	const newSortMap = sortMap(newData.email, newData.card)

	if (oldSortMap !== newSortMap) {
		const upd = {}
		upd[`memberList.${change.after.id}`] = sortMap
		await db()
			.collection('clubs')
			.doc(club)
			.update(upd)
	}
}
// exports.onMemberUpdate = functions.firestore
// 	.document("/clubs/{club}/members/{member}")
// 	.onUpdate(onMemberUpdate)

/**
 * @function onClubDelete
 * @param {*} snap
 * @param {*} context
 */
// const onClubDelete = async (snap, context) => {
// 	let deletionUpdate = {}
// 	deletionUpdate[`ownedClubs.${snap.id}`] = FieldValue.delete()

// 	db()
// 		.collection('users')
// 		.doc(snap.data().owner)
// 		.update(deletionUpdate)
// }
// exports.onClubDelete = functions.firestore
// 	.document('/clubs/{club}')
// 	.onDelete(onClubDelete)
