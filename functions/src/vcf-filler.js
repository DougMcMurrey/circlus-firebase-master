module.exports.gump = JSON.stringify([
	'vcard',
	[
		['version', {}, 'text', '4.0'],
		['n', {}, 'text', ['Gump', 'Forrest', '', '', '']],
		['fn', {}, 'text', 'Forrest Gump'],
		['org', {}, 'text', 'Bubba Gump Shrimp Co.'],
		['title', {}, 'text', 'Shrimp Man'],
		[
			'photo',
			{ mediatype: 'image/gif' },
			'text',
			'http://www.example.com/dir_photos/my_photo.gif'
		],
		[
			'tel',
			{ type: ['work', 'voice'], value: 'uri' },
			'uri',
			'tel:+11115551212'
		],
		[
			'tel',
			{ type: ['home', 'voice'], value: 'uri' },
			'uri',
			'tel:+14045551212'
		],
		[
			'adr',
			{
				type: 'work',
				label:
					'"100 Waters Edge\\nBaytown, LA 30314\\nUnited States of America"'
			},
			'text',
			[
				'',
				'',
				'100 Waters Edge',
				'Baytown',
				'LA',
				'30314',
				'United States of America'
			]
		],
		[
			'adr',
			{
				type: 'home',
				label:
					'"42 Plantation St.\\nBaytown, LA 30314\\nUnited States ofAmerica"'
			},
			'text',
			[
				'',
				'',
				'42 Plantation St.',
				'Baytown',
				'LA',
				'30314',
				'United States of America'
			]
		],
		['email', {}, 'text', 'forrestgump@example.com'],
		['rev', {}, 'text', '20080424T195243Z']
	]
])

module.exports.blank = JSON.stringify([
	'vcard',
	[
		['version', {}, 'text', '4.0'],
		['n', {}, 'text', ['', '', '', '', '']],
		['fn', {}, 'text', ''],
		['org', {}, 'text', '']
	]
])
