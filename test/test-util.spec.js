const testUtil = require("./test-util")

test("loadCard", () => {
	expect(testUtil.loadCard("john-doe")).toBeTruthy()
})
