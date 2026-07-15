import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BorderBeam } from "border-beam";
import { pulsePreset, DEFAULT_AGENT, type NudgeType, type OptionDef, type PulseColor, type UnreadStyle } from "./ConfigPanel";
import type { Theme } from "../themes";
import ChatPanel, { REP_AVATAR, type Msg, type Rep } from "./ChatPanel";
import AgentIcon from "./AgentIcon";
import SuccessCard from "./SuccessCard";
import SummaryPanel from "./SummaryPanel";
import VideoLibraryPanel from "./VideoLibraryPanel";
import NudgeCard from "./NudgeCard";
import { playChime, playTick } from "../sound";
import { glass } from "../glass";
import { MARK_ID, SURFACE_ID, contentIn, surfaceMorph } from "../morph";

const REP_NAME = "Sarah";

// Pull a plausible first name out of an email for a personal acknowledgement.
// Strips digits + anything after the first separator; skips 1-char/empty locals.
function firstNameFromEmail(email: string): string {
  const local = (email.split("@")[0] || "").split(/[._+-]/)[0].replace(/\d+/g, "");
  return local.length >= 2 ? local.charAt(0).toUpperCase() + local.slice(1).toLowerCase() : "";
}

const morph = { type: "spring", stiffness: 300, damping: 32, mass: 0.9 } as const;
// A slower, softer settle for the scroll shrink — Apple-like, very velvet.
const scrollEase = { type: "spring", stiffness: 150, damping: 26, mass: 1.15 } as const;
const slowFade = { duration: 0.5, ease: [0.22, 1, 0.36, 1] } as const;
// Every width inside the pod runs on this one spring: the input frame opening on hover, and
// the actions ⇄ send swap. Well damped, so the frame grows in one motion without wobbling.
// Sharing it is not tidiness — if the field reclaims space on a different clock from the one
// the buttons give it up on, the pod visibly breathes mid-swap.
const swap = { type: "spring", stiffness: 340, damping: 34, mass: 0.8 } as const;
// Subtle vertical roll for the rotating suggestion text (new rises from below, old lifts up).
const roll = { type: "spring", stiffness: 300, damping: 34, mass: 0.85 } as const;

// Every view is absolutely anchored to the same bottom-center point and only
// grows upward — so the input frame stays "set in stone", never repositioning.
const anchor = "absolute bottom-0 left-0 -translate-x-1/2 flex flex-col items-center";

// NOTHING that wraps a glass surface may animate `opacity`. In Chromium any opacity < 1 —
// on the element itself OR on any ancestor — makes a backdrop root, and the descendant's
// `backdrop-filter` then samples an empty backdrop. Fading a panel in therefore shows a
// flat, transparent version of it for the whole animation, with the blur snapping on at
// the end. `transform` has no such effect. Views therefore never fade: they morph, via
// the shared `layoutId`s in morph.ts.

export const ICONS: Record<string, string> = {
  doc: "/breakout/doc.svg",
  compass: "/breakout/compass.svg",
  calc: "/breakout/calc.svg",
  video: "/breakout/video.svg",
};

// Two blur weights, straight from the file: small chrome (pod, pill) uses --bo-blur
// (Figma 75 → 37.5px CSS), large surfaces (suggestion / chat / nudge panels) use
// --bo-blur-lg (Figma 95 → 47.5px). Figma's background-blur radius is 2× the CSS one.

// Hover = colour change ONLY. A tint overlay fades in on hover — no scale, no
// movement, no reflow. `tint` is themed; `dark` is a universal press-darken.
function Tint({ color }: { color: string }) {
  return <span className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100" style={{ backgroundColor: color }} />;
}
const primaryDark = "rgba(0,0,0,0.08)";

// Pick a readable text colour for a custom primary-button colour: a light button gets
// near-black text (a dark grey, not pure black) and no white glow; a dark button gets
// white text with a soft glow.
function readableTextFor(hex: string): { text: string; shadow: string } | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? { text: "#222327", shadow: "none" } : { text: "#ffffff", shadow: "0px 0.3px 0px rgba(255,255,255,0.55)" };
}

// Contained breathing border glow — border-beam's `pulse-inner` (rides the frame edge, no
// outward bloom). The colour comes straight from the preset's built-in palette (ocean /
// sunset / colorful / mono); mono is static, the rest animate their hue cycle.
//
// The beam is an OVERLAY, never a wrapper. BorderBeam's own element declares
// `isolation: isolate`, which makes it a backdrop root — wrap the pod in it and the pod's
// backdrop-filter has nothing left to sample, so the glass evaporates the moment the
// pulse switches on. Laying the beam over an empty box instead keeps the pod untouched.
// The host div is always rendered, so toggling the pulse never re-parents (and therefore
// never remounts and re-measures) the pod.
function PulseFrame({ on, color, radius, children }: { on: boolean; color: PulseColor; radius: number; children: ReactNode }) {
  const p = pulsePreset(color);
  return (
    <div className="relative">
      {children}
      {on && (
        <BorderBeam
          size="pulse-inner"
          colorVariant={p.variant}
          strength={1.15}
          brightness={2}
          saturation={1.9}
          staticColors={p.variant === "mono"}
          borderRadius={radius}
          duration={2.8}
          // `position` inline: border-beam injects `[data-beam] { position: relative }`
          // into <head> at runtime, and that would beat a Tailwind `absolute` class.
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          <div className="size-full" />
        </BorderBeam>
      )}
    </div>
  );
}
const podRadius = (theme: Theme) => parseInt(theme.vars["--bo-r-pod"] ?? "60", 10) || 60;

