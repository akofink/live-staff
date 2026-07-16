# User Experience

## First Run

The first screen explains the value in one sentence and provides a prominent Start listening action beside the listening state.
Instrument, pitch-display, and background-hum controls are available in a collapsed Settings disclosure.
It states clearly that audio remains on the device.

## Listening States

- Before permission: instrument selection and an explicit Start listening action.
- Active without a stable note: a calm waiting state that does not flicker through guesses.
- Active with a stable note: a large staff note with readable written and optional concert labels.
- Failure: a concise explanation with a recovery action for denied permission, unavailable input, or unsupported browser behavior.

## Main Screen

The primary visual hierarchy is compact header, listening control, large staff, current note, secondary details, and compact settings.
Frequency, cents, and confidence are secondary to notation.

## Responsive Behavior

The staff and primary control must remain prominent on a 320 px wide phone.
Secondary detail may stack beneath the staff rather than compete with it.
Desktop and tablet layouts may place settings or privacy details beside the main notation.

## Accessibility

All controls must be keyboard operable and have accessible names.
The detected note must be represented in text as well as graphics.
Listening and error state should be announced appropriately without overwhelming screen-reader users.
Respect reduced-motion preferences and do not communicate state by color alone.

## Conceptual Wireframe

```text
Live Staff

[ Start listening ]

             [ staff and note ]

Written: C5
Concert: B-flat4
Listening: Stable

[ Settings: Concert pitch ]
```
