import { motion } from "framer-motion";
import { type CSSProperties } from "react";
import type { Theme } from "../themes";
import type { NudgeType } from "./ConfigPanel";

// The nudge is a promotional card that layers ABOVE the fixed widget base.
// It never moves the base — it grows upward from the same anchored point.

const border: CSSProperties = { borderWidth: 1, borderStyle: "solid", borderColor: "var(--bo-border)" };
// NOTE: keep `style` OUT of `anim` — spreading `{...anim}` after `style={cardStyle}`
// would otherwise overwrite the whole style object (dropping bg + radius).
const cardStyle: CSSProperties = {
  ...border,
  backgroundColor: "var(--bo-fill)",
  backdropFilter: "blur(38px)",
  WebkitBackdropFilter: "blur(38px)",
  boxShadow: "var(--bo-shadow)",
  borderRadius: "var(--bo-r-card)",
  transformOrigin: "bottom center",
};

const anim = {
  initial: { opacity: 0, y: 12, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 10, scale: 0.97 },
  transition: { type: "spring", stiffness: 260, damping: 30, mass: 0.9 } as const,
};

const T = (extra?: CSSProperties): CSSProperties => ({ color: "var(--bo-text)", ...extra });

/** Ramp brand mark — the EXACT vector from Figma (node 330:1508), themed via
 *  --bo-text so it shows on light and dark cards. */
function RampMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 53.1 45.0001" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M53.1 44.7712V45H24.1433V44.7712C28.3455 42.4068 31.1724 40.0424 33.7701 37.5254H45.6889L53.1 44.7712ZM45.9945 7.16949L38.6599 0H38.4306C38.4306 0 38.5835 13.3475 26.2062 25.5508C14.1345 37.4492 0 37.5254 0 37.5254V37.7542L7.48748 45C7.48748 45 21.4692 45.1525 33.7701 33.0254C46.0709 21.0508 45.9945 7.16949 45.9945 7.16949Z" fill="var(--bo-text)" />
    </svg>
  );
}

function CloseX({ onClose, className }: { onClose?: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClose} className={`shrink-0 opacity-45 transition-opacity hover:opacity-90 ${className ?? ""}`}>
      <svg className="size-[14px]" viewBox="0 0 14 14" fill="none" stroke="var(--bo-text)" strokeWidth="1.6" strokeLinecap="round">
        <path d="M3 3l8 8M11 3l-8 8" />
      </svg>
    </button>
  );
}

const CaseLink = ({ text = "View Case Study →", onCta }: { text?: string; onCta?: () => void }) => (
  <button type="button" onClick={onCta} className="text-left text-[14px] font-medium leading-none tracking-[0.14px] opacity-100 transition-opacity duration-200 hover:opacity-70" style={T()}>
    {text}
  </button>
);

const TITLE = "How Ramp turned content readers into booked demos";

