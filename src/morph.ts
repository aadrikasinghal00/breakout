/**
 * Shared-element identities for the view swap.
 *
 * The chat panel, the success card and the resting pod are all the SAME glass surface —
 * it just changes shape. The mark is the same disc — it just moves. Giving each a stable
 * `layoutId` lets Framer morph one into the other instead of tearing one view down and
 * popping the next one up.
 *
 * Three rules make this work, and all three were found the hard way:
 *
 * 1. The outgoing view must have NO `exit` animation. If both the old and the new element
 *    are alive at once, Framer crossfades them — and a crossfade is an opacity animation,
 *    which strips `backdrop-filter` off the glass for the whole morph (see the note above
 *    `anchor` in BreakoutWidget). Unmounting the old view in the same commit the new one
 *    mounts gives a pure projection morph, with the blur alive on every frame.
 *
 * 2. Framer projects layout with a transform SCALE, and it only undoes that scale on
 *    children that are themselves `layout` components. Morphing a 479x329 panel into a
 *    153x48 pill is a 3x horizontal and 7x vertical stretch, and without correction every
 *    descendant wears it. So each view wraps its content in `contentIn`, which is a
 *    `layout` element: Framer counter-scales it each frame, and only the glass box moves.
 *
 * 3. Every element in the morph needs `layoutDependency`. The pod's width is content-
 *    driven (`auto`), so by default Framer re-measures it on every render and re-targets
 *    the projection mid-flight. The morph then crawls — measured at 1.2s, and bulging
 *    wider than the chat panel on the way down. Pinning the measurement to the view makes
 *    it settle in ~500ms, monotonically. This one is invisible in the code and fatal to
 *    the feel; do not drop it.
 */
export const SURFACE_ID = "bo-surface";
export const MARK_ID = "bo-mark";

/** The morph itself: heavy enough to feel like the panel has mass, no overshoot. */
export const surfaceMorph = { type: "spring", stiffness: 320, damping: 36, mass: 0.85 } as const;

/**
 * The content of a view. `layout` earns the scale correction described above; the short
 * fade covers the swap from one view's contents to the next.
 */
export const contentIn = {
  layout: true,
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { opacity: { duration: 0.18, delay: 0.05, ease: [0.22, 1, 0.36, 1] }, layout: surfaceMorph },
} as const;
