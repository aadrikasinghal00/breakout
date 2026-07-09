import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { THEME_LIST, type ThemeKey } from "../themes";
import { GOOGLE_FONTS } from "../fonts";

// Load a Google Font on demand (idempotent) via the Google Fonts CSS API.
const loadedFonts = new Set<string>();
export function loadFont(family: string) {
  if (!family || loadedFonts.has(family) || typeof document === "undefined") return;
  loadedFonts.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

// ---- Config model -----------------------------------------------------------

export type Slot = "off" | "menu" | "2nd" | "1st";
export type OptionDef = { key: string; label: string; icon: string };

/** The configurable actions. Each has a distinct icon + label. */
export const OPTIONS: OptionDef[] = [
  { key: "book_call", label: "Book a Call", icon: "compass" },
  { key: "roi", label: "ROI Calculator", icon: "calc" },
  { key: "video", label: "Video Library", icon: "video" },
  { key: "summarize", label: "Summarize", icon: "doc" },
];

export type NudgeType = "card" | "visual" | "mediatop" | "text" | "testimonial" | "multi";
export const NUDGE_TYPES: { key: NudgeType; label: string }[] = [
  { key: "card", label: "Card" },
  { key: "visual", label: "Visual" },
  { key: "mediatop", label: "Multimedia" },
  { key: "text", label: "Text" },
  { key: "testimonial", label: "Testimonial" },
  { key: "multi", label: "Multi-CTA" },
];

// Pulse-gradient presets = border-beam's own built-in palettes (no custom colours / no
// hue-rotation). `variant` is passed straight to BorderBeam's colorVariant; `swatch` is a
// representative chip for the picker.
export type PulseColor = "ocean" | "sunset" | "rainbow" | "mono";
export type PulseVariant = "ocean" | "sunset" | "colorful" | "mono";
export const PULSE_COLORS: { key: PulseColor; label: string; swatch: string; variant: PulseVariant }[] = [
  { key: "ocean", label: "Ocean", swatch: "linear-gradient(90deg,#38bdf8,#3b82f6,#8b5cf6)", variant: "ocean" },
  { key: "sunset", label: "Sunset", swatch: "linear-gradient(90deg,#f59e0b,#f97316,#ef4444)", variant: "sunset" },
  { key: "rainbow", label: "Rainbow", swatch: "linear-gradient(90deg,#f472b6,#facc15,#34d399,#38bdf8,#a78bfa)", variant: "colorful" },
  { key: "mono", label: "Mono", swatch: "linear-gradient(90deg,#e5e5e5,#a3a3a3,#525252)", variant: "mono" },
];
export const pulsePreset = (k: PulseColor) => PULSE_COLORS.find((c) => c.key === k) ?? PULSE_COLORS[0];

/** Suggestions shown by the widget, per simulated page. */
export const SUGGESTIONS_BY_PAGE: Record<string, string[]> = {
  Home: ["What does this platform do?", "What can you help me with?", "Take a product tour", "Book a demo"],
  Pricing: ["Calculate my ROI", "What's included in each plan?", "Compare plans for my team"],
  Blog: ["Summarize this whole article", "What are the key takeaways?", "Show me related posts"],
  Product: ["Take a product tour", "How does it work?", "How can it help my company?"],
};

/** The default agent avatar shown when the customer opts out of using their own logo. */
export const DEFAULT_AGENT = { src: "/breakout/agent.svg", bg: "linear-gradient(145deg,#2b2b30,#141416)", pad: "26%" };

export type Config = {
  theme: ThemeKey;
  page: string;
  visitor: string;
  repOnline: boolean;
  /** false → show DEFAULT_AGENT instead of the brand logo mark. */
  useLogo: boolean;
  nudge: boolean;
  nudgeType: NudgeType;
  pulse: boolean;
  pulseColor: PulseColor;
  /** "" = use the theme default; otherwise a hex like "#8706ef" for the primary CTA. */
  primaryColor: string;
  /** "" = use the default UI font; otherwise a Google Font family name. */
  font: string;
  slots: Record<string, Slot>;
  /** When every block is off (the "Ask anything" state): keep that pod on scroll, or
   *  remove it entirely once the page scrolls. Only relevant when nothing is 1st/2nd. */
  askOnScroll: boolean;
};

export const DEFAULT_CONFIG: Config = {
  theme: "default",
  page: "Home",
  visitor: "Anonymous",
  repOnline: false,
  useLogo: true,
  nudge: false,
  nudgeType: "card",
  pulse: false,
  pulseColor: "ocean",
  primaryColor: "",
  font: "",
  slots: { book_call: "1st", summarize: "2nd", roi: "menu", video: "menu" },
  askOnScroll: true,
};

/** Move an option into a slot. Enforces a single primary (old 1st → 2nd). */
export function setSlot(config: Config, key: string, value: Slot): Config {
  const slots = { ...config.slots };
  if (value === "1st") {
    for (const k of Object.keys(slots)) if (slots[k] === "1st") slots[k] = "2nd";
  }
  slots[key] = value;
  return { ...config, slots };
}

export const primaryOption = (c: Config): OptionDef | null =>
  OPTIONS.find((o) => c.slots[o.key] === "1st") ?? null;
export const secondaryOptions = (c: Config): OptionDef[] =>
  OPTIONS.filter((o) => c.slots[o.key] === "2nd");
export const menuOptions = (c: Config): OptionDef[] =>
  OPTIONS.filter((o) => c.slots[o.key] === "menu");

// ---- Inline icons -----------------------------------------------------------

const ico = "h-[14px] w-[14px]";
const Person = () => (
  <svg className={ico} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
);
const Building = () => (
  <svg className={ico} viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="14" height="18" rx="1" /><rect x="9" y="7" width="2" height="2" fill="#fff" /><rect x="13" y="7" width="2" height="2" fill="#fff" /><rect x="9" y="11" width="2" height="2" fill="#fff" /><rect x="13" y="11" width="2" height="2" fill="#fff" /></svg>
);
const Repeat = () => (
  <svg className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v4h4" /></svg>
);
const Gear = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
);
const Chevron = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
);

