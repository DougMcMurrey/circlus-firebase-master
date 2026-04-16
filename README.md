# Circlus

- #### [Environment Variables](/devdocs/environment.md)
- #### [Node Scripts](/devdocs/scripts.md)
- #### [CSV Format](/devdocs/csv.md)
- #### [Writing Documentation](/devdocs/metadocs.md)

# Services used

## Google Suite

Domain registration and email hosting is done through Google Suite. The Firebase projects are registered through Google Suite.

## Firebase / Google Cloud Platform

The backbone of the project is Firebase, using:

- Authentication
- Firestore
- Storage
- Functions
- Hosting

There are two projects that I have set up:

- `circlus`: Production environment
- `circlus-development`: Development environment

## Stripe

All payment is handled through Stripe.

## Sendgrid

We send out templated emails through Sendgrid.