// Secondary chip that MORPHS between the default 32px rounded-square and the 24px
// circular on-scroll form (designs 435:233 → 448:383). Animated size + radius, so the
// bar never hard-swaps — it just resizes.
function MorphChip({ icon, label, compact, filter, hoverBg, onClick }: { icon: string; label?: string; compact: boolean; filter: string; hoverBg: string; onClick?: () => void }) {
  const [hover, setHover] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  // The pod surface is `overflow-hidden` (its rounded glass clips content), so a
  // tooltip drawn inside the chip is cropped away above the pod's edge. Measure the
  // chip in viewport space and PORTAL the bubble to <body> so nothing clips it.
  const open = () => {
    setHover(true);
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setTip({ x: r.left + r.width / 2, y: r.top });
  };
  const close = () => { setHover(false); setTip(null); };
  return (
    <motion.button ref={btnRef} type="button" onClick={onClick} onHoverStart={open} onHoverEnd={close} className="group relative flex shrink-0 items-center justify-center" animate={{ width: compact ? 24 : 32, height: compact ? 24 : 32, borderRadius: compact ? 12 : 10 }} transition={scrollEase}>
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100" style={{ backgroundColor: hoverBg }} />
      <motion.img src={ICONS[icon]} alt="" className="relative shrink-0" animate={{ width: compact ? 16 : 20, height: compact ? 16 : 20 }} transition={scrollEase} style={{ filter }} />
      {/* Tooltip (Figma 594:694) — a small dark bubble above the icon on hover.
          Solid, not glass, so it can safely fade; portalled out of the clipped pod. */}
      {createPortal(
        <AnimatePresence>
          {hover && label && !compact && tip && (
            <motion.span
              className="pointer-events-none fixed z-[9999] whitespace-nowrap rounded-[8px] px-[9px] py-[6px] text-[12px] font-medium leading-none text-white"
              style={{ left: tip.x, top: tip.y - 8, backgroundColor: "rgba(24,24,29,0.96)", boxShadow: "0px 8px 22px rgba(0,0,0,0.4)", x: "-50%", y: "-100%" }}
              initial={{ opacity: 0, y: "-90%", scale: 0.9 }}
              animate={{ opacity: 1, y: "-100%", scale: 1 }}
              exit={{ opacity: 0, y: "-90%", scale: 0.9 }}
              transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.6 }}
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </motion.button>
  );
}

// Rotating-suggestion pill. Text CROSS-FADES (no vertical travel) and the pill
// springs its width to hug each new suggestion (measured → no clipping).
function DemoPill({ text, filter, strokeCls, glassStyle, tint, onClick }: { text: string; filter: string; strokeCls: string; glassStyle: CSSProperties; tint: string; onClick?: () => void }) {
  const measureRef = useRef<HTMLSpanElement>(null);
  const [w, setW] = useState<number>();
  useLayoutEffect(() => {
    // offsetWidth = layout width, unaffected by any parent scale transform — so the
    // pill keeps hugging correctly even if it was measured while the frame was scaled.
    if (measureRef.current) setW(measureRef.current.offsetWidth);
  }, [text]);
  return (
    <motion.button key="demo" type="button" onClick={onClick} className={`${strokeCls} group relative flex h-[28px] items-center justify-center gap-[8px] overflow-hidden pl-[8px] pr-[10px]`} style={glassStyle} initial={{ scale: 0.9, y: 6 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 6 }} transition={morph}>
      <Tint color={tint} />
      <img src="/breakout/search.svg" alt="" className="relative size-[14px] shrink-0" style={{ filter }} />
      <motion.span className="relative block h-[16px]" animate={{ width: w ?? "auto" }} transition={{ type: "spring", stiffness: 260, damping: 34, mass: 0.8 }}>
        {/* invisible sizer — w-max so it measures the natural TEXT width (not the
            parent's animated width), letting the pill re-hug each new suggestion */}
        <span ref={measureRef} className="invisible block h-[16px] w-max whitespace-nowrap text-[14px] font-medium leading-[16px] tracking-[-0.14px]">{text}</span>
        {/* Vertical roll: new text rises from below, old lifts up. The clip box is
            tall-tight but very wide, so it clips only vertically — text never crops
            on the left/right as the pill re-hugs its width. */}
        <span className="absolute left-1/2 top-0 h-[16px] w-[600px] -translate-x-1/2 overflow-hidden">
          <AnimatePresence initial={false}>
            <motion.span key={text} className="absolute left-1/2 top-0 block whitespace-nowrap text-[14px] font-medium leading-[16px] tracking-[-0.14px]" style={{ color: "var(--bo-text)" }} initial={{ x: "-50%", y: "70%", opacity: 0 }} animate={{ x: "-50%", y: "0%", opacity: 1 }} exit={{ x: "-50%", y: "-70%", opacity: 0 }} transition={roll}>{text}</motion.span>
          </AnimatePresence>
        </span>
      </motion.span>
    </motion.button>
  );
}

// Calendar mark (Figma 463:432) — themed to the widget text colour so, in the compact
// (secondary) state, it matches the secondary icons.
const CalendarIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="var(--bo-text)">
    <path d="M18.3333 11.6667V10C18.3333 9.30083 18.3333 8.67942 18.3226 8.125H1.67742C1.66667 8.67942 1.66667 9.30083 1.66667 10V11.6667C1.66667 14.8093 1.66667 16.3807 2.64297 17.357C3.61929 18.3333 5.19063 18.3333 8.33333 18.3333H11.6667C14.8093 18.3333 16.3807 18.3333 17.357 17.357C18.3333 16.3807 18.3333 14.8093 18.3333 11.6667Z" />
    <path d="M6.45833 2.08333C6.45833 1.73816 6.17851 1.45833 5.83333 1.45833C5.48816 1.45833 5.20833 1.73816 5.20833 2.08333V3.39938C4.00889 3.49542 3.22147 3.73114 2.64297 4.30964C2.06447 4.88814 1.82876 5.67556 1.73272 6.875H18.2673C18.1713 5.67556 17.9355 4.88814 17.357 4.30964C16.7785 3.73114 15.9911 3.49542 14.7917 3.39938V2.08333C14.7917 1.73816 14.5118 1.45833 14.1667 1.45833C13.8215 1.45833 13.5417 1.73816 13.5417 2.08333V3.34408C12.9873 3.33333 12.3658 3.33333 11.6667 3.33333H8.33333C7.63414 3.33333 7.01273 3.33333 6.45833 3.34408V2.08333Z" />
  </svg>
);

// Primary CTA that MORPHS between the full label button and a bare icon chip on scroll.
// On scroll it takes the SECONDARY treatment — the primary fill + border fade to nothing,
// the label crossfades to the icon (theme colour, no fill). One element, so the shape
// springs smoothly. Maintained across every state.
//
// The icon is the primary's OWN icon. The calendar mark (Figma 463:432) belongs to
// "Book a Call" specifically, so it only appears when that option holds the primary slot;
// an ROI Calculator primary collapses to the calculator, and so on.
function PrimaryMorph({ label, icon, booking, compact, theme, hoverBg, filter, onClick }: { label: string; icon: string; booking: boolean; compact: boolean; theme: Theme; hoverBg: string; filter: string; onClick?: () => void }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [tw, setTw] = useState<number>();
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const measure = () => setTw(el.offsetWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [label]);
  const expandedW = (tw ?? 62) + 28; // px-14 both sides
  const btnR = Math.min(parseInt(theme.vars["--bo-r-btn"] ?? "36", 10) || 36, 18);
  return (
    <motion.button type="button" onClick={onClick} className="group relative flex shrink-0 items-center justify-center overflow-hidden" animate={{ width: compact ? 24 : expandedW, height: compact ? 24 : 36, borderRadius: compact ? 12 : btnR }} transition={scrollEase}>
      {/* Primary fill + hairline on one layer, so a single opacity retires the whole
          treatment on scroll — compact is a bare icon chip like the secondaries.
          NO backdrop-filter of its own: the pod already frosts everything behind it, and a
          nested backdrop-filter is a backdrop root whose sampled backdrop is empty. Rather
          than double-frosting, it erases the pod's glass inside the button's rect and the
          fill composites toward black — Figma reads rgb(126,126,170) here, that bug read
          rgb(81,78,106). Figma's own 28px background-blur on this layer is a no-op over an
          already-blurred surface. */}
      <motion.span className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ backgroundColor: "var(--bo-primary-fill)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--bo-primary-border)" }} animate={{ opacity: compact ? 0 : 1 }} transition={scrollEase} />
      {/* hover overlay — primary darken when filled, secondary tint when a chip */}
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100" style={{ backgroundColor: compact ? hoverBg : primaryDark }} />
      <span ref={textRef} className="pointer-events-none invisible absolute whitespace-nowrap text-[14px] font-medium tracking-[-0.14px]">{label}</span>
      <motion.span className="relative whitespace-nowrap text-[14px] font-medium leading-none tracking-[-0.14px]" style={{ color: "var(--bo-primary-text)", textShadow: "var(--bo-primary-text-shadow, 0px 0.3px 0px #ffffff)" }} animate={{ opacity: compact ? 0 : 1 }} transition={{ duration: 0.2, ease: "easeInOut" }}>{label}</motion.span>
      <motion.span className="pointer-events-none absolute flex items-center justify-center" animate={{ opacity: compact ? 1 : 0 }} transition={{ duration: 0.2, ease: "easeInOut" }}>
        {booking ? <CalendarIcon className="size-[16px]" /> : <img src={ICONS[icon]} alt="" className="size-[16px]" style={{ filter }} />}
      </motion.span>
    </motion.button>
  );
}


