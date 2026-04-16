const crs = require('crypto-random-string')
const base64Img = require('base64-img')
const { bucket } = require('../../get-db')
const { spawn } = require('child-process-promise')

/**
 *
 * @param {string} imageDataBase64
 * @param {string} bucketPath
 * @param {number} width
 * @param {number} height
 */
const uploadImage = async (imageDataBase64, bucketPath, width, height) => {
	const imageType = imageDataBase64.substr(5).split(';')[0] // image/png

	if (imageType.split('/')[0] != 'image') {
		console.warn(`${imageType} is not an image MIME type`)
	}

	const ext = imageType.split('/')[1]
	console.log(imageType)

	const tmpFileName = crs({ length: 15 })
	const tmpFilePath = `/tmp/${tmpFileName}`
	const tmpConvertedFilePath = `/tmp/${tmpFileName}.jpg`

	console.log('downloading to tmp directory', tmpFilePath)
	const resPath = base64Img.imgSync(
		imageDataBase64,
		'/tmp/',
		`${tmpFileName}.${ext}`
	)

	const dim = width + 'x' + height

	console.log('converting', resPath, 'to', tmpConvertedFilePath)

	try {
		const convert = await spawn('convert', [
			resPath,
			'-thumbnail',
			`${dim}^`,
			`-gravity`,
			`center`,
			`-extent`,
			`${dim}`,
			tmpConvertedFilePath
		])
	} catch (err) {
		console.error('imageMagick error in uploadImage')
		console.error(err)
		throw new Error(err)
	}

	console.log('uploading to bucket at', bucketPath)
	return await bucket().upload(tmpConvertedFilePath, {
		destination: bucketPath
	})
}

module.exports = {
	uploadImage
}
