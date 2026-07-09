import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { BorderBeam } from "border-beam";
import { pulsePreset, DEFAULT_AGENT, type NudgeType, type OptionDef, type PulseColor } from "./ConfigPanel";
import type { Theme } from "../themes";
import ChatPanel, { type Msg, type Rep, type Conversation } from "./ChatPanel";
import SuccessCard from "./SuccessCard";
import NudgeCard from "./NudgeCard";

const morph = { type: "spring", stiffness: 300, damping: 32, mass: 0.9 } as const;
// A slower, softer settle for the scroll shrink — Apple-like, very velvet.
const scrollEase = { type: "spring", stiffness: 150, damping: 26, mass: 1.15 } as const;
// The hover→expand of the input: a well-damped spring (no overshoot) so the frame
// grows in one smooth motion rather than wobbling/re-settling.
const hoverEase = { type: "spring", stiffness: 260, damping: 38, mass: 0.9 } as const;
const slowFade = { duration: 0.5, ease: [0.22, 1, 0.36, 1] } as const;
// Subtle vertical roll for the rotating suggestion text (new rises from below, old lifts up).
const roll = { type: "spring", stiffness: 300, damping: 34, mass: 0.85 } as const;

// Every view is absolutely anchored to the same bottom-center point and only
// grows upward — so the input frame stays "set in stone", never repositioning.
const anchor = "absolute bottom-0 left-0 flex flex-col items-center";
const grow = {
  initial: { opacity: 0, y: 12, scale: 0.98, x: "-50%" },
  animate: { opacity: 1, y: 0, scale: 1, x: "-50%" },
  exit: { opacity: 0, y: 8, scale: 0.985, x: "-50%" },
  transition: { type: "spring", stiffness: 320, damping: 34, mass: 0.8 } as const,
  style: { transformOrigin: "bottom center" } as CSSProperties,
};

export const ICONS: Record<string, string> = {
  doc: "/breakout/doc.svg",
  compass: "/breakout/compass.svg",
  calc: "/breakout/calc.svg",
  video: "/breakout/video.svg",
};

const border: CSSProperties = { borderWidth: 1, borderStyle: "solid", borderColor: "var(--bo-border)" };
const glass = (r: string): CSSProperties => ({
  ...border,
  backgroundColor: "var(--bo-fill)",
  backdropFilter: "blur(var(--bo-blur))",
  WebkitBackdropFilter: "blur(var(--bo-blur))",
  boxShadow: "var(--bo-shadow)",
  borderRadius: `var(${r})`,
});

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
function PulseFrame({ on, color, radius, children }: { on: boolean; color: PulseColor; radius: number; children: ReactNode }) {
  if (!on) return <>{children}</>;
  const p = pulsePreset(color);
  return (
    <BorderBeam
      size="pulse-inner"
      colorVariant={p.variant}
      strength={1.15}
      brightness={2}
      saturation={1.9}
      staticColors={p.variant === "mono"}
      borderRadius={radius}
      duration={2.8}
    >
      {children}
    </BorderBeam>
  );
}
const podRadius = (theme: Theme) => parseInt(theme.vars["--bo-r-pod"] ?? "60", 10) || 60;

