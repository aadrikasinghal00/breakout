import { motion } from "framer-motion";
import { type CSSProperties } from "react";
import type { Theme } from "../themes";
import { glass } from "../glass";
import { MARK_ID, SURFACE_ID, contentIn, surfaceMorph } from "../morph";
import PanelMark, { type LogoDef } from "./PanelMark";

const velvet = { type: "spring", stiffness: 420, damping: 34, mass: 0.7 } as const;

const RECS = [
  { label: "Visitors View", tint: "linear-gradient(135deg,#3a3f66,#20233d)" },
  { label: "Live Conversation", tint: "linear-gradient(135deg,#4a3560,#241b3a)" },
];

const PlayGlyph = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor"><path d="M4.5 3.2v7.6a.5.5 0 0 0 .77.42l6-3.8a.5.5 0 0 0 0-.84l-6-3.8a.5.5 0 0 0-.77.42Z" /></svg>
);

/** A tile with a play button over a thumbnail (placeholder gradient for now). */
function VideoTile({ tint, radius, children, big = false }: { tint: string; radius: number; children?: React.ReactNode; big?: boolean }) {
  return (
    <div className="relative w-full overflow-hidden" style={{ background: tint, borderRadius: radius, aspectRatio: big ? "16 / 10" : "16 / 9" }}>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div whileHover={{ scale: 1.06 }} transition={velvet} className="flex items-center justify-center rounded-full bg-white/90 text-[#1a1a2e] backdrop-blur" style={{ width: big ? 44 : 28, height: big ? 44 : 28 }}>
          <PlayGlyph size={big ? 16 : 11} />
        </motion.div>
      </div>
      {children}
    </div>
  );
}

export default function VideoLibraryPanel({
  theme,
  logo,
  onClose,
  onMinimize,
}: {
  theme: Theme;
  logo?: LogoDef;
  onClose?: () => void;
  onMinimize?: () => void;
}) {
  const iconFilter = theme.iconDark ? "brightness(0) opacity(0.7)" : "none";
  const txt = { color: "var(--bo-text)" };
  return (
    <div className="flex flex-col items-center gap-[10px]" style={theme.vars as CSSProperties}>
      <div className="flex items-end gap-[8px]">
        <motion.div layoutId={MARK_ID} layout="position" layoutDependency={0} transition={surfaceMorph} className="shrink-0"><PanelMark logo={logo} /></motion.div>
        <motion.div layoutId={SURFACE_ID} layoutDependency={0} transition={{ layout: surfaceMorph }} className={`${theme.gradientStroke ? "glass-stroke" : ""} flex w-[620px] flex-col gap-[14px] p-[16px]`} style={glass(theme, "--bo-r-card", "--bo-blur-lg")}>
          <motion.div className="flex w-full flex-col gap-[14px]" layoutDependency={0} {...contentIn}>
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-[6px]" style={txt}>
                <PlayGlyph size={14} />
                <span className="text-[14px] font-medium leading-none">Product Tour</span>
              </div>
              <div className="flex items-center gap-[12px]">
                <button type="button" onClick={onMinimize} className="opacity-80 transition-opacity hover:opacity-100"><img src="/breakout/minimize.svg" alt="minimize" className="size-[14px]" style={{ filter: iconFilter }} /></button>
                <button type="button" onClick={onClose} className="opacity-80 transition-opacity hover:opacity-100"><img src="/breakout/close.svg" alt="close" className="size-[14px]" style={{ filter: iconFilter }} /></button>
              </div>
            </div>

            <div className="flex gap-[14px]">
              {/* Main tour video with a Start Tour pill */}
              <div className="relative min-w-0 flex-1">
                <div className="relative w-full overflow-hidden rounded-[10px]" style={{ background: "linear-gradient(135deg,#2b3055,#171a30)", aspectRatio: "16 / 10" }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.button type="button" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} transition={velvet} className="flex items-center gap-[8px] rounded-full bg-white/92 px-[16px] py-[9px] text-[13px] font-semibold text-[#1a1a2e] backdrop-blur">
                      <PlayGlyph size={13} /> Start Tour
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Recommendations column */}
              <div className="flex w-[186px] shrink-0 flex-col gap-[10px]">
                <span className="text-[12px] font-medium leading-none opacity-70" style={txt}>Recommendations</span>
                {RECS.map((r) => (
                  <button key={r.label} type="button" className="group flex flex-col gap-[6px] text-left">
                    <VideoTile tint={r.tint} radius={8} />
                    <span className="text-[12px] font-medium leading-none" style={txt}>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
