const { templates, mailer, sendEmail } = require('../src/email/email')

const main = async () => {
	clubName = 'Potato Club'
	try {
		await sendEmail(
			'darrell.bergnaum@ethereal.email',
			'delete_club',
			`Delete ${clubName}`,
			{
				clubName,
				club: '234gdf8g9',
				deleteKey: 'sakdjfsdkhfaskdfhaksjhdfksajhfkjashfkjasfkajhsf'
			}
		)
	} catch (err) {
		throw err
	}
}

main()
