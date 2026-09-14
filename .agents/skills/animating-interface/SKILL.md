---
name: animating-interface
description: Defines how Today uses tw-animate-css and Motion for snappy, whimsical, accessible interface animation. Use when adding, changing, or reviewing UI components and interactions in this repository.
---

# Animating the Today interface

Make Today feel responsive and lightly playful without delaying the user's work.

## Decide whether to animate

Animate when motion provides at least one of these benefits:

- Acknowledges an interaction such as pressing, completing, postponing, or deleting.
- Explains where content entered, exited, or moved.
- Preserves spatial context during date or view navigation.
- Softens the appearance of transient UI such as cards, menus, or alerts.

Do not animate static decoration, routine text changes that are already obvious, or every nested element in the same transition. Prefer one clear motion cue over several competing effects.

## Put motion at the owning boundary

1. Put universal interaction feedback in the shared component. Buttons own hover and press feedback; inputs own focus feedback; cards own their entrance.
2. Put state and lifecycle motion in the domain component. `TodoItem` owns completion, postponement, insertion, deletion, and layout movement.
3. Use a one-off animation at the call site only when the surrounding context owns its meaning. If a view transition is necessary, animate the whole view as one unit rather than its sections independently.
4. Before adding a call-site class or `motion` prop, check whether every use of that component should behave the same way. If yes, move it into the component.

## Choose the tool

- Use Tailwind transitions for hover, focus, press, color, opacity, and small transforms. Only icon buttons scale; full-size buttons use color changes.
- Use `tw-animate-css` for simple mount or unmount effects that do not coordinate layout or React state.
- Use `motion/react` for `AnimatePresence`, spring feedback, layout animation, coordinated state changes, and directional transitions.
- Use `MotionConfig reducedMotion="user"` at the app root. Add `motion-safe:` to CSS animation and transform utilities.

Do not recreate Motion presence or layout behavior with custom keyframes. Do not add a shared animation abstraction until at least two components need the same coordinated behavior.

## Timing and character

- Keep direct feedback around 80–120 ms.
- Keep entrances and exits around 120–180 ms.
- Use a short ease-out transition for completion and layout movement. Use a spring only when its settling time stays within the interaction's timing budget, and avoid visible bounce.
- Keep movement small: roughly 1–2 px for state feedback and 2–6 px for entrances or exits.
- Keep icon-button scale changes around 0.97–1.03 and centered on both axes. Do not translate controls on hover.
- Default to no animation when switching days. If spatial context becomes necessary, transition the entire day view as one unit.
- Prefer opacity plus one transform. Avoid long easing, large travel, repeated bounce, or motion that blocks input.

## Preserve behavior and accessibility

- Keep semantic elements, focus behavior, keyboard operation, and accessible names unchanged.
- Never delay a mutation or navigation solely to let an animation finish.
- Ensure the final visual state does not depend on animation completion.
- Reduced-motion mode must remove nonessential translation, scale, and spring movement while leaving state changes clear.
- Avoid layout shifts, clipped focus rings, and animated wrappers that change the document semantics.

## Verify changes

1. Run `pnpm build`.
2. Exercise each affected interaction in the browser, including entrance, active state, exit, and rapid repeat input where relevant.
3. Check browser console and page errors.
4. Repeat representative interactions with reduced motion enabled.
5. Capture and inspect representative rendered states when appearance changes.

Judge the result by response and clarity: the UI should react immediately, communicate what changed, and settle before it distracts from the next action.
