import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { Theme } from "../themes";
import { glass, glassEdge } from "../glass";
import { MARK_ID, SURFACE_ID, contentIn, surfaceMorph } from "../morph";

export type Msg =
  | { from: "ai" | "user"; text: string; cta?: string }
  /** A rendered divider, not a chat bubble: "Sarah joined the conversation". */
  | { from: "system"; name: string; text: string };
export type Rep = { name: string; avatar?: string } | null;
export type Conversation = { id: number; title: string; date: string };

/** The live rep's photo, cropped to Figma's framing (frame 541:573). */
export const REP_AVATAR = "/breakout/rep-sarah.png";

const velvet = { type: "spring", stiffness: 420, damping: 34, mass: 0.7 } as const;

// Mock past conversations for the header history dropdown (prototype data).
const HISTORY: Conversation[] = [
  { id: 1, title: "GloboCorp demo walkthrough", date: "Just Now" },
  { id: 2, title: "Stellaris Inc. pricing Q&A", date: "5h" },
  { id: 3, title: "NovaTech onboarding flow", date: "Yesterday" },
  { id: 4, title: "Apex Industries discovery", date: "Yesterday" },
  { id: 5, title: "Veridian Systems demo", date: "Mon" },
  { id: 6, title: "Omni Global feedback chat", date: "Sun" },
];

