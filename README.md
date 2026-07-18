# Live Staff

Try the production site at [live-staff.akofink.com](https://live-staff.akofink.com/).

Live Staff is a free, client-side web app that listens to one dominant sustained instrument or voice and displays stable, instrument-aware notation live.
The published app includes local microphone capture, written-pitch transposition, a persistent grand staff, a bounded 10-second pitch history, room calibration, optional signal diagnostics, and bounded input filters.

## Status

The monophonic microphone-to-staff experience is shipped through the interactive filter chain in PR #65.
The in-repository autocorrelation detector remains a proof of concept over a 55 to 1,000 Hz range, not a production-grade guarantee for every instrument, room, or browser.
Current 1.0 work is detector evidence, lifecycle recovery, the offline contract, and real-device and accessibility validation; polyphony and source association remain deferred.

## Privacy

Microphone audio is analyzed locally in the browser.
It is not uploaded, recorded, or sent to a server.
No account or backend is planned for the core product.

## Requirements

- Node.js 22 or later
- A modern browser with Web Audio and `getUserMedia` support for listening

## Local Development

```sh
npm ci
npm run dev
```

## Commands

```sh
npm run build
npm run lint
npm test
npm run test:privacy
npm run verify:privacy
npm run evaluate:fixtures
npm run evaluate:performance
```

`npm run build` includes the production entry-JavaScript budget check.
Run `npm run verify:privacy` after building `dist`.
`npm run evaluate:fixtures` writes the headless browser report to `test-results/fixture-evaluation.json` but does not yet enforce detector accuracy thresholds.

The production build serves assets from the custom-domain root.
Set `VITE_BASE_PATH` only when building for a non-root deployment path.

## Documentation

- [Product vision](docs/product-vision.md)
- [Product specification](docs/product-spec.md)
- [UX](docs/ux.md)
- [Architecture](docs/architecture.md)
- [Audio and pitch detection](docs/audio-and-pitch-detection.md)
- [Room-noise calibration](docs/room-noise-calibration.md)
- [Input filter chain](docs/input-filter-chain-design.md)
- [Browser-only multi-pitch feasibility](docs/multi-pitch-feasibility.md)
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