// Secondary chip that MORPHS between the default 32px rounded-square and the 24px
// circular on-scroll form (designs 435:233 → 448:383). Animated size + radius, so the
// bar never hard-swaps — it just resizes.
function MorphChip({ icon, compact, filter, hoverBg, onClick }: { icon: string; compact: boolean; filter: string; hoverBg: string; onClick?: () => void }) {
  return (
    <motion.button type="button" onClick={onClick} className="group relative flex shrink-0 items-center justify-center overflow-hidden" animate={{ width: compact ? 24 : 32, height: compact ? 24 : 32, borderRadius: compact ? 12 : 10 }} transition={scrollEase}>
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100" style={{ backgroundColor: hoverBg }} />
      <motion.img src={ICONS[icon]} alt="" className="relative shrink-0" animate={{ width: compact ? 16 : 20, height: compact ? 16 : 20 }} transition={scrollEase} style={{ filter }} />
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
    <motion.button key="demo" type="button" onClick={onClick} className={`${strokeCls} group relative flex h-[28px] items-center justify-center gap-[8px] overflow-hidden pl-[8px] pr-[10px]`} style={glassStyle} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={slowFade}>
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

// Primary CTA that MORPHS between the full "Book a Call" button and the calendar mark on
// scroll. On scroll it takes the SECONDARY treatment — the primary fill + border fade to
// nothing (transparent), the label crossfades to the calendar icon (theme colour, no fill).
// One element, so the shape springs smoothly. Maintained across every state.
function PrimaryMorph({ label, compact, theme, hoverBg, onClick }: { label: string; compact: boolean; theme: Theme; hoverBg: string; onClick?: () => void }) {
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
    <motion.button type="button" onClick={onClick} className="group relative flex shrink-0 items-center justify-center overflow-hidden" style={{ borderWidth: 1, borderStyle: "solid" }} animate={{ width: compact ? 24 : expandedW, height: compact ? 24 : 36, borderRadius: compact ? 12 : btnR, borderColor: compact ? "rgba(255,255,255,0)" : "rgba(255,255,255,0.2)" }} transition={scrollEase}>
      {/* primary fill — fades to NONE on scroll (compact = secondary treatment, no fill) */}
      <motion.span className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ backgroundColor: "var(--bo-primary-fill)" }} animate={{ opacity: compact ? 0 : 1 }} transition={scrollEase} />
      {/* hover overlay — primary darken when filled, secondary tint when a chip */}
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100" style={{ backgroundColor: compact ? hoverBg : primaryDark }} />
      <span ref={textRef} className="pointer-events-none invisible absolute whitespace-nowrap text-[14px] font-medium tracking-[-0.14px]">{label}</span>
      <motion.span className="relative whitespace-nowrap text-[14px] font-medium leading-none tracking-[-0.14px]" style={{ color: "var(--bo-primary-text)", textShadow: "var(--bo-primary-text-shadow, 0px 0.3px 0px #ffffff)" }} animate={{ opacity: compact ? 0 : 1 }} transition={{ duration: 0.2, ease: "easeInOut" }}>{label}</motion.span>
      <motion.span className="pointer-events-none absolute flex items-center justify-center" animate={{ opacity: compact ? 1 : 0 }} transition={{ duration: 0.2, ease: "easeInOut" }}><CalendarIcon className="size-[16px]" /></motion.span>
    </motion.button>
  );
}


type LogoDef = { src: string; bg?: string; pad?: string };
function Logo({ px, rep, theme, logo, showRepDot = true }: { px: number; rep?: boolean; theme: Theme; logo?: LogoDef; showRepDot?: boolean }) {
  // NetApp (logoSquare) → rounded square that follows the pod corner radius. Others → circle.
  const radius = theme.logoSquare ? Math.round(podRadius(theme) * (px / 48)) : px >= 40 ? 56.25 : 39.375;
  const box = px >= 40 ? "inset 0px -2px 3px 0px rgba(255,255,255,0.2), inset 0px 2px 3px 0px rgba(255,255,255,0.2)" : "inset 0px -1.4px 2.1px 0px rgba(255,255,255,0.2), inset 0px 1.4px 2.1px 0px rgba(255,255,255,0.2)";
  const L = logo ?? theme.logo;
  return (
    <div className="pointer-events-none relative shrink-0" style={{ width: px, height: px }}>
      <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: radius, boxShadow: "var(--bo-shadow)" }}>
        {rep ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#f0a8b8] to-[#b06b8a] font-semibold text-white" style={{ fontSize: px * 0.42 }}>S</div>
        ) : L.bg ? (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: L.bg }}>
            <img src={L.src} alt="" className="size-full object-contain" style={{ padding: L.pad ?? "26%" }} />
          </div>
        ) : (
          <img src={L.src} alt="Breakout" className="absolute inset-0 size-full object-contain" />
        )}
        <div className="absolute inset-0" style={{ borderRadius: radius, boxShadow: box }} />
      </div>
      {rep && showRepDot && <span className="absolute block rounded-full" style={{ width: Math.round(px * 0.25), height: Math.round(px * 0.25), right: 0, bottom: 0, background: "#41E2A4" }} />}
    </div>
  );
}


