# User Experience

## First Run

The first screen explains the value in one sentence and provides a prominent Start listening action beside the listening state.
Instrument and background-hum controls are available in a collapsed Settings disclosure.
Instrument selection determines the primary notation: concert instruments use concert notation and transposing instruments use their written notation.
It remains available while listening so the current text and staff update immediately without restarting capture.
It states clearly that audio remains on the device.

## Listening States

- Before permission: instrument selection and an explicit Start listening action.
- Active without a stable note: a calm waiting state that does not flicker through guesses.
- Active with a stable note: a persistent grand staff with one readable note on its treble or bass staff and an optional compact concert-pitch reference for transposing instruments.
- Failure: a concise explanation with a recovery action for denied permission, unavailable input, or unsupported browser behavior.

## Main Screen

The primary visual hierarchy is compact header, listening control, large staff, current note, a secondary 10-second recent-note strip, and compact settings.
Frequency, cents, and confidence are secondary to notation.
Recent notes represent committed stable-note onsets and durations rather than raw detector updates, and the active note is identified as now.

## Responsive Behavior

The persistent grand staff and primary control must remain prominent on a 320 px wide phone.
Secondary detail may stack beneath the staff rather than compete with it.
The recent-note strip clips to the available width without horizontal page scrolling.
Desktop and tablet layouts may place settings or privacy details beside the main notation.

## Accessibility

All controls must be keyboard operable and have accessible names.
The detected note, pitch display, and active treble or bass staff must be represented in text as well as graphics.
Listening and error state should be announced appropriately without overwhelming screen-reader users.
Respect reduced-motion preferences and do not communicate state by color alone.

## Conceptual Wireframe

```text
Live Staff

[ Start listening ]

       [ persistent grand staff ]

Written: C5
[ Pitch reference: Concert B-flat4 ]
Listening: Stable

[ Settings: Concert pitch ]
```
