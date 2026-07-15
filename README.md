# Live Staff

Live Staff is a free, client-side web app that will listen to a monophonic instrument or voice and display the detected pitch as notation for the selected instrument.
It emphasizes written notation and the relationship between written and concert pitch, rather than precision tuning.

## Status

Milestone 0: repository bootstrap.
The app shell and portable pitch-domain foundation are in place; microphone capture, pitch detection, transposition, and staff rendering are the next technical spike.

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
```

## Documentation

- [Product vision](docs/product-vision.md)
- [Product specification](docs/product-spec.md)
- [UX](docs/ux.md)
- [Architecture](docs/architecture.md)
- [Audio and pitch detection](docs/audio-and-pitch-detection.md)
- [Music theory and transposition](docs/music-theory-and-transposition.md)
- [Testing strategy](docs/testing-strategy.md)
- [Roadmap](docs/roadmap.md)

## License

License selection is intentionally deferred until the intended open-source posture is decided.
