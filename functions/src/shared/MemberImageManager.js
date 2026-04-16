const fs = require('fs')
const os = require('os')
const path = require('path')
const util = require('util')
const jimp = require('jimp')
const { spawn } = require('child-process-promise')
const crs = require('crypto-random-string')
const { db, bucket } = require('../../get-db')
const base64Img = require('base64-img')

const readFile = util.promisify(fs.readFile)

const clubAndMemberDocs = async ({ club, member, editUrl }) => {
	const clubDoc = await db()
		.collection('clubs')
		.doc(club)
		.get()

	if (!clubDoc.exists) throw new Error(`Club ${club} does not exist`)

	const memberDoc = editUrl
		? (
				await clubDoc.ref
					.collection('members')
					.where('editUrl', '==', editUrl)
					.limit(1)
					.get()
		  ).docs[0]
		: await clubDoc.ref
				.collection('members')
				.doc(member)
				.get()

	if (!memberDoc.exists)
		throw new Error(
			`uploadMemberImage: Member ${member || editUrl} does not exist`
		)

	return { clubDoc, memberDoc }
}

// we don't need to limit max size, because we downsize huge images anyways.
// const MAX_IMAGE_SIZE_MB = 2 // max size of image in megabytes
const IMAGE_SIZE = 500 // crops/scales image to square of this size.

// TODO use uploadImage in ./shared/ImageManager instead

/**
 * can only accept member OR editUrl, but not both.
 * @param {string} imageData base64 image data
 * @param {string} filetype
 * @param {object} params
 * @param {string} params.club
 * @param {string=} params.member
 * @param {string=} params.editUrl
 */
const uploadMemberImage = async (imageData, { club, member, editUrl }) => {
	const { clubDoc, memberDoc } = await clubAndMemberDocs({
		club,
		member,
		editUrl
	})

	const bucketPath = [
		clubDoc.data().owner,
		'clubs',
		clubDoc.id,
		'members',
		memberDoc.id + '.jpg'
	].join('/')

	const imageType = imageData.substr(5).split(';')[0] // image/png
	const ext = imageType.split('/')[1]

	const tmpFileName = crs({ length: 10 })
	const tmpFilePath = `/tmp/${tmpFileName}`
	const tmpConvertedFilePath = `/tmp/${tmpFileName}.jpg`

	console.log('downloading to tmp directory', tmpFilePath)

	const resPath = base64Img.imgSync(imageData, '/tmp/', `${tmpFileName}`)

	const dim = IMAGE_SIZE + 'x' + IMAGE_SIZE

	console.log('converting', resPath, 'to', tmpConvertedFilePath)
	// http://www.imagemagick.org/Usage/thumbnails/#cut
	try {
		const convert = await spawn('convert', [
			resPath,
			`-thumbnail`,
			`${dim}^`,
			`-gravity`,
			`center`,
			`-extent`,
			`${dim}`,
			tmpConvertedFilePath
		])

		console.log(convert.stdout)
	} catch (err) {
		console.error('imageMagick error in uploadMemberImage')
		console.error(err)
		throw new Error(err)
	}

	console.log('uploading to bucket at', bucketPath)
	return await bucket().upload(tmpConvertedFilePath, {
		destination: bucketPath
	})

	// this bucket file is promptly deleted by the image resizer extension,
	// and replaced by thumbnails
}

const deleteMemberImage = async ({ club, member, editUrl }) => {
	// this function works in tandem with the image resize extension
	const sizes = '500x500,250x250,50x50,25x25'.split(',')

	const { clubDoc, memberDoc } = await clubAndMemberDocs({
		club,
		member,
		editUrl
	})

	const bucketPaths = sizes.map(size =>
		[
			clubDoc.data().owner,
			'clubs',
			clubDoc.id,
			'members',
			`${memberDoc.id}_${size}.jpg`
		].join('/')
	)

	for (const path of bucketPaths) {
		try {
			await bucket()
				.file(path)
				.delete()
		} catch (err) {
			if (err.message.includes('No such object')) {
				// don't throw if it's just a missing object error.
			} else {
				throw new Error(err)
			}
		}
	}
}

module.exports = {
	uploadMemberImage,
	deleteMemberImage
}
