# Contributing to Live Staff

Thanks for considering a contribution.

## Before You Start

Open an issue before substantial work so the change can be aligned with the product's focused, client-side scope.
Do not add a backend, account system, audio upload, analytics, or large dependency without prior discussion.

## Development

Use Node.js 22 or later.

```sh
npm install
npm run dev
npm run lint
npm test
npm run build
```

## Pull Requests

- Keep each pull request focused and explain the user-facing or technical reason for the change.
- Add or update tests for domain logic and behavior changes.
- Update relevant documentation and ADRs when changing a product or architectural decision.
- Preserve the privacy guarantee: microphone audio stays on the device.
- Ensure `npm run lint`, `npm test`, and `npm run build` pass.

## Music Logic

Concert pitch is the canonical internal representation.
Keep transposition, spelling, stabilization, detection, and notation rendering independently replaceable.
See [AGENTS.md](AGENTS.md) and [the architecture documentation](docs/architecture.md) for the project boundaries.

## Code of Conduct

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).