// ---- Building blocks --------------------------------------------------------

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[8px]">
      <span className="text-[10px] font-semibold uppercase tracking-[0.6px] text-[#a0a0a0]">{label}</span>
      {children}
    </div>
  );
}

const springSoft = { type: "spring", stiffness: 420, damping: 34 } as const;

/** iOS-style toggle switch. */
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="relative h-[24px] w-[42px] shrink-0 rounded-full transition-colors duration-300"
      style={{ backgroundColor: on ? "#111" : "#dcdcdc" }}
    >
      <motion.span className="absolute top-[2px] size-[20px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)]" animate={{ left: on ? 20 : 2 }} transition={springSoft} />
    </button>
  );
}

/** A labelled row with a control on the right. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-[10px]">
      <span className="text-[13px] text-[#1d1d1d]">{label}</span>
      {children}
    </div>
  );
}

const VISITORS = [
  { key: "Anonymous", icon: <Person /> },
  { key: "Known company", icon: <Building /> },
  { key: "Repeat visitor", icon: <Repeat /> },
];

function Dropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const active = VISITORS.find((v) => v.key === value) ?? VISITORS[0];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-[8px] rounded-[10px] bg-[#f0f0f0] px-[12px] py-[10px] text-[13px] font-medium text-[#1d1d1d] transition-colors hover:bg-[#e9e9e9]"
      >
        <span className="flex items-center gap-[8px]">{active.icon} {active.key}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={springSoft}><Chevron className="h-[14px] w-[14px] text-[#8a8a8a]" /></motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={springSoft}
              className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 flex flex-col gap-[2px] rounded-[12px] bg-white p-[6px] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.28)] ring-1 ring-black/5"
            >
              {VISITORS.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => { onChange(v.key); setOpen(false); }}
                  className={`flex items-center gap-[8px] rounded-[8px] px-[10px] py-[8px] text-left text-[13px] font-medium transition-colors ${value === v.key ? "bg-[#111] text-white" : "text-[#1d1d1d] hover:bg-[#f0f0f0]"}`}
                >
                  {v.icon} {v.key}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

const PAGES = ["Home", "Pricing", "Blog", "Product"];

/** Sliding tab bar for the page selector. */
function Tabs({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-[2px] rounded-[10px] bg-[#f0f0f0] p-[3px]">
      {PAGES.map((pg) => (
        <button
          key={pg}
          type="button"
          onClick={() => onChange(pg)}
          className={`relative flex-1 rounded-[7px] py-[7px] text-[12px] font-medium transition-colors ${value === pg ? "text-white" : "text-[#8a8a8a] hover:text-[#4a4a4a]"}`}
        >
          {value === pg && <motion.span layoutId="page-tab" className="absolute inset-0 rounded-[7px] bg-[#111]" transition={{ type: "spring", stiffness: 480, damping: 36 }} />}
          <span className="relative">{pg}</span>
        </button>
      ))}
    </div>
  );
}

const SEG: Slot[] = ["off", "menu", "2nd", "1st"];
const SEG_LABEL: Record<Slot, string> = { off: "Off", menu: "Menu", "2nd": "2nd", "1st": "1st" };

function Segmented({ id, value, onChange }: { id: string; value: Slot; onChange: (v: Slot) => void }) {
  return (
    <div className="flex items-center gap-[1px] rounded-[9px] bg-[#f0f0f0] p-[2px]">
      {SEG.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`relative rounded-[7px] px-[8px] py-[4px] text-[11px] font-medium transition-colors ${value === s ? "text-white" : "text-[#9a9a9a] hover:text-[#4a4a4a]"}`}
        >
          {value === s && <motion.span layoutId={`${id}-thumb`} className="absolute inset-0 rounded-[7px] bg-[#111]" transition={{ type: "spring", stiffness: 520, damping: 36 }} />}
          <span className="relative">{SEG_LABEL[s]}</span>
        </button>
      ))}
    </div>
  );
}

