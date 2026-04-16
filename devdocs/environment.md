# Environment Variables

## React App

The React app has no environment variables that aren't being tracked by git. You don't need to set any.

## Functions Directory

There are a number of environment variables set. By using `npm run setup`, many of these Env variables are set into firebase's function config.

```json
{
	"sendgrid": {
		"key": "<SENDGRID_KEY>"
	},
	"website": {
		"url": "<WEBSITE_URL>",
		"disable_signup": "<DISABLE_SIGNUP>"
	},
	"stripe": {
		"club_product_id": "<set elsewhere>",
		"club_plan_id": "<set elsewhere>",
		"key": "<STRIPE_KEY>",
		"endpoint_key": "<STRIPE_ENDPOINT_KEY>"
	},
	"jwt": {
		"key": "<JWT_KEY>"
	},
	"fb": {
		"key": "<FIREBASE_KEY>"
	},
	"env": {
		"env": "<ENV>"
	}
}
```

### `GOOGLE_APPLICATION_CREDENTIALS`

Location of the firebase applications credentials file. Probably either `"./admin-key.development.json"` or `"./admin-key.production.json"` (relative to the `functions` directory)

> Default: `"./admin-key.json"`

### `WEBSITE_URL`

The location the React frontend is hosted at. Used in various places.

> Default: `http://localhost:3000/

### `DISABLE_SIGNUP`

When this value is `true`, any new accounts registered will be automatically disabled. They can be individually re-enabled through the firebase console.

### `ENV`

A mirror of `NODE_ENV` That should be either `development` or `production`

### `STRIPE_KEY`

The secret Stripe API key.

### `STRIPE_ENDPOINT_KEY`

Signing key for our Stripe Webhook endpoint (?)

### `FIREBASE_KEY`

The secret Firebase access key. Generate with:

```
firebase login:ci
```

### `SENDGRID_KEY`

The secret Sendgrid API key.

### `JWT_KEY`

Our key for signing JWT tokens. Can be any string, but should be cryptographically secure.