type LogoDef = { src?: string; bg?: string; pad?: string; agent?: boolean };

function Logo({ px, rep, theme, logo, showRepDot = true, badge }: { px: number; rep?: boolean; theme: Theme; logo?: LogoDef; showRepDot?: boolean; badge?: number }) {
  // NetApp (logoSquare) → rounded square that follows the pod corner radius. Others → circle.
  const radius = theme.logoSquare ? Math.round(podRadius(theme) * (px / 48)) : px >= 40 ? 56.25 : 39.375;
  const box = px >= 40 ? "inset 0px -2px 3px 0px rgba(255,255,255,0.2), inset 0px 2px 3px 0px rgba(255,255,255,0.2)" : "inset 0px -1.4px 2.1px 0px rgba(255,255,255,0.2), inset 0px 1.4px 2.1px 0px rgba(255,255,255,0.2)";
  const L = logo ?? theme.logo;
  const k = px / 40; // every offset below is authored against the 40px mark
  return (
    <div className="pointer-events-none relative shrink-0" style={{ width: px, height: px }}>
      <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: radius, boxShadow: "var(--bo-shadow)" }}>
        {rep ? (
          <img src={REP_AVATAR} alt="" className="absolute inset-0 size-full object-cover" />
        ) : L.bg ? (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: L.bg, color: "#fff" }}>
            {L.agent ? (
              <AgentIcon size={Math.round(px * 0.74)} />
            ) : (
              <img src={L.src} alt="" className="size-full object-contain" style={{ padding: L.pad ?? "26%" }} />
            )}
          </div>
        ) : (
          <img src={L.src} alt="Breakout" className="absolute inset-0 size-full object-contain" />
        )}
        <div className="absolute inset-0" style={{ borderRadius: radius, boxShadow: box }} />
      </div>
      {rep && showRepDot && <span className="absolute block rounded-full" style={{ width: Math.round(px * 0.25), height: Math.round(px * 0.25), right: 0, bottom: 0, background: "#41E2A4" }} />}
      {/* Unread count (frame 541:647): a 16px glass chip that overhangs the mark's
          top-right corner. Springs in so the arrival is felt, not just seen. */}
      <AnimatePresence>
        {!!badge && (
          <motion.span
            key="badge"
            className="absolute flex items-center justify-center overflow-hidden text-center font-medium text-white"
            style={{ width: 16 * k, height: 16 * k, left: 28.5 * k, top: -3 * k, borderRadius: 15 * k, fontSize: 12 * k, letterSpacing: 0.12 * k, lineHeight: 1, backgroundColor: "rgba(33,33,33,0.55)", backdropFilter: "blur(38px)", WebkitBackdropFilter: "blur(38px)" }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.4 }}
            transition={{ type: "spring", stiffness: 620, damping: 22, mass: 0.6 }}
          >
            {badge}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}


