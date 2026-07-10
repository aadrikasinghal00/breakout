import { motion } from "framer-motion";
import { type CSSProperties } from "react";
import type { Theme } from "../themes";
import { glass } from "../glass";
import { MARK_ID, SURFACE_ID, contentIn, surfaceMorph } from "../morph";

const velvet = { type: "spring", stiffness: 420, damping: 34, mass: 0.7 } as const;

export default function SuccessCard({
  theme,
  logo,
  detail = "Your meeting is booked for 24th July at 04:00PM",
  onClose,
  onContinue,
}: {
  theme: Theme;
  logo?: { src: string; bg?: string; pad?: string };
  detail?: string;
  onClose?: () => void;
  onContinue?: () => void;
}) {
  const L = logo ?? theme.logo;
  return (
    <div className="flex flex-col items-center gap-[10px]" style={theme.vars as CSSProperties}>
      <div className="flex items-end gap-[8px]">
        {/* Mark and surface are shared with the pod and the chat — they morph, never pop. */}
        <motion.div layoutId={MARK_ID} layout="position" layoutDependency={0} transition={surfaceMorph} className="relative size-[40px] shrink-0 overflow-hidden rounded-[56.25px]" style={{ boxShadow: "var(--bo-shadow)" }}>
          {L.bg ? (<div className="absolute inset-0 flex items-center justify-center" style={{ background: L.bg }}><img src={L.src} alt="" className="size-full object-contain" style={{ padding: L.pad ?? "26%" }} /></div>) : (<img src={L.src} alt="" className="absolute inset-0 size-full object-contain" />)}
          <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0px_-2px_3px_0px_rgba(255,255,255,0.2),inset_0px_2px_3px_0px_rgba(255,255,255,0.2)]" />
        </motion.div>

        <motion.div layoutId={SURFACE_ID} transition={{ layout: surfaceMorph }} className={`${theme.gradientStroke ? "glass-stroke" : ""} relative w-[300px] px-[20px] py-[28px]`} style={glass(theme, "--bo-r-card", "--bo-blur-lg")}>
          <motion.div className="flex w-full flex-col items-center gap-[10px]" {...contentIn}>
            <button type="button" onClick={onClose} className="absolute right-[12px] top-[12px] opacity-70 transition-opacity hover:opacity-100"><img src="/breakout/close.svg" alt="close" className="size-[14px]" style={{ filter: theme.iconDark ? "brightness(0) opacity(0.7)" : "none" }} /></button>

            <motion.div className="flex size-[44px] items-center justify-center rounded-full" style={{ backgroundColor: "var(--bo-primary-fill)" }} initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 340, damping: 18, delay: 0.1 }}>
              <svg className="size-[22px]" viewBox="0 0 24 24" fill="none" stroke="var(--bo-primary-text)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
            </motion.div>

            <p className="mt-[2px] text-[15px] font-semibold" style={{ color: "var(--bo-text)" }}>Congratulations!</p>
            <p className="max-w-[220px] text-center text-[13px] leading-[1.45] opacity-60" style={{ color: "var(--bo-text)" }}>{detail}</p>

            <motion.button type="button" onClick={onContinue} className="mt-[4px] flex items-center gap-[6px] px-[16px] py-[8px] text-[14px] font-medium transition-[filter] duration-200 hover:brightness-95" style={{ backgroundColor: "var(--bo-primary-fill)", color: "var(--bo-primary-text)", borderRadius: "var(--bo-r-btn)" }} whileTap={{ scale: 0.97 }} transition={velvet}>
              Continue <span className="opacity-80">→</span>
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