function MenuPopover({ menu, suggestions, onPick, theme, filter, tint, width }: { menu: OptionDef[]; suggestions: string[]; onPick: (t: string) => void; theme: Theme; filter: string; tint: string; width?: number }) {
  return (
    <motion.div key="popover" className={`${theme.gradientStroke ? "glass-stroke" : ""} flex flex-col gap-[16px] p-[12px]`} style={{ ...glass("--bo-r-card"), transformOrigin: "bottom center", width }} initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.97 }} transition={morph}>
      {menu.length > 0 && (
        <div className="flex flex-col gap-[8px] pl-[4px]">
          <p className="text-[12px] font-medium leading-none opacity-[0.54]" style={{ color: "var(--bo-text)" }}>Explore more</p>
          <div className="flex flex-wrap gap-[10px]">
            {menu.map((o) => (
              <button key={o.key} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(o.label)} className="group relative flex items-center gap-[8px] overflow-hidden rounded-[40px] px-[10px] py-[4px]" style={{ backgroundColor: "var(--bo-sec-hover)" }}>
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
  primaryColor = "",
  font = "",
  suggestions,
  theme,
  nudge = false,
  nudgeType = "card",
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
  primaryColor?: string;
  font?: string;
  suggestions: string[];
  theme: Theme;
  nudge?: boolean;
  nudgeType?: NudgeType;
  pulse?: boolean;
  pulseColor?: PulseColor;
}) {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  // Scroll shrink: scrolling the page shrinks the widget to its compact bar; it restores
  // ~1s after scrolling stops.
  const [scrolledLocal, setScrolledLocal] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [thinking, setThinking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sugIdx, setSugIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  // The suggestion/nudge card on top matches the width of the base row below it.
  const baseRef = useRef<HTMLDivElement>(null);
  const [baseW, setBaseW] = useState<number>();

  useEffect(() => { setNudgeDismissed(false); }, [nudge, nudgeType]);

  useLayoutEffect(() => {
    const el = baseRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => setBaseW(el.offsetWidth);
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
  const committed = focused;
  // On scroll the default widget collapses to its compact bar (mark + icon chips,
  // design 327:367). Focusing the input, or hovering, un-compacts it.
  const compact = (scrolled || scrolledLocal) && !committed;
  // The input frame expands on HOVER (and stays open while focused/typing).
  const expanded = focused || (hovered && !compact);
  // "Just ask" state (frame 482:436): no primary AND no secondaries → the pod is a
  // permanent "Ask anything…" input instead of an empty (broken) pill.
  const noModules = !primary && secondaries.length === 0;
  const showFullInput = noModules || expanded;
  // "Ask anything" state, scrolled, and the config says drop it on scroll → hide the base.
  const hideAskOnScroll = noModules && compact && !askOnScroll;
  const rep: Rep = repActive ? { name: "Sarah" } : null;
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
      setMessages((m) => [...m, { from: "ai", text: repActive ? "Happy to help! Want me to grab a 15-min slot on my calendar to walk you through it?" : "Great — the Growth plan fits your team best. Want me to book a quick 15-min call to walk through it?", cta: "Book a call" }]);
    }, 1900);
  };
  const openChat = (text: string) => {
    setSuccess(false);
    setChatOpen(true);
    setMinimized(false);
    setNudgeDismissed(true);
    setInputValue("");
    setMessages([
      { from: "ai", text: repActive ? "Hi Maya, Sarah here from the team 👋\n\nI see you're on the Pricing Page — want a hand picking the right plan?" : "Hi Maya, you're speaking with Breakout AI Agent.\n\nI see you're on the Pricing Page, want me to give you an in-depth suggestion of which pricing will be best for you?" },
      { from: "user", text: text || "Yes, sure please" },
    ]);
    aiReply();
  };
  const sendInChat = (text: string) => { setMessages((m) => [...m, { from: "user", text }]); aiReply(); };
  // Pick a past conversation from the header history dropdown → load a recap of it.
  const selectHistory = (c: Conversation) => {
    setThinking(false);
    setMessages([
      { from: "user", text: c.title },
      { from: "ai", text: `Picking up where we left off on “${c.title}”. Want me to continue from here?`, cta: "Book a call" },
    ]);
  };
  const closeChat = () => { setChatOpen(false); setMinimized(false); setScrolledLocal(false); setSuccess(false); setThinking(false); setFocused(false); setMessages([]); };
  const minimizeChat = () => { setChatOpen(false); setSuccess(false); setFocused(false); setScrolledLocal(false); setMinimized(true); };
  // While minimized the widget looks like its resting state; interacting REOPENS the same
  // conversation (messages preserved) rather than starting a new one, optionally sending text.
  const continueChat = (text: string) => { setMinimized(false); setChatOpen(true); if (text.trim()) sendInChat(text.trim()); };
  const openOrContinue = (text: string) => (minimized ? continueChat(text) : openChat(text));

  // Live refs so the window/document listeners always read the current phase.
  const chatVisibleRef = useRef(false);
  chatVisibleRef.current = chatOpen || success;
  const minimizedRef = useRef(false);
  minimizedRef.current = minimized;
  useEffect(() => {
    const inside = (t: EventTarget | null) => !!(rootRef.current && t instanceof Node && rootRef.current.contains(t));
    // Scrolling / clicking the config panel must NOT drive the widget's scroll state.
    const ignore = (t: EventTarget | null) => inside(t) || (t instanceof Element && !!t.closest("[data-config-panel]"));
    const toMinimized = () => { setChatOpen(false); setSuccess(false); setFocused(false); setScrolledLocal(false); setMinimized(true); };
    let idle: number | undefined;
    // Scrolling the page/backdrop shrinks the widget's on-scroll state, then restores
    // ~1s after scrolling stops. Never fires from the config panel or an open chat.
    const onShrink = (e?: Event) => {
      if (e && ignore(e.target)) return;
      if (chatVisibleRef.current) return; // don't compact while the chat panel is open
      setScrolledLocal(true);
      window.clearTimeout(idle);
      idle = window.setTimeout(() => setScrolledLocal(false), 1000);
    };
    // Clicking outside the widget (on our page) collapses an open chat → 435:233.
    const onDown = (e: MouseEvent) => { if (ignore(e.target)) return; if (chatVisibleRef.current) toMinimized(); };
    // Engaging the site behind (a cross-origin iframe steals window focus) is the only
    // signal we get for "touched the page" there — collapse a chat, else treat as scroll.
    const onBlur = () => { if (chatVisibleRef.current) toMinimized(); else onShrink(); };
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
  const view = success ? "success" : chatOpen ? "chat" : "full";

  // Hover-intent latch: the pod resizes as it expands, which can momentarily flick the
  // pointer past an edge and fire a spurious hoverEnd. Delay clearing hover briefly so a
  // re-enter cancels it — the expand/collapse never stutters at the boundary.
  const hoverTimer = useRef<number | undefined>(undefined);
  const enterHover = () => { window.clearTimeout(hoverTimer.current); setHovered(true); };
  const leaveHover = () => { hoverTimer.current = window.setTimeout(() => setHovered(false), 130); };

  return (
    <div ref={rootRef} className="relative" style={{ ...(theme.vars as CSSProperties), ...(primaryColor ? { "--bo-primary-fill": primaryColor } as CSSProperties : {}), ...(primaryColor && readableTextFor(primaryColor) ? { "--bo-primary-text": readableTextFor(primaryColor)!.text, "--bo-primary-text-shadow": readableTextFor(primaryColor)!.shadow } as CSSProperties : {}), ...(font ? { fontFamily: `'${font}', system-ui, sans-serif` } : {}) }} onMouseEnter={() => setScrolledLocal(false)} onMouseLeave={() => setHovered(false)}>
      <AnimatePresence initial={false}>
        {view === "success" && <motion.div key="success" className={anchor} {...grow}><SuccessCard theme={theme} logo={activeLogo} onClose={closeChat} onContinue={closeChat} /></motion.div>}

        {view === "chat" && <motion.div key="chat" className={anchor} {...grow}><ChatPanel theme={theme} logo={activeLogo} rep={rep} messages={messages} thinking={thinking} onSend={sendInChat} onCta={() => setSuccess(true)} onClose={closeChat} onMinimize={minimizeChat} cta={primary?.label} onSelectHistory={selectHistory} /></motion.div>}

        {view === "full" && (
          <motion.div key="full" className="absolute bottom-0 left-0" {...grow}>
            {/* On scroll the frame MORPHS down (no frame scale, so nothing gets uneven):
                the mark shrinks and the secondaries + primary become equal 24px chips —
                exactly like the minimized scroll state. Suggestion is removed. */}
            <div className="relative flex flex-col items-center">
              <div className="flex flex-col items-center">
                <div ref={baseRef} className="flex items-center gap-[8px]">
                  {/* Mark morphs 40→28 on scroll — EXCEPT in the "Ask anything" state, where
                      it stays full size and reserves the pod's height (48) so dropping the pod
                      on scroll never shrinks or re-drops the logo. */}
                  <motion.div className="flex shrink-0 items-center justify-center overflow-hidden" animate={{ width: compact && !noModules ? 28 : 40, height: compact && !noModules ? 36 : 48 }} transition={scrollEase}>
                    <motion.div className="origin-center shrink-0" animate={{ scale: compact && !noModules ? 0.7 : 1 }} transition={scrollEase}>
                      <Logo px={40} rep={repActive} theme={theme} logo={activeLogo} />
                    </motion.div>
                  </motion.div>
                  {/* Empty state, scrolled, "keep on scroll" off → hide the pod but keep its
                      footprint (fade in place) so the logo mark never shifts — stays put. */}
                  <motion.div animate={{ opacity: hideAskOnScroll ? 0 : 1 }} transition={scrollEase} style={{ pointerEvents: hideAskOnScroll ? "none" : "auto" }}>
                  <PulseFrame on={pulse} color={pulseColor} radius={podRadius(theme)}>
                    <motion.div className={`${strokeCls} flex items-center overflow-hidden ${compact ? "gap-[4px]" : "gap-[6px]"} ${showFullInput ? "" : "cursor-text"}`} style={glass("--bo-r-pod")} animate={{ height: compact && !noModules ? 36 : 48, paddingTop: 6, paddingBottom: 6, paddingLeft: compact && !noModules ? 8 : showFullInput ? 15 : 6, paddingRight: compact && !noModules ? 8 : 6 }} transition={scrollEase} onHoverStart={enterHover} onHoverEnd={leaveHover} onClick={() => inputRef.current?.focus()}>
                      {/* Input stays mounted (width springs 0↔190) so expanding never
                          inserts a node mid-animation — no reflow stutter. It's inert
                          (pointer-events none, width 0) at rest, so no layout shift. */}
                      <motion.div className="overflow-hidden" initial={false} animate={{ width: showFullInput ? 200 : 0, opacity: showFullInput ? 1 : 0, marginRight: showFullInput ? 2 : compact ? -4 : -6 }} transition={hoverEase} style={{ pointerEvents: showFullInput ? "auto" : "none" }}>
                        <input ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && inputValue.trim()) openOrContinue(inputValue.trim()); }} className="w-[200px] bg-transparent text-[14px] font-medium leading-none tracking-[-0.14px] outline-none placeholder:text-[var(--bo-text)] placeholder:opacity-30" style={{ color: "var(--bo-text)", caretColor: "var(--bo-text)" }} placeholder={minimized ? "Continue Conversations" : noModules ? "Ask anything..." : "Type something here"} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} tabIndex={showFullInput ? 0 : -1} />
                      </motion.div>

                      {secondaries.length > 0 && (
                        <div className={`flex items-center ${compact ? "gap-[4px]" : "gap-[6px]"}`} style={{ marginLeft: !compact && !showFullInput ? 8 : 0 }}>
                          {secondaries.map((o) => <MorphChip key={o.key} icon={o.icon} compact={compact} hoverBg={secHover} filter={filter} onClick={() => openOrContinue("")} />)}
                        </div>
                      )}

                      {/* Primary morphs to the calendar chip on scroll (Figma 463:432) —
                          same 24px as the secondaries. */}
                      {primary && <PrimaryMorph key="primary" label={primary.label} compact={compact} theme={theme} hoverBg={secHover} onClick={() => openOrContinue("")} />}
                    </motion.div>
                  </PulseFrame>
                  </motion.div>
                </div>
              </div>

              {/* TOP SLOT — suggestion / nudge / menu. Removed on scroll. */}
              <div className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2">
                <motion.div animate={{ opacity: compact ? 0 : 1 }} transition={slowFade} style={{ pointerEvents: compact ? "none" : "auto" }}>
                  <AnimatePresence initial={false} mode="wait">
                    {committed ? (
                      <MenuPopover key="popover" menu={menu} suggestions={suggestions} onPick={openOrContinue} theme={theme} filter={filter} tint={glassTint} width={baseW} />
                    ) : nudgeActive ? (
                      <NudgeCard key="nudge" type={nudgeType} theme={theme} onCta={() => openChat("")} onClose={() => setNudgeDismissed(true)} />
                    ) : (
                      <DemoPill key="demo" text={currentSug} filter={filter} strokeCls={strokeCls} glassStyle={glass("--bo-r-pill")} tint={glassTint} onClick={() => openOrContinue(currentSug)} />
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
