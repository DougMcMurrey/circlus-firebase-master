// const VCard = require("vcfer")
// const fs = require("fs")
// const path = require("path")
import VCard from "vcfer"
import fs from "fs"
import path from "path"

test("all data files valid", () => {
	const files = fs.readdirSync(path.join(__dirname, "/data/"))
	files.forEach(fname => {
		const file = fs.readFileSync(path.join(__dirname, "/data/", fname))
		expect(() => new VCard(file)).not.toThrow()
	})
})