function MenuPopover({ menu, suggestions, onPick, onOption, theme, filter, tint, width }: { menu: OptionDef[]; suggestions: string[]; onPick: (t: string) => void; onOption: (key: string) => void; theme: Theme; filter: string; tint: string; width?: number }) {
  return (
    <motion.div key="popover" className={`${theme.gradientStroke ? "glass-stroke" : ""} flex flex-col gap-[16px] p-[12px]`} style={{ ...glass(theme, "--bo-r-card", "--bo-blur-lg"), transformOrigin: "bottom center", width }} initial={{ y: 14, scale: 0.94 }} animate={{ y: 0, scale: 1 }} exit={{ y: 14, scale: 0.94 }} transition={morph}>
      {/* No "Explore more" caption (frame 544:962) — the chips speak for themselves;
          the block just carries the 4px inset the label used to provide. */}
      {menu.length > 0 && (
        <div className="flex flex-col pl-[4px] pt-[4px]">
          <div className="flex flex-wrap gap-[10px]">
            {menu.map((o) => (
              <button key={o.key} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onOption(o.key)} className="group relative flex items-center justify-center gap-[8px] overflow-hidden rounded-[40px] px-[10px] py-[4px]" style={{ backgroundColor: "var(--bo-bubble)" }}>
                <Tint color={tint} />
                <img src={ICONS[o.icon]} alt="" className="relative size-[14px]" style={{ filter }} />
                <span className="relative whitespace-nowrap text-[14px] font-medium leading-[1.45]" style={{ color: "var(--bo-text)" }}>{o.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-[8px] pl-[4px]">
        <p className="text-[12px] font-medium leading-none opacity-[0.54]" style={{ color: "var(--bo-text)" }}>Try Asking</p>
        <div className="flex flex-col gap-[6px]">
          <AnimatePresence initial={false}>
            {suggestions.map((s) => (
              <motion.button key={s} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(s)} className="group relative flex w-full items-center gap-[8px] overflow-hidden rounded-[8px] p-[4px] text-left" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
                <Tint color={tint} />
                <img src="/breakout/search.svg" alt="" className="relative size-[14px] shrink-0" style={{ filter }} />
                <span className="relative text-[14px] font-medium leading-none" style={{ color: "var(--bo-text)" }}>{s}</span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default function BreakoutWidget({
  primary,
  secondaries,
  menu,
  scrolled = false,
  repActive = false,
  visitor = "Anonymous",
  useLogo = true,
  askOnScroll = true,
  askEmailFirst = false,
  primaryColor = "",
  font = "",
  suggestions,
  theme,
  nudge = false,
  nudgeType = "card",
  unread = false,
  unreadStyle = "badge",
  pulse = false,
  pulseColor = "ocean",
}: {
  primary: OptionDef | null;
  secondaries: OptionDef[];
  menu: OptionDef[];
  scrolled?: boolean;
  repActive?: boolean;
  visitor?: string;
  useLogo?: boolean;
  askOnScroll?: boolean;
  askEmailFirst?: boolean;
  primaryColor?: string;
  font?: string;
  suggestions: string[];
  theme: Theme;
  nudge?: boolean;
  nudgeType?: NudgeType;
  unread?: boolean;
  unreadStyle?: UnreadStyle;
  pulse?: boolean;
  pulseColor?: PulseColor;
}) {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [unreadDismissed, setUnreadDismissed] = useState(false);
  // Clip the pod only while its width is in motion — see the collapse comment below.
  const [clipPod, setClipPod] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  // Dedicated panels (Video Library / Summary) opened from the pod actions.
  const [videoOpen, setVideoOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  // Scroll shrink: scrolling the page shrinks the widget to its compact bar; it restores
  // ~1s after scrolling stops.
  const [scrolledLocal, setScrolledLocal] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [thinking, setThinking] = useState(false);
  const [success, setSuccess] = useState(false);
  // Email gate: captured address ("" = not yet), and the visitor's first message,
  // held so the agent can answer it once the email is in.
  const [email, setEmail] = useState("");
  const [pendingText, setPendingText] = useState("");
  // Sales-rep hand-off: after the visitor's 3rd message the agent invites a rep,
  // then Sarah "joins" locally (independent of the config's repOnline toggle).
  const [localRep, setLocalRep] = useState(false);
  const [salesInvited, setSalesInvited] = useState(false);
  // While true the header shows a "Connecting with Sales Rep" loader + empty profile,
  // until the rep actually joins. Never lingers once joined.
  const [connecting, setConnecting] = useState(false);
  const sentRef = useRef(0); // visitor questions sent (email submit doesn't count)
  const [sugIdx, setSugIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  // The suggestion/nudge card on top matches the width of the base row below it.
  const baseRef = useRef<HTMLDivElement>(null);
  const [baseW, setBaseW] = useState<number>();
  // Natural width of the secondaries + primary, so the input can grow by exactly that much
  // when they step aside for the send arrow.
  const actionsRef = useRef<HTMLDivElement>(null);
  const [actionsW, setActionsW] = useState(0);

  useEffect(() => { setNudgeDismissed(false); }, [nudge, nudgeType]);

  // A page scroll releases the latched hover. In the live embed that arrives as a window
  // scroll/wheel (handled in onShrink); in this demo the backdrop scroll is bridged in as
  // the `scrolled` prop, so mirror the release here too — scroll is one of the only two
  // gestures allowed to collapse a hover-opened pod.
  useEffect(() => { if (scrolled) setHovered(false); }, [scrolled]);

  useLayoutEffect(() => {
    const el = baseRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => setBaseW(el.offsetWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  });

  // Measured on the INNER node: while the outer wrapper animates its width to zero, this
  // one keeps its natural size, so the value survives the collapse. No dependency array —
  // a ResizeObserver re-attached per render is cheap and never goes stale.
  useLayoutEffect(() => {
    const el = actionsRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => setActionsW(el.offsetWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  });

  useEffect(() => {
    setSugIdx(0);
    if (suggestions.length <= 1) return;
    const id = setInterval(() => setSugIdx((i) => (i + 1) % suggestions.length), 3500);
    return () => clearInterval(id);
  }, [suggestions]);

  const currentSug = suggestions[sugIdx % suggestions.length] ?? "Show me a demo video";
  const nudgeActive = nudge && !nudgeDismissed;
  // On scroll the widget collapses to its compact bar (mark + icon chips, design 327:367).
  // Focusing the input un-compacts it; the page settling back to rest restores it.
  const compact = (scrolled || scrolledLocal) && !focused;
  // The input frame expands on HOVER, and stays open while focused/typing.
  const expanded = focused || (hovered && !compact);
  // The suggestion panel is a CLICK affordance, never a hover one: it opens the moment
  // the caret lands in the field — before a single character is typed — and closes when
  // the field loses focus (which a click anywhere outside the widget forces).
  const menuOpen = focused;
  // "Just ask" state (frame 482:436): no primary AND no secondaries → the pod is a
  // permanent "Ask anything…" input instead of an empty (broken) pill.
  const noModules = !primary && secondaries.length === 0;
  const showFullInput = noModules || expanded;
  // Scrolled, "Ask anything" only. `keep` shrinks the pod to the 36px scroll bar; `drop`
  // retires it entirely and lets the mark shrink and re-centre on its own.
  const askDropped = noModules && compact && !askOnScroll;
  const askCompact = noModules && compact && askOnScroll;
  const repHere = repActive || localRep;
  const rep: Rep = repHere ? { name: REP_NAME } : null;
  const unreadLive = unread && !unreadDismissed && !chatOpen && !success;
  const showBadge = unreadLive && unreadStyle === "badge";
  const showUnreadCard = unreadLive && unreadStyle === "notification";

  // A fresh unread message re-arms the nudge and announces itself: the count badge gets
  // a soft tactile tick, the notification card a gentle chime. Autoplay policy may mute
  // the very first one — `sound.ts` fails silently by design.
  useEffect(() => {
    setUnreadDismissed(false);
    if (!unread) return;
    if (unreadStyle === "badge") playTick();
    else playChime();
  }, [unread, unreadStyle]);

  // Handing the conversation from the AI to a human mid-chat is announced inline —
  // "Sarah joined the conversation" (frame 541:713). Refs keep the effect keyed purely
  // on the rep flipping on, so re-renders never re-announce.
  const chatOpenRef = useRef(false);
  chatOpenRef.current = chatOpen;
  const firstRepRun = useRef(true);
  useEffect(() => {
    if (firstRepRun.current) {
      firstRepRun.current = false;
      return;
    }
    if (!repActive || !chatOpenRef.current) return;
    setMessages((m) => [...m, { from: "system", name: REP_NAME, text: "joined the conversation" }]);
  }, [repActive]);
  // No brand logo → the default AI-agent mark. Known company → the visitor's own mark;
  // otherwise the brand mark.
  const activeLogo = !useLogo
    ? DEFAULT_AGENT
    : visitor === "Known company" && theme.logoKnown
    ? theme.logoKnown
    : theme.logo;
  const filter = theme.iconDark ? "brightness(0) opacity(0.85)" : "none";
  const secHover = theme.vars["--bo-sec-hover"];
  const glassTint = theme.iconDark ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.12)";
  const strokeCls = theme.gradientStroke ? "glass-stroke" : "";

  const aiReply = () => {
    setThinking(true);
    window.setTimeout(() => {
      setThinking(false);
      // After the visitor's 3rd question, hand off to a sales rep (once): invite →
      // "Connecting with Sales Rep" → Sarah joins → she greets.
      if (sentRef.current >= 3 && !repHere && !salesInvited) {
        setSalesInvited(true);
        setMessages((m) => [...m, { from: "ai", text: "Your request is valid — let me invite a sales rep who can dig into the details with you." }]);
        // The connecting state lives in the HEADER (loader + empty profile), not as a
        // transcript divider. It clears the instant the rep joins — never lingers.
        setConnecting(true);
        window.setTimeout(() => {
          setConnecting(false);
          setLocalRep(true);
          setMessages((m) => [
            ...m,
            { from: "system", name: REP_NAME, text: "joined the conversation" },
            { from: "ai", text: `Hi Maya, ${REP_NAME} here 👋 — I've got the full thread. Happy to take it from here; what would you like to dig into?` },
          ]);
        }, 5500);
        return;
      }
      setMessages((m) => [...m, { from: "ai", text: repHere ? "Happy to help! Want me to grab a 15-min slot on my calendar to walk you through it?" : "Great — the Growth plan fits your team best. Want me to book a quick 15-min call to walk through it?", cta: "Book a call" }]);
    }, 1900);
  };
  // Copy for the email gate — warm, one reason to give it, and a no-spam promise.
  const emailAsk = () =>
    repActive
      ? `Happy to help! 👋 Before we dive in, what's the best email to reach you at? That way ${REP_NAME} can follow up personally and pick things right back up if we ever get cut off.`
      : "Happy to help! 👋 Before we dive in, what's the best email to reach you at? I'll only use it to follow up on our chat and send anything useful — no spam, ever.";
  const openChat = (text: string) => {
    setSuccess(false);
    setChatOpen(true);
    setMinimized(false);
    setNudgeDismissed(true);
    setUnreadDismissed(true);
    setInputValue("");
    // Email gate: the agent's FIRST message asks for the email; the conversation
    // (and any first question) is held until it's submitted. `askEmailFirst` off →
    // the previous flow below.
    if (askEmailFirst && !email) {
      const first = text.trim();
      if (first) sentRef.current += 1;
      setPendingText(first);
      setMessages([
        ...(first ? [{ from: "user" as const, text: first }] : []),
        { from: "ai" as const, text: emailAsk(), emailRequest: true },
      ]);
      return;
    }
    sentRef.current += 1;
    setMessages([
      { from: "ai", text: repActive ? "Hi Maya, Sarah here from the team 👋\n\nI see you're on the Pricing Page — want a hand picking the right plan?" : "Hi Maya, you're speaking with Breakout AI Agent.\n\nI see you're on the Pricing Page, want me to give you an in-depth suggestion of which pricing will be best for you?" },
      { from: "user", text: text || "Yes, sure please" },
    ]);
    aiReply();
  };
  // The visitor handed over their email. Consistent hand-off (never the random
  // canned line): the email lands as a bubble, an instant personalised thanks, a
  // beat, then the conversation picks up — toward help if they asked something,
  // or an invitation if they opened cold.
  const submitEmail = (value: string) => {
    setEmail(value);
    const name = firstNameFromEmail(value);
    const hi = name ? `, ${name}` : "";
    const asked = pendingText.trim();
    setMessages((m) => [...m, { from: "user", text: value }, { from: "ai", text: `Perfect — thanks${hi}! 🙌` }]);
    setThinking(true);
    window.setTimeout(() => {
      setThinking(false);
      setMessages((m) => [
        ...m,
        asked
          ? { from: "ai", text: repActive ? "I'd love to walk you through it — the quickest way is a 15-min call with me. Want me to find a time?" : "Happy to walk you through it — the quickest way is a quick 15-min call. Want me to find a time?", cta: "Book a call" }
          : { from: "ai", text: repActive ? "So — what can I help you with today?" : "So — what would you like to know?" },
      ]);
    }, 1300);
  };
  const sendInChat = (text: string) => { sentRef.current += 1; setMessages((m) => [...m, { from: "user", text }]); aiReply(); };
  const closeChat = () => { setChatOpen(false); setMinimized(false); setScrolledLocal(false); setSuccess(false); setThinking(false); setFocused(false); setHovered(false); setMessages([]); setEmail(""); setPendingText(""); setLocalRep(false); setSalesInvited(false); setConnecting(false); sentRef.current = 0; };
  const minimizeChat = () => { setChatOpen(false); setSuccess(false); setFocused(false); setScrolledLocal(false); setHovered(false); setMinimized(true); };
  // While minimized the widget looks like its resting state; interacting REOPENS the same
  // conversation (messages preserved) rather than starting a new one, optionally sending text.
  const continueChat = (text: string) => { setMinimized(false); setChatOpen(true); if (text.trim()) sendInChat(text.trim()); };
  const openOrContinue = (text: string) => (minimized ? continueChat(text) : openChat(text));
  const sendFromPod = () => { if (inputValue.trim()) openOrContinue(inputValue.trim()); };
  // "Book a Call" is a booking, not a conversation: pressing it from the resting pod goes
  // straight to the confirmation card. Any other primary (ROI Calculator, Video Library…)
  // is a topic, so it opens the chat on that topic.
  const bookNow = () => {
    setChatOpen(false);
    setMinimized(false);
    setThinking(false);
    setNudgeDismissed(true);
    setUnreadDismissed(true);
    setFocused(false);
    setSuccess(true);
  };
  // Open a dedicated panel (clears the other views).
  const openPanel = (which: "video" | "summary") => {
    setSuccess(false); setChatOpen(false); setMinimized(false); setNudgeDismissed(true); setUnreadDismissed(true); setFocused(false);
    setVideoOpen(which === "video"); setSummaryOpen(which === "summary");
  };
  const closePanel = () => { setVideoOpen(false); setSummaryOpen(false); setFocused(false); setScrolledLocal(false); setHovered(false); };
  // Route a pod action to its destination: booking → confirmation card, Video
  // Library / Summarize → their panels, anything else → the chat.
  const activateOption = (key?: string) => {
    if (key === "book_call") return bookNow();
    if (key === "video") return openPanel("video");
    if (key === "summarize") return openPanel("summary");
    return openOrContinue("");
  };
  const activatePrimary = () => activateOption(primary?.key);

  // Live refs so the window/document listeners always read the current phase.
  const chatVisibleRef = useRef(false);
  chatVisibleRef.current = chatOpen || success || videoOpen || summaryOpen;
  const minimizedRef = useRef(false);
  minimizedRef.current = minimized;
  const panelRef = useRef(false);
  panelRef.current = videoOpen || summaryOpen;
  useEffect(() => {
    const inside = (t: EventTarget | null) => !!(rootRef.current && t instanceof Node && rootRef.current.contains(t));
    // Scrolling / clicking the config panel must NOT drive the widget's scroll state.
    const ignore = (t: EventTarget | null) => inside(t) || (t instanceof Element && !!t.closest("[data-config-panel]"));
    const toMinimized = () => { setChatOpen(false); setSuccess(false); setFocused(false); setScrolledLocal(false); setMinimized(true); };
    // Back to the resting pod: drop the caret so the suggestion panel closes with it.
    // Blurring the DOM node (not just the flag) keeps React and the browser in step.
    const toResting = () => { inputRef.current?.blur(); setFocused(false); };
    let idle: number | undefined;
    // Scrolling the page/backdrop shrinks the widget's on-scroll state, then restores
    // ~1s after scrolling stops. Never fires from the config panel or an open chat.
    // A page scroll also RELEASES the latched hover (see the enterHover note): a scroll
    // is one of the two gestures that may end the hover-open state.
    const onShrink = (e?: Event) => {
      if (e && ignore(e.target)) return;
      setHovered(false);
      if (chatVisibleRef.current) return; // don't compact while the chat panel is open
      setScrolledLocal(true);
      window.clearTimeout(idle);
      idle = window.setTimeout(() => setScrolledLocal(false), 900);
    };
    // Clicking outside the widget collapses an open chat (→ 435:233), or dismisses the
    // suggestion panel back to the resting pod. Either way it releases the latched hover —
    // a click on the page is the other gesture that ends the hover-open state.
    const onDown = (e: MouseEvent) => { if (ignore(e.target)) return; setHovered(false); if (panelRef.current) { setVideoOpen(false); setSummaryOpen(false); } else if (chatVisibleRef.current) toMinimized(); else toResting(); };
    // Clicking into the backdrop iframe moves focus off our window; mousedown never
    // reaches us from that document, so this is our only "touched the page" signal.
    // Same two outcomes — the on-scroll shrink is driven by the iframe's real scroll
    // (see App), not by focus changes. Counts as a page click → release the hover latch.
    const onBlur = () => { setHovered(false); if (panelRef.current) { setVideoOpen(false); setSummaryOpen(false); } else if (chatVisibleRef.current) toMinimized(); else toResting(); };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("blur", onBlur);
    window.addEventListener("scroll", onShrink, true); // capture → catches inner scroll containers
    window.addEventListener("wheel", onShrink, { capture: true, passive: true });
    return () => {
      window.clearTimeout(idle);
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("scroll", onShrink, true);
      window.removeEventListener("wheel", onShrink, true);
    };
  }, []);

  // Minimized renders the SAME resting view as "full" (frames 504:292/223/313) — only the
  // input copy and the reopen behaviour differ. So there is no separate minimized branch.
  const view = success ? "success" : chatOpen ? "chat" : videoOpen ? "video" : summaryOpen ? "summary" : "full";

  // Hover LATCH (client requirement): entering the pod opens it and KEEPS it open even
  // after the pointer leaves the container. The expanded state is never released by the
  // pointer moving away — only by an explicit page gesture: a scroll, or a click/blur
  // anywhere off the pod (both handled in the window/document listeners above). Moving
  // the cursor around the page therefore never collapses the pod.
  const enterHover = () => setHovered(true);

  // ---- Pod metrics ----------------------------------------------------------------
  // At rest: the bare "Ask anything" pod (frame 538:169) is a fixed 364 wide and insets
  // its text by 6 + 12; every other pod hugs its content and insets the caret by 15
  // (frame 544:986), with the chips supplying the remaining gaps via secPadX.
  //
  // Scrolled (frame 504:313): the pod itself carries px 8 / py 6 and a 4px gap between
  // 24px chips — no chip inset at all. A lone secondary with no primary tightens to px 6
  // so the pod comes out 36×36, a square with the icon dead centre.
  const loneSecondary = !primary && secondaries.length === 1;
  // The first character typed retires the action buttons and puts the send arrow in their
  // place. Gated on `showFullInput` so blurring away (which hides the field) brings the
  // buttons straight back rather than stranding an arrow beside a collapsed input.
  const typing = showFullInput && inputValue.length > 0;
  // The arrow's footprint: a 32px disc plus the 6px gap it sits behind.
  const SEND_W = 38;
  // Growing the field by exactly what the buttons vacated keeps the pod the same width, so
  // it never lurches narrower the instant you start typing. `actionsW` is the buttons'
  // natural width, measured on the inner node, which keeps its size while the outer one
  // animates to zero.
  const inputW = noModules
    ? askCompact
      ? 150
      : typing
      ? 328 - SEND_W
      : 328
    : typing && actionsW
    ? 200 + actionsW - SEND_W
    : 200;
  const compactPadX = askCompact ? 12 : loneSecondary ? 6 : 8;
  const podPadLeft = compact ? compactPadX : noModules ? 18 : showFullInput ? 15 : 6;
  const podPadRight = compact ? compactPadX : noModules ? 18 : 6;
  const secPadX = compact || showFullInput ? 0 : loneSecondary ? 2 : 8;
  // With no chip inset on scroll, the primary needs its own 4px gap off the secondaries.
  const primaryMarginLeft = secondaries.length === 0 ? 0 : compact ? 4 : showFullInput ? 6 : 0;

  return (
    <div ref={rootRef} className="relative" style={{ ...(theme.vars as CSSProperties), ...(primaryColor ? { "--bo-primary-fill": primaryColor } as CSSProperties : {}), ...(primaryColor && readableTextFor(primaryColor) ? { "--bo-primary-text": readableTextFor(primaryColor)!.text, "--bo-primary-text-shadow": readableTextFor(primaryColor)!.shadow } as CSSProperties : {}), ...(font ? { fontFamily: `'${font}', system-ui, sans-serif` } : {}) }} onMouseEnter={() => setScrolledLocal(false)}>
      {/* No AnimatePresence and no `exit` here on purpose. The three views share one glass
          surface and one mark (see morph.ts): the outgoing view unmounts in the same commit
          the incoming one mounts, so Framer morphs the surface from the old box to the new
          one. Give the outgoing view an exit animation and Framer crossfades the two
          instead, which is an opacity animation, which flattens the glass mid-morph. */}
      <>
        {view === "success" && <div key="success" className={anchor}><SuccessCard theme={theme} logo={activeLogo} onClose={closeChat} onContinue={closeChat} /></div>}

        {view === "chat" && <div key="chat" className={anchor}><ChatPanel theme={theme} logo={activeLogo} rep={rep} connecting={connecting} messages={messages} thinking={thinking} onSend={sendInChat} onCta={() => setSuccess(true)} onClose={closeChat} onMinimize={minimizeChat} cta={primary?.label} emailCaptured={!!email} onEmailSubmit={submitEmail} /></div>}

        {view === "summary" && <div key="summary" className={anchor}><SummaryPanel theme={theme} logo={activeLogo} onClose={closePanel} onMinimize={closePanel} onCta={() => setSuccess(true)} cta={primary?.label} /></div>}

        {view === "video" && <div key="video" className={anchor}><VideoLibraryPanel theme={theme} logo={activeLogo} onClose={closePanel} onMinimize={closePanel} /></div>}

        {view === "full" && (
          <div key="full" className="absolute bottom-0 left-0 -translate-x-1/2">
            {/* On scroll the frame MORPHS down (no frame scale, so nothing gets uneven):
                the mark shrinks and the secondaries + primary become equal 24px chips —
                exactly like the minimized scroll state. Suggestion is removed. */}
            <div className="relative flex flex-col items-center">
              <div className="flex flex-col items-center">
                <div ref={baseRef} className="flex items-center gap-[8px]">
                  {/* Mark morphs 40→28 on every scroll state, "Ask anything" included —
                      when the pod is dropped the row is just the mark, so it re-centres
                      itself. No `overflow-hidden`: the unread badge overhangs the corner. */}
                  <motion.div className="flex shrink-0 items-center justify-center" animate={{ width: compact ? 28 : 40, height: compact ? 36 : 48 }} transition={scrollEase}>
                    <motion.div className="origin-center shrink-0" animate={{ scale: compact ? 0.7 : 1 }} transition={scrollEase}>
                      {/* The mark is the same 40px disc in every view, so it only ever needs
                          to travel: `layout="position"` moves it without touching its size. */}
                      <motion.div layoutId={MARK_ID} layout="position" layoutDependency={view} transition={surfaceMorph}>
                        <Logo px={40} rep={repActive} theme={theme} logo={activeLogo} badge={showBadge ? 1 : 0} />
                      </motion.div>
                    </motion.div>
                  </motion.div>
                  {/* "Ask anything", scrolled, keep-on-scroll off → the pod collapses its
                      width to nothing and eats the row gap, leaving the mark alone and
                      centred. It CLIPS rather than fades: an opacity animation here would
                      strip the pod's own backdrop-filter for the whole transition (see the
                      note on `grow`). The clip is lifted once the pod is back at rest, so
                      its drop shadow isn't cropped on the flat themes. */}
                  <motion.div
                    initial={false}
                    animate={{ width: askDropped ? 0 : "auto", marginLeft: askDropped ? -8 : 0 }}
                    transition={scrollEase}
                    onAnimationStart={() => setClipPod(true)}
                    onAnimationComplete={() => setClipPod(askDropped)}
                    style={{ overflow: clipPod || askDropped ? "hidden" : "visible", pointerEvents: askDropped ? "none" : "auto" }}
                  >
                  <PulseFrame on={pulse} color={pulseColor} radius={podRadius(theme)}>
                    <motion.div layoutId={SURFACE_ID} layoutDependency={view} className={`${strokeCls} flex items-center overflow-hidden ${showFullInput ? "" : "cursor-text"}`} style={glass(theme, "--bo-r-pod")} animate={{ height: compact ? 36 : 48, paddingTop: 6, paddingBottom: 6, paddingLeft: podPadLeft, paddingRight: podPadRight }} transition={{ default: scrollEase, layout: surfaceMorph }} onHoverStart={enterHover} onClick={() => inputRef.current?.focus()}>
                      {/* `layout` here is what keeps the pod's contents from wearing the
                          morph's scale — see morph.ts. */}
                      <motion.div className="flex items-center" layoutDependency={view} {...contentIn}>
                      {/* Input stays mounted (width springs 0↔inputW) so expanding never
                          inserts a node mid-animation — no reflow stutter. It's inert
                          (pointer-events none, width 0) at rest, so no layout shift. */}
                      {/* Same spring as the actions and the arrow. On a slower one the field
                          reclaimed the freed space later than the buttons gave it up, and the
                          pod visibly sucked in by ~16px before settling back. */}
                      <motion.div className="overflow-hidden" initial={false} animate={{ width: showFullInput ? inputW : 0, opacity: showFullInput ? 1 : 0, marginRight: showFullInput ? 2 : 0 }} transition={swap} style={{ pointerEvents: showFullInput ? "auto" : "none" }}>
                        {/* Placeholder opacity is a state: 100% at rest, 95% hovered, 75% once
                            the caret lands in the field (frame 544:988). */}
                        {/* Same spring as the swap: the field has to take up the slack at the
                            exact rate the buttons give it up, or the bar visibly breathes. */}
                        <motion.input ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && inputValue.trim()) openOrContinue(inputValue.trim()); }} className="bo-input bg-transparent text-[14px] font-medium leading-none tracking-[-0.14px] outline-none" initial={false} animate={{ width: inputW }} transition={swap} style={{ color: "var(--bo-text)", caretColor: "var(--bo-text)", "--bo-ph-op": hovered ? 1 : 0.75 } as CSSProperties} placeholder={minimized ? "Continue Conversation" : "Ask anything..."} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} tabIndex={showFullInput ? 0 : -1} />
                      </motion.div>

                      {/* The actions step aside the moment a character is typed, and the send
                          arrow takes their place.
                          The outer node owns the width (collapsing it is what makes room);
                          the inner node owns the exit. Collapsing width ALONE just slid the
                          buttons under the clip edge and sliced them, so the inner node also
                          fades and shrinks toward its right edge, i.e. toward where the arrow
                          is about to appear. It keeps its natural size throughout, which is
                          what `actionsW` is measured from. */}
                      <motion.div className="flex items-center justify-end overflow-hidden" initial={false} animate={{ width: typing ? 0 : "auto" }} transition={swap} style={{ pointerEvents: typing ? "none" : "auto" }} aria-hidden={typing}>
                      <motion.div
                        ref={actionsRef}
                        className="flex shrink-0 items-center"
                        initial={false}
                        animate={{ opacity: typing ? 0 : 1, scale: typing ? 0.86 : 1 }}
                        // Out fast and immediately; back in only once the width has reopened.
                        transition={{ duration: typing ? 0.12 : 0.2, delay: typing ? 0 : 0.1, ease: [0.22, 1, 0.36, 1] }}
                        style={{ transformOrigin: "right center" }}
                      >
                      {/* At rest the secondaries carry their own inset (frame 541:399: px 8,
                          gap 4) — that inset IS the spacing to the pod edge and the primary.
                          Expanded they tuck against the input at gap 6; a lone secondary with
                          no primary drops to px 2 so the pod reads as a circle (frame 541:513).
                          On scroll the inset goes to zero: there the POD owns the padding. */}
                      {secondaries.length > 0 && (
                        // `columnGap` is not in framer's animatable set — it writes the value
                        // once at mount and never touches it again, so the gap silently never
                        // changed. It rides a plain CSS transition instead; padding still springs.
                        <motion.div
                          className="flex items-center"
                          initial={false}
                          animate={{ paddingLeft: secPadX, paddingRight: secPadX }}
                          transition={scrollEase}
                          style={{ columnGap: !compact && showFullInput ? 6 : 4, transitionProperty: "column-gap", transitionDuration: "260ms", transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)" }}
                        >
                          {secondaries.map((o) => <MorphChip key={o.key} icon={o.icon} label={o.label} compact={compact} hoverBg={secHover} filter={filter} onClick={() => activateOption(o.key)} />)}
                        </motion.div>
                      )}

                      {/* Primary morphs to the calendar chip on scroll (Figma 463:432) —
                          same 24px as the secondaries. */}
                      {primary && (
                        <motion.div className="flex shrink-0" initial={false} animate={{ marginLeft: primaryMarginLeft }} transition={scrollEase}>
                          <PrimaryMorph key="primary" label={primary.label} icon={primary.icon} booking={primary.key === "book_call"} compact={compact} theme={theme} hoverBg={secHover} filter={filter} onClick={activatePrimary} />
                        </motion.div>
                      )}
                      </motion.div>
                      </motion.div>

                      {/* Send. Same disc as the chat composer's. `onMouseDown` is swallowed so
                          the click never blurs the field out from under itself.
                          No `overflow-hidden` on the slot: a 32px disc inside a slot that is
                          still opening would be cropped to a sliver. Letting it overflow, while
                          invisible, means it only ever appears whole. */}
                      <motion.div className="flex shrink-0 items-center justify-end" initial={false} animate={{ width: typing ? 32 : 0, marginLeft: typing ? 6 : 0 }} transition={swap} style={{ pointerEvents: typing ? "auto" : "none" }} aria-hidden={!typing}>
                        <motion.button
                          type="button"
                          aria-label="Send"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => { e.stopPropagation(); sendFromPod(); }}
                          className="flex size-[32px] shrink-0 items-center justify-center rounded-full transition-[filter] duration-200 hover:brightness-110"
                          style={{ backgroundColor: "var(--bo-primary-fill)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--bo-primary-border)" }}
                          initial={false}
                          animate={{ scale: typing ? 1 : 0.6, opacity: typing ? 1 : 0 }}
                          // In only once the buttons have gone; out immediately.
                          transition={{ duration: typing ? 0.2 : 0.1, delay: typing ? 0.1 : 0, ease: [0.22, 1, 0.36, 1] }}
                          whileTap={{ scale: 0.94 }}
                          tabIndex={typing ? 0 : -1}
                        >
                          <span className="text-[14px] leading-none" style={{ color: "var(--bo-primary-text)" }}>↑</span>
                        </motion.button>
                      </motion.div>
                      </motion.div>
                    </motion.div>
                  </PulseFrame>
                  </motion.div>
                </div>
              </div>

              {/* TOP SLOT — menu / unread / nudge / suggestion, in that priority. Removed on scroll. */}
              <div className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2">
                <motion.div animate={{ opacity: compact ? 0 : 1 }} transition={slowFade} style={{ pointerEvents: compact ? "none" : "auto" }}>
                  <AnimatePresence initial={false} mode="wait">
                    {menuOpen ? (
                      <MenuPopover key="popover" menu={menu} suggestions={suggestions} onPick={openOrContinue} onOption={activateOption} theme={theme} filter={filter} tint={glassTint} width={baseW} />
                    ) : showUnreadCard ? (
                      <NudgeCard key="unread" type="notification" theme={theme} rep={REP_NAME} onCta={() => openChat("")} onClose={() => setUnreadDismissed(true)} />
                    ) : nudgeActive ? (
                      <NudgeCard key="nudge" type={nudgeType} theme={theme} onCta={() => openChat("")} onClose={() => setNudgeDismissed(true)} />
                    ) : (
                      <DemoPill key="demo" text={currentSug} filter={filter} strokeCls={strokeCls} glassStyle={glass(theme, "--bo-r-pill")} tint={glassTint} onClick={() => openOrContinue(currentSug)} />
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </div>
          </div>
        )}
      </>
    </div>
  );
}
