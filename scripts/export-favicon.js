const child_process = require('child_process')
const fs = require('fs')
const path = require('path')

const FAVICON_SIZES = [196, 192, 180, 167, 152, 128, 64, 32, 16]
const LOGO_SIZES = [512, 192]

const manifest = {
	short_name: 'Circlus',
	name: 'Circlus',
	icons: [],
	start_url: '.',
	display: 'standalone',
	theme_color: '#ff7f50',
	background_color: '#ffffff'
}

const exportIcon = ({
	name,
	size,
	sizes,
	ext,
	appendSize,
	type,
	html,
	path: _path
}) => {
	const fileName = `${name}${appendSize ? size : ''}.${ext}`

	const filePath = path.join(_path || '', fileName)

	child_process.execSync(
		`convert media/favicon.psd -background none -layers merge ` +
			`-resize ${size}x${size} ` +
			path.join('public/', filePath)
		// `public${path || '/'}${fileName}`
	)
	manifest.icons.push({
		src: filePath,
		type,
		sizes: sizes || `${size}x${size}`
	})
	console.log(
		html
			? `<link rel="icon" href="%PUBLIC_URL%/${filePath}" sizes="${size}x${size}" />`
			: `Created ${fileName}`
	)
}

exportIcon({
	name: 'favicon',
	size: 64,
	appendSize: false,
	sizes: '64x64 32x32 24x24 16x16',
	ext: 'ico',
	type: 'image/x-icon',
	html: true
})

FAVICON_SIZES.forEach(size =>
	exportIcon({
		name: 'favicon-',
		size,
		appendSize: true,
		ext: 'ico',
		type: 'image/x-icon',
		html: true
	})
)

LOGO_SIZES.forEach(size =>
	exportIcon({
		name: 'logo-',
		size,
		appendSize: true,
		ext: 'png',
		type: 'image/png'
	})
)

exportIcon({
	name: 'logo',
	size: 64,
	appendSize: false,
	ext: 'png',
	type: 'image/png',
	path: '/docs/_media'
})

fs.writeFileSync(
	path.join(__dirname, '../public/manifest.json'),
	JSON.stringify(manifest, null, 2)
)
