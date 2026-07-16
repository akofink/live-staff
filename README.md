# Live Staff

Live Staff is a free, client-side web app that listens to a monophonic instrument or voice and displays the detected concert pitch live.
The published demo validates local browser audio capture and pitch detection before staff notation and instrument transposition are added.

## Status

Published proof of concept: local microphone capture and concert-pitch detection.
Staff notation, instrument-aware written pitch, and transposition are the next milestones.

## Privacy

Microphone audio will be analyzed locally in the browser.
It will not be uploaded, recorded, or sent to a server.
No account or backend is planned for the core product.

## Requirements

- Node.js 22 or later
- A modern browser with Web Audio and `getUserMedia` support for the future listening experience

## Local Development

```sh
npm install
npm run dev
```

## Commands

```sh
npm run build
npm run lint
npm test
npm run evaluate:fixtures
```

`npm run evaluate:fixtures` writes the headless browser report to `test-results/fixture-evaluation.json`.

## Documentation

- [Product vision](docs/product-vision.md)
- [Product specification](docs/product-spec.md)
- [UX](docs/ux.md)
- [Architecture](docs/architecture.md)
- [Audio and pitch detection](docs/audio-and-pitch-detection.md)
- [Music theory and transposition](docs/music-theory-and-transposition.md)
- [Testing strategy](docs/testing-strategy.md)
- [Browser fixture evaluation](docs/browser-fixture-evaluation.md)
- [Release policy](docs/release-policy.md)
- [Roadmap](docs/roadmap.md)
- [Working flow](docs/working-flow.md)

## License

Live Staff is available under the [MIT License](LICENSE).

## Contributing and Support

See [CONTRIBUTING.md](CONTRIBUTING.md) to contribute.
See [SUPPORT.md](SUPPORT.md) for questions and general help.
Read [SECURITY.md](SECURITY.md) before reporting a security vulnerability.
