import { motion } from "framer-motion";
import { type CSSProperties } from "react";
import type { Theme } from "../themes";
import type { NudgeType } from "./ConfigPanel";
import { glass, glassEdge } from "../glass";

// The nudge is a promotional card that layers ABOVE the fixed widget base.
// It never moves the base — it grows upward from the same anchored point.

// NOTE: keep `style` OUT of `anim` — spreading `{...anim}` after `style={cardStyle(theme)}`
// would otherwise overwrite the whole style object (dropping bg + radius).
// Large surface → the 95 (→47.5px) blur, matching the chat + suggestion panels.
const cardStyle = (theme: Theme): CSSProperties => ({
  ...glass(theme, "--bo-r-card", "--bo-blur-lg"),
  transformOrigin: "bottom center",
});

// Glass surface → scale/travel only, never opacity (see `grow` in BreakoutWidget).
const anim = {
  initial: { y: 12, scale: 0.94 },
  animate: { y: 0, scale: 1 },
  exit: { y: 10, scale: 0.94 },
  transition: { type: "spring", stiffness: 260, damping: 30, mass: 0.9 } as const,
};

const T = (extra?: CSSProperties): CSSProperties => ({ color: "var(--bo-text)", ...extra });

/** Close control — the exact 14px vector from Figma (node 541:463): a 1px round-capped
 *  cross inset 3.5px inside its box, at full text colour. It sits flush with the card's
 *  16px padding, so it lines up with the first line of the title. */