function ThinkingDots() {
  return (
    <div className="flex w-[14px] shrink-0 flex-col gap-[0.82px]">
      {[0, 1, 2].map((r) => (
        <div key={r} className="flex gap-[0.82px]">
          {[0, 1, 2].map((c) => (
            <motion.div key={c} className="size-[4.12px] rounded-full" style={{ background: "var(--bo-text)" }} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: ((r * 3 + c) % 5) * 0.12 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Avatar({ rep, theme, size, radius, logo, online }: { rep: Rep; theme: Theme; size: number; radius: number; logo?: { src: string; bg?: string; pad?: string }; online?: boolean }) {
  if (rep) {
    return (
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <img src={rep.avatar ?? REP_AVATAR} alt={rep.name} className="size-full object-cover" style={{ borderRadius: radius }} />
        {online && <span className="absolute block rounded-full" style={{ width: Math.round(size * 0.25), height: Math.round(size * 0.25), right: 0, bottom: 0, background: "#41E2A4" }} />}
      </div>
    );
  }
  const L = logo ?? theme.logo;
  return (
    <div className="relative shrink-0 overflow-hidden" style={{ width: size, height: size, borderRadius: radius }}>
      {L.bg ? (<div className="absolute inset-0 flex items-center justify-center" style={{ background: L.bg }}><img src={L.src} alt="" className="size-full object-contain" style={{ padding: L.pad ?? "26%" }} /></div>) : (<img src={L.src} alt="" className="absolute inset-0 size-full object-contain" />)}
    </div>
  );
}

const Plus = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 12 12" fill="none" stroke="var(--bo-text)" strokeWidth="1.2" strokeLinecap="round">
    <path d="M6 2.5v7M2.5 6h7" />
  </svg>
);

/** Jump back to the newest message (frame 553:1017): a 24px glass disc that floats over
 *  the foot of the transcript, only while the reader has scrolled away from the bottom. */
function ScrollToLatest({ show, onClick }: { show: boolean; onClick: () => void }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          key="jump"
          type="button"
          aria-label="Jump to latest message"
          onClick={onClick}
          initial={{ opacity: 0, y: -6, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.8 }}
          transition={velvet}
          whileTap={{ scale: 0.92 }}
          className="absolute bottom-[4px] left-1/2 z-10 flex size-[24px] -translate-x-1/2 items-center justify-center rounded-full transition-[filter] duration-200 hover:brightness-110"
          style={{ backgroundColor: "var(--bo-primary-fill)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--bo-primary-border)", boxShadow: "var(--bo-shadow-soft)" }}
        >
          <svg className="size-[14px]" viewBox="0 0 14 14" fill="none" stroke="var(--bo-primary-text)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 5.25L7 8.75L10.5 5.25" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/** Session history (frame 542:928): a glass sheet hung off the panel's left edge —
 *  six sessions with a relative timestamp, then a "New Conversation" footer. The first
 *  row is the live session and carries a faint fill + hairline. */
function HistoryDropdown({ theme, onSelect, onNew, activeId, left, top }: { theme: Theme; onSelect: (c: Conversation) => void; onNew: () => void; activeId: number; left: number; top: number }) {
  const txt = { color: "var(--bo-text)" };
  return (
    <motion.div
      // Glass surface → scale/travel only, never opacity.
      initial={{ y: -8, scale: 0.94 }}
      animate={{ y: 0, scale: 1 }}
      exit={{ y: -8, scale: 0.94 }}
      transition={velvet}
      className={`${theme.gradientStroke ? "glass-stroke" : ""} z-30 flex w-[290px] flex-col overflow-hidden rounded-[12px]`}
      // `position` is set inline, not via Tailwind's `absolute`: .glass-stroke declares
      // `position: relative` and, sitting after the Tailwind layer, would win the cascade
      // and drop this back into flow.
      style={{ ...glassEdge(theme), position: "absolute", left, top, backgroundColor: "var(--bo-fill)", backdropFilter: "blur(34.75px)", WebkitBackdropFilter: "blur(34.75px)", boxShadow: "0px 24px 60px 0px rgba(0,0,0,0.45)", transformOrigin: "top left" }}
    >
      <div className="flex flex-col p-[6px]">
        {HISTORY.map((h) => {
          const active = h.id === activeId;
          return (
            <button
              key={h.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(h)}
              className="group relative flex w-full items-center justify-between gap-[10px] overflow-hidden rounded-[6px] px-[12px] py-[9px] text-left"
              style={active ? { backgroundColor: "var(--bo-row-active)", borderWidth: 0.5, borderStyle: "solid", borderColor: "var(--bo-hairline)" } : undefined}
            >
              {!active && <span className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-150 group-hover:opacity-100" style={{ backgroundColor: "var(--bo-sec-hover)" }} />}
              <span className="relative min-w-0 flex-1 truncate text-[14px] font-medium leading-none tracking-[-0.14px]" style={{ color: "var(--bo-text)", opacity: 0.95 }}>{h.title}</span>
              <span className="relative w-[52px] shrink-0 text-right text-[12px] leading-normal opacity-75" style={txt}>{h.date}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onNew}
        className="group relative flex w-full items-center gap-[8px] overflow-hidden px-[12px] py-[10px] text-left"
        // A hairline, not a border-top colour keyed to white: on Ketch's white glass a
        // white rule is invisible, so the divider is themed like every other edge.
        style={{ borderTopWidth: 1, borderTopStyle: "solid", borderTopColor: "var(--bo-hairline)" }}
      >
        <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100" style={{ backgroundColor: "var(--bo-sec-hover)" }} />
        <span className="relative flex size-[20px] shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "var(--bo-chip)", borderWidth: 0.5, borderStyle: "solid", borderColor: "var(--bo-hairline)" }}>
          <Plus className="size-[12px]" />
        </span>
        <span className="relative text-[14px] font-medium leading-none tracking-[-0.14px]" style={{ color: "var(--bo-text)", opacity: 0.95 }}>New Conversation</span>
      </button>
    </motion.div>
  );
}

/** "Sarah joined the conversation" — a centred caption between two hairlines (frame 541:713). */
function JoinedDivider({ name }: { name: string }) {
  const rule = <div className="h-px min-w-0 flex-1" style={{ background: "var(--bo-text)", opacity: 0.18 }} />;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="flex w-full items-center justify-center gap-[6px] py-[4px]">
      {rule}
      <div className="flex shrink-0 items-center gap-[4px] whitespace-nowrap text-[12px] font-medium leading-none" style={{ color: "var(--bo-text)" }}>
        <span>{name}</span>
        <span className="opacity-75">joined the conversation</span>
      </div>
      {rule}
    </motion.div>
  );
}

export default function ChatPanel({
  theme,
  logo,
  rep = null,
  messages,
  thinking,
  onSend,
  onClose,
  onMinimize,
  onCta,
  cta,
  onSelectHistory,
  onNewConversation,
}: {
  theme: Theme;
  logo?: { src: string; bg?: string; pad?: string };
  rep?: Rep;
  messages: Msg[];
  thinking: boolean;
  onSend?: (text: string) => void;
  onClose?: () => void;
  onMinimize?: () => void;
  onCta?: () => void;
  /** Primary CTA label shown in the header (frame 490:703). Omitted → no header CTA. */
  cta?: string;
  /** Pick a past conversation from the header history dropdown. */
  onSelectHistory?: (c: Conversation) => void;
  onNewConversation?: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  // The live session is always the first row; picking another one swaps the highlight.
  const [activeId, setActiveId] = useState(1);

  // Transcript scroll: the jump button appears once the reader has drifted up from the
  // newest message, and new messages only auto-follow while they were already at the foot
  // (so nothing yanks the view out from under someone reading back).
  const listRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const nearBottom = (el: HTMLDivElement) => el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  const scrollToLatest = (behavior: ScrollBehavior = "smooth") => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  };
  // `stick` is the reader's intent, sampled the last time THEY moved the transcript.
  // Re-deriving it after a new message has already landed would always read "not at the
  // bottom" — the message is what pushed us off it — so the view would never follow.
  const stick = useRef(true);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => { stick.current = nearBottom(el); setAtBottom(stick.current); };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (stick.current) scrollToLatest("auto");
    setAtBottom(nearBottom(el));
  }, [messages, thinking]);

  const title = rep ? `${rep.name} is active now` : "AI Agent";
  const thinkLabel = rep ? `${rep.name} is typing...` : "Thinking...";
  const submit = () => { if (draft.trim() && onSend) onSend(draft.trim()); setDraft(""); };
  const txt = { color: "var(--bo-text)" };
  const iconFilter = theme.iconDark ? "brightness(0) opacity(0.7)" : "none";

  return (
    <div className="flex flex-col items-center gap-[10px]" style={theme.vars as CSSProperties}>
      <div className="relative flex items-end gap-[8px]">
        {/* Same mark as the resting pod — it travels, it does not re-appear. */}
        <motion.div layoutId={MARK_ID} layout="position" layoutDependency={0} transition={surfaceMorph} className="shrink-0">
          <Avatar rep={rep} theme={theme} size={40} radius={56.25} logo={logo} online />
        </motion.div>

        {/* Same glass surface as the resting pod — it changes shape, it is not rebuilt. */}
        <motion.div layoutId={SURFACE_ID} layoutDependency={0} transition={{ layout: surfaceMorph }} className={`${theme.gradientStroke ? "glass-stroke" : ""} flex h-[329px] w-[479px] flex-col justify-end gap-[20px] p-[12px]`} style={glass(theme, "--bo-r-card", "--bo-blur-lg")}>
          <motion.div className="flex min-h-0 w-full flex-1 flex-col justify-end gap-[20px]" layoutDependency={0} {...contentIn}>
          <div className="flex min-h-0 flex-1 flex-col gap-[12px]">
            <div className="relative flex w-full shrink-0 items-center justify-between pr-[4px]">
              <div className="flex items-center gap-[6px]">
                <div className="overflow-hidden rounded-[5px]" style={{ borderWidth: 0.625, borderStyle: "solid", borderColor: "var(--bo-hairline)" }}><Avatar rep={rep} theme={theme} size={20} radius={5} logo={logo} online={!!rep} /></div>
                <button type="button" onClick={() => setHistoryOpen((o) => !o)} className="flex items-center gap-[4px]">
                  <span className="whitespace-nowrap text-[14px] font-medium leading-none" style={txt}>{title}</span>
                  <motion.img src="/breakout/arrow-down.svg" alt="" className="size-[12px]" animate={{ rotate: historyOpen ? 180 : 0 }} transition={velvet} style={{ filter: iconFilter }} />
                </button>
              </div>
              <div className="flex items-center gap-[12px]">
                {/* Header CTA: strokeless, on the secondary fill — the same treatment as the
                    option chips in the suggestion panel. A hairline here reads as a hard
                    outline on the light theme's white glass. */}
                {cta && (
                  <button type="button" onClick={onCta} className="flex h-[28px] shrink-0 items-center whitespace-nowrap rounded-full px-[12px] text-[13px] font-medium leading-none transition-[filter] duration-200 hover:brightness-95" style={{ backgroundColor: "var(--bo-bubble)", ...txt }}>{cta}</button>
                )}
                <button type="button" onClick={onMinimize} className="opacity-80 transition-opacity hover:opacity-100"><img src="/breakout/minimize.svg" alt="minimize" className="size-[14px]" style={{ filter: iconFilter }} /></button>
                <button type="button" onClick={onClose} className="opacity-80 transition-opacity hover:opacity-100"><img src="/breakout/close.svg" alt="close" className="size-[14px]" style={{ filter: iconFilter }} /></button>
              </div>
            </div>

            <div className="relative flex min-h-0 w-full flex-1 flex-col">
            {/* `justify-end` on a scroll container is a trap: overflow spills past the
                START edge, which no browser lets you scroll to, so older messages were
                being clipped away for good. `mt-auto` on the inner stack pins a short
                transcript to the bottom and lets a long one overflow downward, where it
                is actually reachable. */}
            <div ref={listRef} className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto pl-[4px] pt-[8px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ maskImage: "linear-gradient(to bottom, transparent 0, black 30px)", WebkitMaskImage: "linear-gradient(to bottom, transparent 0, black 30px)" }}>
            <div className="mt-auto flex w-full shrink-0 flex-col items-start gap-[12px]">
              {messages.map((m, i) =>
                m.from === "system" ? (
                  <JoinedDivider key={i} name={m.name} />
                ) : m.from === "ai" ? (
                  <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={velvet} className="flex w-[337px] max-w-full flex-col items-start gap-[8px]">
                    <p className="whitespace-pre-wrap text-[14px] font-medium leading-[1.45] tracking-[0.14px]" style={txt}>{m.text}</p>
                    {m.cta && (
                      <motion.button type="button" onClick={onCta} className="flex items-center gap-[6px] rounded-[36px] px-[14px] py-[8px] text-[14px] font-medium transition-[filter] duration-200 hover:brightness-95" style={{ backgroundColor: "var(--bo-primary-fill)", color: "var(--bo-primary-text)", borderRadius: "var(--bo-r-btn)" }} whileTap={{ scale: 0.97 }} transition={velvet}>{m.cta} <span className="opacity-80">↗</span></motion.button>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key={i} initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={velvet} className="self-end rounded-[8px] px-[8px] py-[6px]" style={{ backgroundColor: "var(--bo-bubble)" }}>
                    <span className="whitespace-nowrap text-[14px] font-medium leading-[1.45]" style={txt}>{m.text}</span>
                  </motion.div>
                ),
              )}
              {thinking && (
                <div className="flex w-full items-center gap-[8px]">
                  {/* A live rep types under their own face; the agent types under its dot matrix. */}
                  {rep ? <div className="overflow-hidden rounded-full" style={{ boxShadow: "inset 0px -1px 1.5px 0px rgba(255,255,255,0.2), inset 0px 1px 1.5px 0px rgba(255,255,255,0.2)" }}><Avatar rep={rep} theme={theme} size={20} radius={28.125} logo={logo} /></div> : <ThinkingDots />}
                  <span className="bo-shimmer text-[14px] font-medium leading-[1.45]">{thinkLabel}</span>
                </div>
              )}
            </div>
            </div>
            <ScrollToLatest show={!atBottom} onClick={() => scrollToLatest()} />
            </div>
          </div>

          <div className="flex w-full flex-col gap-[10px]">
            <div className="h-px w-full" style={{ backgroundColor: "var(--bo-text)", opacity: 0.18 }} />
            <div className="flex w-full items-center justify-between gap-[12px]">
              {/* Same copy, and the same 75% placeholder, as the resting pod's input. */}
              <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Ask anything..." className="bo-input min-w-0 flex-1 bg-transparent text-[14px] font-medium leading-none tracking-[-0.14px] outline-none" style={{ color: "var(--bo-text)", caretColor: "var(--bo-text)", "--bo-ph-op": 0.75 } as CSSProperties} />
              <motion.button type="button" onClick={submit} className="flex size-[32px] shrink-0 items-center justify-center rounded-full transition-[filter] duration-200 hover:brightness-110" style={{ backgroundColor: "var(--bo-primary-fill)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--bo-primary-border)" }} whileTap={{ scale: 0.94 }} transition={velvet}>
                <span className="text-[14px] leading-none" style={{ color: "var(--bo-primary-text)" }}>↑</span>
              </motion.button>
            </div>
          </div>
          </motion.div>
        </motion.div>

        {/* The dropdown lives OUTSIDE the glass panel on purpose. A backdrop-filter
            element is a backdrop root for its descendants, so nested inside the panel the
            dropdown's own blur would have had nothing to sample and the messages would
            read straight through it. As a sibling painted after the panel, its backdrop
            IS the panel — so it frosts the conversation behind it, as in frame 542:928.
            Offsets are from the panel's top-left: avatar (40) + gap (8) + Figma's 11px. */}
        <AnimatePresence>
          {historyOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setHistoryOpen(false)} />
              <HistoryDropdown
                theme={theme}
                left={40 + 8 + 11}
                top={36}
                activeId={activeId}
                onSelect={(c) => { setActiveId(c.id); onSelectHistory?.(c); setHistoryOpen(false); }}
                onNew={() => { setActiveId(1); onNewConversation?.(); setHistoryOpen(false); }}
              />
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