/** Full color picker: the swatch opens the native OS palette (drag + hex, like Figma);
 *  the field accepts a typed hex; Reset falls back to the theme default. */
function ColorField({ value, fallback, onChange }: { value: string; fallback: string; onChange: (v: string) => void }) {
  const current = /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
  return (
    <div className="flex items-center gap-[8px]">
      <label className="relative size-[30px] shrink-0 cursor-pointer overflow-hidden rounded-[8px] ring-1 ring-black/10" style={{ backgroundColor: current }}>
        <input type="color" value={current} onChange={(e) => onChange(e.target.value)} className="absolute -inset-[4px] cursor-pointer opacity-0" />
      </label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={fallback} className="w-full rounded-[8px] bg-[#f0f0f0] px-[10px] py-[8px] text-[12px] font-medium uppercase text-[#1d1d1d] outline-none" />
      {value && <button type="button" onClick={() => onChange("")} className="shrink-0 text-[11px] font-medium text-[#8a8a8a] transition-colors hover:text-[#111]">Reset</button>}
    </div>
  );
}

/** Searchable font picker over the Google Fonts library. Previews each font (loaded
 *  on hover) and applies the chosen one. */
function FontPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const list = q ? GOOGLE_FONTS.filter((f) => f.toLowerCase().includes(q.toLowerCase())) : GOOGLE_FONTS;
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-[8px] rounded-[10px] bg-[#f0f0f0] px-[12px] py-[10px] text-[13px] font-medium text-[#1d1d1d] transition-colors hover:bg-[#e9e9e9]" style={{ fontFamily: value ? `'${value}', sans-serif` : undefined }}>
        <span className="truncate">{value || "Default (Inter)"}</span>
        <Chevron className="h-[14px] w-[14px] shrink-0 text-[#8a8a8a]" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={springSoft} className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 flex flex-col rounded-[12px] bg-white p-[6px] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.28)] ring-1 ring-black/5">
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search fonts…" className="mb-[4px] rounded-[8px] bg-[#f4f4f4] px-[10px] py-[7px] text-[13px] outline-none" />
              <div className="flex max-h-[220px] flex-col gap-[1px] overflow-y-auto [scrollbar-width:thin]">
                <button type="button" onClick={() => { onChange(""); setOpen(false); }} className={`shrink-0 rounded-[8px] px-[10px] py-[7px] text-left text-[13px] ${!value ? "bg-[#111] text-white" : "text-[#1d1d1d] hover:bg-[#f0f0f0]"}`}>Default (Inter)</button>
                {list.map((f) => (
                  <button key={f} type="button" onMouseEnter={() => loadFont(f)} onClick={() => { loadFont(f); onChange(f); setOpen(false); }} className={`shrink-0 rounded-[8px] px-[10px] py-[7px] text-left text-[13px] ${value === f ? "bg-[#111] text-white" : "text-[#1d1d1d] hover:bg-[#f0f0f0]"}`} style={{ fontFamily: `'${f}', sans-serif` }}>{f}</button>
                ))}
                {list.length === 0 && <span className="px-[10px] py-[7px] text-[12px] text-[#9a9a9a]">No match</span>}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- Panel ------------------------------------------------------------------

function PanelBody({ config, onChange }: { config: Config; onChange: (next: Config) => void }) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  // Every block off → the widget is in its "Ask anything" state; expose the on-scroll choice.
  const allBlocksOff = !OPTIONS.some((o) => config.slots[o.key] === "1st" || config.slots[o.key] === "2nd");
  const num = (n: number) => (
    <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#111] text-[10px] font-semibold text-white">{n}</span>
  );

  return (
    <div className="flex flex-col gap-[16px]">
      <Group label="Website / Theme">
        <div className="grid grid-cols-3 gap-[6px]">
          {THEME_LIST.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => set({ theme: t.key })}
              className="overflow-hidden rounded-[10px] transition-transform"
              style={{ outline: config.theme === t.key ? "2px solid #111" : "2px solid transparent", outlineOffset: 1 }}
            >
              <div className="h-[44px] w-full bg-cover bg-top" style={{ backgroundImage: `url(${t.bgImage})`, backgroundColor: t.bgColor }} />
              <span className="block bg-white py-[3px] text-center text-[10px] font-medium text-[#1d1d1d]">{t.label}</span>
            </button>
          ))}
        </div>
      </Group>

      <div className="h-px bg-[#eee]" />

      <div className="flex items-center gap-[8px]">{num(1)}<span className="text-[14px] font-semibold">Simulate the visit</span></div>

      <Group label="Page"><Tabs value={config.page} onChange={(p) => set({ page: p })} /></Group>

      <Group label="Visitor"><Dropdown value={config.visitor} onChange={(v) => set({ visitor: v })} /></Group>

      <Row label="Sales rep online"><Toggle on={config.repOnline} onChange={(v) => set({ repOnline: v })} /></Row>

      <div className="h-px bg-[#eee]" />

      <div className="flex items-center gap-[8px]">{num(2)}<span className="text-[14px] font-semibold">Customer setup</span></div>

      <Group label="Blocks">
        <div className="flex flex-col gap-[10px]">
          {OPTIONS.map((o) => (
            <div key={o.key} className="flex items-center justify-between gap-[8px]">
              <span className="text-[13px] text-[#1d1d1d]">{o.label}</span>
              <Segmented id={o.key} value={config.slots[o.key]} onChange={(v) => onChange(setSlot(config, o.key, v))} />
            </div>
          ))}
        </div>
      </Group>

      <AnimatePresence initial={false}>
        {allBlocksOff && (
          <motion.div key="ask-scroll" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={springSoft} className="overflow-hidden">
            <Row label={"Keep “Ask anything” on scroll"}><Toggle on={config.askOnScroll} onChange={(v) => set({ askOnScroll: v })} /></Row>
          </motion.div>
        )}
      </AnimatePresence>

      <Group label="Left icon">
        <div className="flex gap-[6px]">
          {[
            { on: true, label: "Brand logo" },
            { on: false, label: "Agent icon" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => set({ useLogo: o.on })}
              className={`flex-1 rounded-[9px] py-[9px] text-[12px] font-medium transition-colors ${config.useLogo === o.on ? "bg-[#111] text-white" : "bg-[#f0f0f0] text-[#4a4a4a] hover:bg-[#e7e7e7]"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </Group>

      <div className="h-px bg-[#eee]" />

      <Row label="Nudge"><Toggle on={config.nudge} onChange={(v) => set({ nudge: v })} /></Row>
      <AnimatePresence initial={false}>
        {config.nudge && (
          <motion.div key="nudge-types" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ type: "spring", stiffness: 420, damping: 36 }} className="overflow-hidden">
            <div className="flex flex-wrap gap-[6px] pt-[2px]">
              {NUDGE_TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => set({ nudgeType: t.key })}
                  className={`rounded-[8px] px-[10px] py-[6px] text-[12px] font-medium transition-colors ${config.nudgeType === t.key ? "bg-[#111] text-white" : "bg-[#f0f0f0] text-[#4a4a4a] hover:bg-[#e7e7e7]"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-px bg-[#eee]" />

      <Row label="Pulse gradient"><Toggle on={config.pulse} onChange={(v) => set({ pulse: v })} /></Row>
      <AnimatePresence initial={false}>
        {config.pulse && (
          <motion.div key="pulse-colors" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ type: "spring", stiffness: 420, damping: 36 }} className="overflow-hidden">
            <div className="flex flex-wrap gap-[6px] pt-[2px]">
              {PULSE_COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => set({ pulseColor: c.key })}
                  className={`flex items-center gap-[6px] rounded-[8px] py-[6px] pl-[7px] pr-[10px] text-[12px] font-medium transition-colors ${config.pulseColor === c.key ? "bg-[#111] text-white" : "bg-[#f0f0f0] text-[#4a4a4a] hover:bg-[#e7e7e7]"}`}
                >
                  <span className="size-[13px] shrink-0 rounded-full ring-1 ring-black/10" style={{ background: c.swatch }} />
                  {c.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-px bg-[#eee]" />

      <Group label="Primary button color">
        <ColorField value={config.primaryColor} fallback="#5b5bd6" onChange={(v) => set({ primaryColor: v })} />
      </Group>

      <Group label="Font">
        <FontPicker value={config.font} onChange={(v) => { loadFont(v); set({ font: v }); }} />
      </Group>
    </div>
  );
}

export default function ConfigPanel({ config, onChange }: { config: Config; onChange: (next: Config) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ fontFamily: "-apple-system, 'SF Pro Display', system-ui, sans-serif" }}>
      {/* Gear — collapses / expands the panel */}
      <motion.button
        type="button"
        aria-label="Settings"
        onClick={() => setOpen((o) => !o)}
        className="fixed left-[20px] top-[20px] z-40 flex size-[44px] items-center justify-center rounded-full bg-white text-[#1d1d1d] shadow-[0_8px_24px_-6px_rgba(0,0,0,0.3)] ring-1 ring-black/5"
        whileTap={{ scale: 0.92 }}
        animate={{ rotate: open ? 90 : 0 }}
        transition={springSoft}
      >
        <Gear className="size-[20px]" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* invisible click-catcher — no page dimming, just close-on-outside-click */}
            <div onClick={() => setOpen(false)} className="fixed inset-0 z-30" />
            <motion.div
              data-config-panel
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              style={{ transformOrigin: "top left", maxHeight: "calc(100vh - 84px)" }}
              className="fixed left-[20px] top-[76px] z-40 w-[288px] overflow-y-auto rounded-[22px] bg-white p-[18px] text-[#1d1d1d] shadow-[0_20px_60px_-12px_rgba(0,0,0,0.4)] ring-1 ring-black/5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <PanelBody config={config} onChange={onChange} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
