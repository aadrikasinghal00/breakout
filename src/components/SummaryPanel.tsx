import { motion } from "framer-motion";
import { type CSSProperties } from "react";
import type { Theme } from "../themes";
import { glass } from "../glass";
import { MARK_ID, SURFACE_ID, contentIn, surfaceMorph } from "../morph";
import PanelMark, { type LogoDef } from "./PanelMark";

/** Summary of the current page/article (Figma 618:990). */
const SUMMARY = {
  title: "Breakout vs HubSpot Warmly: The Right Pipeline Tool for 2026 Insights",
  subtitle: "Demystifying your next pipeline tool choice.",
  points: [
    "Core Philosophy: Warmly serves as a visitor intelligence layer best suited for HubSpot-centric teams, whereas Breakout functions as an end-to-end platform handling identification, ICP scoring, routing, and meeting scheduling.",
    "Acquisition Uncertainty: Warmly's acquisition by a larger player leaves its roadmap — and your workflows — in flux.",
    "Total Cost: Breakout consolidates several point tools into one, so the effective per-seat cost lands lower once you account for what it replaces.",
  ],
};

const DocIcon = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 1.5H4.5A1.5 1.5 0 0 0 3 3v10a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 13 13V5.5L9 1.5Z" />
    <path d="M9 1.5V5.5H13M5.5 8.5h5M5.5 11h5" />
  </svg>
);

export default function SummaryPanel({
  theme,
  logo,
  onClose,
  onMinimize,
  onCta,
  cta,
}: {
  theme: Theme;
  logo?: LogoDef;
  onClose?: () => void;
  onMinimize?: () => void;
  onCta?: () => void;
  cta?: string;
}) {
  const iconFilter = theme.iconDark ? "brightness(0) opacity(0.7)" : "none";
  const txt = { color: "var(--bo-text)" };
  return (
    <div className="flex flex-col items-center gap-[10px]" style={theme.vars as CSSProperties}>
      <div className="flex items-end gap-[8px]">
        <motion.div layoutId={MARK_ID} layout="position" layoutDependency={0} transition={surfaceMorph} className="shrink-0"><PanelMark logo={logo} /></motion.div>
        <motion.div layoutId={SURFACE_ID} layoutDependency={0} transition={{ layout: surfaceMorph }} className={`${theme.gradientStroke ? "glass-stroke" : ""} flex w-[420px] flex-col gap-[16px] p-[16px]`} style={glass(theme, "--bo-r-card", "--bo-blur-lg")}>
          <motion.div className="flex w-full flex-col gap-[16px]" layoutDependency={0} {...contentIn}>
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-[6px]">
                <DocIcon color="var(--bo-text)" />
                <span className="text-[14px] font-medium leading-none" style={txt}>Summary</span>
              </div>
              <div className="flex items-center gap-[12px]">
                {cta && <button type="button" onClick={onCta} className="flex h-[28px] shrink-0 items-center whitespace-nowrap rounded-full px-[12px] text-[13px] font-medium leading-none transition-[filter] duration-200 hover:brightness-95" style={{ backgroundColor: "var(--bo-bubble)", ...txt }}>{cta}</button>}
                <button type="button" onClick={onMinimize} className="opacity-80 transition-opacity hover:opacity-100"><img src="/breakout/minimize.svg" alt="minimize" className="size-[14px]" style={{ filter: iconFilter }} /></button>
                <button type="button" onClick={onClose} className="opacity-80 transition-opacity hover:opacity-100"><img src="/breakout/close.svg" alt="close" className="size-[14px]" style={{ filter: iconFilter }} /></button>
              </div>
            </div>

            <div className="flex flex-col gap-[10px]">
              <h3 className="text-[16px] font-semibold leading-[1.3] tracking-[-0.16px]" style={txt}>{SUMMARY.title}</h3>
              <p className="text-[13px] leading-[1.45] opacity-70" style={txt}>{SUMMARY.subtitle}</p>
              <p className="pt-[2px] text-[13px] font-semibold" style={txt}>Key Points</p>
              <ul className="flex list-disc flex-col gap-[6px] pl-[18px] text-[13px] leading-[1.45] opacity-80 [&_li]:pl-[2px]" style={txt}>
                {SUMMARY.points.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
