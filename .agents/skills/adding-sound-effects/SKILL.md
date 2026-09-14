---
name: adding-sound-effects
description: Adds and reviews Foley interaction sounds in the Today app. Use when creating or changing interactive components, forms, navigation, async actions, notifications, or sound settings.
---

# Adding sound effects

Use `@foleyjs/react` for every UI sound. Foley synthesizes its cues with Web Audio; do not add audio assets or another audio engine.

## Start with the owning component

1. Identify the interaction's reusable owner before editing a feature.
2. Put common feedback in `src/components/ui`: `Button` owns click feedback and `Input` owns typing feedback.
3. Extend a shared component's sound API when the behavior applies to every instance of a component category.
4. Keep a cue at the feature call site only when its meaning depends on that feature's state or async result.

Use declarative `data-foley-*` attributes when Foley supports the event. Do not add event listeners for sounds those attributes already cover. `bind()` is called once by `SoundEffects`; never call it from individual components or after a render.

## Choose restrained semantic cues

| Interaction | Cue |
| --- | --- |
| Ordinary button/link activation | `tap` |
| Toggle changing state | `on` / `off` via `data-foley-toggle` |
| Text entry | `thock` via `data-foley-type` |
| Day, page, or panel navigation | `swoosh` or `whoosh` |
| Todo completed or async save succeeded | `success` |
| Todo deleted or item removed | `drop` |
| Validation or async failure | `error` |
| Blocked action | `denied` |
| Incoming lightweight notification | `ping` |
| Long task completed | `complete` |

Prefer one meaningful cue per action. Do not stack a generic click cue with a semantic outcome cue. Pass `sound={false}` to `Button` when the feature will play a result cue after an async operation.

Play success cues only after an async operation resolves, and play `error` when it rejects. Immediate navigation and toggle cues can remain declarative. Do not delay an operation or navigation so a cue can finish.

## Respect sound preferences

`src/components/sound-effects.tsx` owns Foley initialization and the persisted mute preference. Keep one app-wide `useFoley()` call. Every new cue must pass through Foley so mute, volume, theme, localization, cooldown, and limiting continue to apply.

Do not autoplay on page load. Do not add custom throttling. Foley already enforces a 60 ms per-cue cooldown and master limiting. Use the built-in `soft` theme unless the app adopts an exported Foley sound set.

## Verify changes

1. Run `pnpm build`.
2. Inspect rendered controls for the expected `data-foley-*` attributes.
3. Exercise pointer and keyboard activation, semantic async success/failure where practical, and mute persistence after reload.
4. Check that one interaction does not accidentally emit multiple cues.

For Foley API details or a cue not covered here, read the current guidance at `https://usefoley.dev/agents.md`.