export default function NudgeCard({ type, theme, onCta, onClose }: { type: NudgeType; theme: Theme; onCta?: () => void; onClose?: () => void }) {
  const stroke = theme.gradientStroke ? "glass-stroke" : "";

  if (type === "visual") {
    return (
      <motion.div key="nudge" className={`${stroke} relative w-[343px] overflow-hidden`} style={cardStyle} {...anim}>
        <img src="/breakout/nudge-photo.png" alt="" className="pointer-events-none absolute inset-0 size-full object-cover" />
        <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.62) 100%)", backdropFilter: "blur(1px)" }} />
        <CloseX onClose={onClose} className="absolute right-[9px] top-[9px] z-10" />
        <div className="relative flex h-[216px] flex-col justify-end p-[16px]">
          <div className="flex items-center gap-[16px] pr-[8px]">
            <div className="flex flex-1 flex-col gap-[10px]" style={{ color: "#fff" }}>
              <p className="text-[14px] font-medium capitalize leading-[1.3] tracking-[0.28px]">{TITLE}</p>
              <button type="button" onClick={onCta} className="text-left text-[14px] font-medium leading-none tracking-[0.14px] transition-opacity duration-200 hover:opacity-70">View Case Study →</button>
            </div>
            <RampMark className="h-[38px] w-[45px] shrink-0" />
          </div>
        </div>
      </motion.div>
    );
  }

  if (type === "mediatop") {
    return (
      <motion.div key="nudge" className={`${stroke} relative flex w-[343px] flex-col overflow-hidden`} style={cardStyle} {...anim}>
        {/* multimedia element ON TOP (not background) — frame 496:183 */}
        <div className="relative p-[6px] pb-0">
          <img src="/breakout/nudge-photo.png" alt="" className="h-[132px] w-full rounded-[10px] object-cover" />
          <CloseX onClose={onClose} className="absolute right-[12px] top-[12px] z-10" />
        </div>
        <div className="relative flex items-center gap-[16px] px-[16px] pb-[20px] pt-[12px]">
          <div className="flex flex-1 flex-col gap-[10px]" style={T()}>
            <p className="w-[215px] text-[14px] font-medium capitalize leading-[1.3] tracking-[0.28px]">{TITLE}</p>
            <button type="button" onClick={onCta} className="text-left text-[14px] font-medium leading-none tracking-[0.14px] transition-opacity duration-200 hover:opacity-70">View Case Study →</button>
          </div>
          <RampMark className="h-[38px] w-[45px] shrink-0" />
        </div>
      </motion.div>
    );
  }

  if (type === "text") {
    return (
      <motion.div key="nudge" className={`${stroke} relative flex w-[389px] flex-col gap-[12px] overflow-hidden px-[16px] pb-[20px] pt-[16px]`} style={cardStyle} {...anim}>
        <CloseX onClose={onClose} className="absolute right-[12px] top-[12px] z-10" />
        <div className="relative flex flex-col gap-[16px] pr-[16px]">
          <div className="flex flex-col gap-[6px]">
            <p className="text-[14px] font-medium capitalize leading-[1.3] tracking-[0.28px]" style={T()}>{TITLE}</p>
            <p className="text-[14px] leading-[1.3] tracking-[0.28px]" style={T({ opacity: 0.7 })}>Ramp added Northwind to its blog and converted passive readers into pipeline — without a single gated PDF.</p>
          </div>
          <CaseLink onCta={onCta} />
        </div>
      </motion.div>
    );
  }

  if (type === "testimonial") {
    return (
      <motion.div key="nudge" className={`${stroke} relative flex w-[389px] flex-col overflow-hidden`} style={cardStyle} {...anim}>
        <div className="relative flex flex-col gap-[8px] p-[16px]">
          <p className="pr-[18px] text-[16px] leading-[1.3] tracking-[0.32px]" style={T()}>“Our blog finally pulls its weight – readers ask, get answers, and book.”</p>
          <CloseX onClose={onClose} className="absolute right-[10px] top-[10px]" />
        </div>
        <div className="flex justify-center px-[16px]"><div className="h-[2px] w-[18px] rounded-full opacity-30" style={{ background: "var(--bo-text)" }} /></div>
        <div className="flex flex-col px-[16px] pb-[20px] pt-[12px]">
          <div className="flex items-center gap-[8px]">
            <img src="/breakout/nudge-avatar.png" alt="" className="size-[36px] shrink-0 rounded-full object-cover" />
            <div className="flex flex-1 flex-col gap-[8px]" style={T()}>
              <p className="text-[14px] font-medium capitalize leading-none tracking-[0.28px]">Alex Chen ⋅ VP Growth, Ramp</p>
              <button type="button" onClick={onCta} className="text-left text-[14px] font-medium leading-none tracking-[0.14px] transition-opacity duration-200 hover:opacity-70">View Case Study →</button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (type === "multi") {
    return (
      <motion.div key="nudge" className={`${stroke} relative flex w-[357px] flex-col gap-[16px] overflow-hidden px-[16px] pb-[20px] pt-[16px]`} style={cardStyle} {...anim}>
        <CloseX onClose={onClose} className="absolute right-[12px] top-[12px] z-10" />
        <div className="relative flex flex-col gap-[12px] pr-[16px]">
          <p className="text-[14px] font-medium capitalize leading-[1.3] tracking-[0.28px]" style={T()}>{TITLE}</p>
          <div className="flex items-center gap-[10px]">
            <button type="button" onClick={onCta} className="relative flex h-[30px] items-center justify-center overflow-hidden rounded-[36px] px-[14px] text-[14px] font-medium capitalize leading-none tracking-[0.14px] transition-[filter] duration-200 hover:brightness-95" style={{ ...border, backgroundColor: "var(--bo-sec-hover)", ...T() }}>Read More →</button>
            <button type="button" onClick={onCta} className="text-[14px] font-medium capitalize leading-none tracking-[0.14px] transition-opacity duration-200 hover:opacity-70" style={T()}>View Related</button>
          </div>
        </div>
      </motion.div>
    );
  }

  // default: "card" — compact single row (no "Customer Story" label; frame 483:534)
  return (
    <motion.div key="nudge" className={`${stroke} relative flex w-[343px] items-center gap-[16px] overflow-hidden px-[16px] pb-[20px] pt-[16px]`} style={cardStyle} {...anim}>
      <CloseX onClose={onClose} className="absolute right-[12px] top-[12px] z-10" />
      <div className="flex flex-1 flex-col gap-[10px]" style={T()}>
        <p className="w-[215px] text-[14px] font-medium capitalize leading-[1.3] tracking-[0.28px]">{TITLE}</p>
        <button type="button" onClick={onCta} className="text-left text-[14px] font-medium leading-none tracking-[0.14px] transition-opacity duration-200 hover:opacity-70">View Case Study →</button>
      </div>
      <RampMark className="h-[38px] w-[45px] shrink-0" />
    </motion.div>
  );
}
