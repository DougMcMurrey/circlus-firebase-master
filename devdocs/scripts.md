# React App Scripts

> as of 3/24/2020, tests haven't been written in a while.

### `start`

Start the development version of the application on [localhost](http://localhost:3000) at port 3000

## `build`

Build the production version of the application. Uses `NODE_ENV=production`

## `test`

Runs jest.

## `eject`

Eject the application. Warning! Don't do this.

## `prettierify`

Format all files in `src/**/*` with Prettier.

## `export-favicon`

Use ImageMagick to automatically generate all favicons, and update `public/manifest.json`

## `deploy`

Runs the deploy script.

## Functions Directory Scripts

## `lint`

Run eslint on functions directory.

## `format`

Format all files in `src/**/*` with Prettier.

## `serve`

Run the firebase emulator for only functions.

## `shell`

Open the functions shell.

## `start`

Open the functions shell.

## `deploy`

run `firebase deploy --only functions`

## `logs`

Get the current function logs.

## `jest`

Run jest.

## `jest:watch`

Run jest in verbose mode.

## `test`

Run the function emulators, and jest.

## `test:watch`

Run the function emulators, and jest in watch mode.

## `test:debug`

Run function emulators with debug.

## `test-email-send`

Run `testing/testEmails.js`

## `test:email`

Run jest on email templates.

## `cli`

Open the Circlus CLI, which houses a couple of random utility commands. More can easily be added. (Uses [Vorpal](https://vorpal.js.org/))

- `help <command>` Get detailed help info on a command.
- `create <user> <name>` creates a club for given user UID with specified name.
- `delete <clubId>` Deletes a given club id and cancels its payment.
- `csv [rows]` Generate rows of random CSV data. defaults to 20.

## `setup`

Run the setup script. This one is important, because it's used to set firebase's function config from your `.env` files. Run it with a setter for `NODE_ENV` like so:

```
NODE_ENV=production npm run setup
```

## `setup:unset-products`

Unset the stripe product and plan ids in the firebase function config.