function CloseX({ onClose, className, tone = "var(--bo-text)" }: { onClose?: () => void; className?: string; tone?: string }) {
  return (
    <button type="button" aria-label="Dismiss" onClick={onClose} className={`shrink-0 opacity-90 transition-opacity duration-200 hover:opacity-100 ${className ?? ""}`}>
      <svg className="block size-[14px]" viewBox="0 0 14 14" fill="none" stroke={tone} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.5 3.5L3.5 10.5" />
        <path d="M3.5 3.5L10.5 10.5" />
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

export default function NudgeCard({ type, theme, rep, onCta, onClose }: { type: NudgeType; theme: Theme; rep?: string; onCta?: () => void; onClose?: () => void }) {
  const stroke = theme.gradientStroke ? "glass-stroke" : "";

  // Unread message from a live rep (frame 541:778) — the message truncates to one line
  // and the byline sits under it. Clicking anywhere opens the conversation.
  if (type === "notification") {
    return (
      <motion.div key="nudge" className={`${stroke} relative flex w-[343px] flex-col overflow-hidden px-[16px] pb-[20px] pt-[16px]`} style={cardStyle(theme)} {...anim}>
        <div className="flex w-full items-start gap-[8px]">
          <button type="button" onClick={onCta} className="flex min-w-0 flex-1 flex-col gap-[10px] text-left" style={T()}>
            <p className="w-full truncate text-[14px] font-medium leading-[1.45] tracking-[0.14px]">
              Hey, I saw you’re on the Pricing Page, want me to give you an indepth suggestion of which pricing will be best for you?
            </p>
            <span className="flex items-center gap-[10px] opacity-[0.76]">
              <span className="text-[14px] font-medium capitalize leading-none tracking-[0.14px]">{rep ?? "Sarah"}</span>
              <span className="size-[4px] shrink-0 rounded-full" style={{ background: "var(--bo-text)" }} />
              <span className="text-[14px] font-medium capitalize leading-none tracking-[0.14px]">Just Now</span>
            </span>
          </button>
          <CloseX onClose={onClose} />
        </div>
      </motion.div>
    );
  }

  if (type === "visual") {
    return (
      <motion.div key="nudge" className={`${stroke} relative w-[343px] overflow-hidden`} style={cardStyle(theme)} {...anim}>
        <img src="/breakout/nudge-photo.png" alt="" className="pointer-events-none absolute inset-0 size-full object-cover" />
        <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.62) 100%)", backdropFilter: "blur(1px)" }} />
        {/* photo backdrop → the cross is always white, never the theme colour */}
        <CloseX onClose={onClose} tone="#ffffff" className="absolute right-[16px] top-[16px] z-10" />
        <div className="relative flex h-[216px] flex-col justify-end p-[16px]">
          <div className="flex flex-col gap-[10px] pr-[26px]" style={{ color: "#fff" }}>
            <p className="text-[14px] font-medium capitalize leading-[1.3] tracking-[0.28px]">{TITLE}</p>
            <button type="button" onClick={onCta} className="text-left text-[14px] font-medium leading-none tracking-[0.14px] transition-opacity duration-200 hover:opacity-70">View Case Study →</button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (type === "mediatop") {
    return (
      <motion.div key="nudge" className={`${stroke} relative flex w-[343px] flex-col overflow-hidden`} style={cardStyle(theme)} {...anim}>
        {/* multimedia element ON TOP (not background) — frame 496:183 */}
        <div className="relative p-[6px] pb-0">
          <img src="/breakout/nudge-photo.png" alt="" className="h-[132px] w-full rounded-[10px] object-cover" />
          <CloseX onClose={onClose} tone="#ffffff" className="absolute right-[16px] top-[16px] z-10" />
        </div>
        <div className="relative flex flex-col gap-[10px] px-[16px] pb-[20px] pt-[12px]" style={T()}>
          <p className="text-[14px] font-medium capitalize leading-[1.3] tracking-[0.28px]">{TITLE}</p>
          <button type="button" onClick={onCta} className="text-left text-[14px] font-medium leading-none tracking-[0.14px] transition-opacity duration-200 hover:opacity-70">View Case Study →</button>
        </div>
      </motion.div>
    );
  }

  if (type === "text") {
    return (
      <motion.div key="nudge" className={`${stroke} relative flex w-[389px] flex-col overflow-hidden px-[16px] pb-[20px] pt-[16px]`} style={cardStyle(theme)} {...anim}>
        <div className="flex w-full items-start gap-[8px]">
          <div className="flex min-w-0 flex-1 flex-col gap-[16px]">
            <div className="flex flex-col gap-[6px]">
              <p className="text-[14px] font-medium capitalize leading-[1.3] tracking-[0.28px]" style={T()}>{TITLE}</p>
              <p className="text-[14px] leading-[1.3] tracking-[0.28px]" style={T({ opacity: 0.7 })}>Ramp added Northwind to its blog and converted passive readers into pipeline — without a single gated PDF.</p>
            </div>
            <CaseLink onCta={onCta} />
          </div>
          <CloseX onClose={onClose} />
        </div>
      </motion.div>
    );
  }

  if (type === "testimonial") {
    return (
      <motion.div key="nudge" className={`${stroke} relative flex w-[389px] flex-col overflow-hidden`} style={cardStyle(theme)} {...anim}>
        <div className="flex items-start gap-[8px] p-[16px]">
          <p className="min-w-0 flex-1 text-[16px] leading-[1.3] tracking-[0.32px]" style={T()}>“Our blog finally pulls its weight – readers ask, get answers, and book.”</p>
          <CloseX onClose={onClose} />
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
      <motion.div key="nudge" className={`${stroke} relative flex w-[357px] flex-col overflow-hidden px-[16px] pb-[20px] pt-[16px]`} style={cardStyle(theme)} {...anim}>
        <div className="flex w-full items-start gap-[8px]">
          <div className="flex min-w-0 flex-1 flex-col gap-[12px]">
            <p className="text-[14px] font-medium capitalize leading-[1.3] tracking-[0.28px]" style={T()}>{TITLE}</p>
            <div className="flex items-center gap-[10px]">
              <button type="button" onClick={onCta} className="relative flex h-[30px] items-center justify-center overflow-hidden rounded-[36px] px-[14px] text-[14px] font-medium capitalize leading-none tracking-[0.14px] transition-[filter] duration-200 hover:brightness-95" style={{ ...glassEdge(theme), backgroundColor: "var(--bo-sec-hover)", ...T() }}>Read More →</button>
              <button type="button" onClick={onCta} className="text-[14px] font-medium capitalize leading-none tracking-[0.14px] transition-opacity duration-200 hover:opacity-70" style={T()}>View Related</button>
            </div>
          </div>
          <CloseX onClose={onClose} />
        </div>
      </motion.div>
    );
  }

  // default: "card" — compact single column, title + link, cross top-right (frame 541:448)
  return (
    <motion.div key="nudge" className={`${stroke} relative flex w-[343px] overflow-hidden px-[16px] pb-[20px] pt-[16px]`} style={cardStyle(theme)} {...anim}>
      <div className="flex w-full items-start gap-[8px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[10px]" style={T()}>
          <p className="text-[14px] font-medium capitalize leading-[1.3] tracking-[0.28px]">{TITLE}</p>
          <button type="button" onClick={onCta} className="text-left text-[14px] font-medium leading-none tracking-[0.14px] transition-opacity duration-200 hover:opacity-70">View Case Study →</button>
        </div>
        <CloseX onClose={onClose} />
      </div>
    </motion.div>
  );
}
