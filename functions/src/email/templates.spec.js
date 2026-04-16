const fs = require('fs')
const path = require('path')
const { templates } = require('./email')

// this auto-generates tests for every template in the ./templates directory.
// auto-generated tests have no local variables for pug interpolation,
// so write more tests if you absolutely need to test those as well.

const source = path.resolve(__dirname, 'templates')

const dirs = fs
	.readdirSync(source)
	// .map(name => path.join(source, name))
	.filter(
		name =>
			fs.lstatSync(path.join(source, name)).isDirectory() && name !== 'css'
	)

for (const dir of dirs) {
	it(`render template: ${dir}`, async () => {
		await expect(templates.render(`${dir}/html`)).resolves.toBeDefined()
		return
	})
}
