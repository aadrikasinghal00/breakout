import { motion } from "framer-motion";
import { useRef, useState } from "react";

/**
 * Animated agent mark (Figma 622:1875, option D) — a pinwheel of six oval petals.
 * At rest it holds the design's resting position, perfectly still. On hover it runs
 * ONE eased cycle in which BOTH motions happen together: the whole pinwheel orbits a
 * full 360° in one direction, AND each petal simultaneously turns 360° about its own
 * centre. Both complete on the same beat, then stop. No looping.
 * Petals fill with `currentColor`, so drop it on any disc/background.
 */
export default function AgentIcon({
  size = 24,
  count = 6,
  spin = 1.3,
  className = "",
}: {
  size?: number;
  count?: number;
  spin?: number; // seconds for the hover cycle
  className?: string;
}) {
  const [turns, setTurns] = useState(0);
  const busy = useRef(false);
  // One cycle per hover; ignore re-enters until the current turn finishes.
  const play = () => {
    if (busy.current) return;
    busy.current = true;
    setTurns((t) => t + 1);
  };

  const R = 11; // ring radius
  const RX = 2.6; // petal half-width
  const RY = 5; // petal half-height
  const TILT = 52; // pinwheel tilt off the radial
  const step = 360 / count;
  const cycle = { duration: spin, ease: [0.45, 0, 0.55, 1] as const }; // ease-in-out

  return (
    <motion.div
      className={className}
      onMouseEnter={play}
      // The whole figure orbits one full turn per hover.
      animate={{ rotate: turns * 360 }}
      transition={cycle}
      onAnimationComplete={() => { busy.current = false; }}
      // pointerEvents:auto so it still receives hover inside a pointer-events-none mark
      style={{ width: size, height: size, display: "block", pointerEvents: "auto" }}
    >
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ display: "block", overflow: "visible" }} aria-hidden>
        {Array.from({ length: count }).map((_, i) => (
          // Static <g>: seats the petal in its slot on the ring.
          <g key={i} transform={`rotate(${i * step} 20 20)`}>
            <motion.ellipse
              cx="20"
              cy={20 - R}
              rx={RX}
              ry={RY}
              fill="currentColor"
              // fill-box origin → the petal also turns about its own geometric centre,
              // in step with the orbit above.
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
              initial={{ rotate: TILT }}
              animate={{ rotate: TILT + turns * 360 }}
              transition={cycle}
            />
          </g>
        ))}
      </svg>
    </motion.div>
  );
}
