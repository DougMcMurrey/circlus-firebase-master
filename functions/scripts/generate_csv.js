const faker = require('faker')
const Papa = require('papaparse')

const rows = 20
let vals = []

const chance = (gen, chance) => {
	if (Math.random() * 100 > chance) return null
	return gen
}

const address = () =>
	[
		chance(faker.random.number(9999), 20),
		chance(faker.address.secondaryAddress(), 50),
		chance(faker.address.streetAddress(), 100),
		chance(faker.address.city(), 100),
		chance(faker.address.stateAbbr(), 100),
		chance(faker.address.zipCode(), 100),
		chance('USA', 10)
	].join(';')

for (i = 0; i < rows; i++) {
	vals.push({
		FIRST: chance(faker.name.firstName(), 95),
		LAST: chance(faker.name.lastName(), 95),
		MIDDLE: chance(faker.name.firstName(), 25),
		ASSOCIATED_EMAIL: chance(faker.internet.exampleEmail(), 90),
		EMAIL: chance(faker.internet.exampleEmail(), 75),
		PHONE: chance(faker.phone.phoneNumber(), 60),
		ADDRESS: chance(address(), 75) || ';;;;;;',
		TITLE: chance(faker.name.title(), 20),
		NICKNAME: chance(faker.name.firstName(), 20),
		URL: chance(faker.internet.url(), 30),
		DEPARTMENT: chance(faker.commerce.department(), 30),
		NOTE: chance(faker.lorem.sentence(), 30),
		GENDER: chance(faker.random.arrayElement(['M', 'F', 'O', 'U']), 20),
		PREFIX: chance(faker.name.prefix(), 30),
		SUFFIX: chance(faker.name.suffix(), 30),
		ORG: chance(faker.company.companyName(), 50),
		DEPARTMENT: chance(faker.commerce.department(), 25)
	})
}

const res = Papa.unparse(vals, {
	newline: '\n'
})

console.log(res)
