module.exports = {
	'env': {
		'browser': true,
		'es2021': true,
		'node': true,
	},
	'extends': 'google',
	'overrides': [
		{
			'env': {
				'node': true,
			},
			'files': [
				'.eslintrc.{js,cjs}',
			],
			'parserOptions': {
				'sourceType': 'script',
			},
		},
	],
	'parserOptions': {
		'ecmaVersion': 'latest',
		'sourceType': 'module',
	},
	'rules': {
		'no-tabs': 'off',
		'indent': ['error', 'tab'], // Bc I like tabs :P
		'linebreak-style': 'off', // Bc why?
		'no-unused-vars': 'warn',
		'no-console': 'error',
	},
};
