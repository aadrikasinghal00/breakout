import { AnimatePresence, motion } from "framer-motion";
import { useState, type CSSProperties } from "react";
import type { Theme } from "../themes";

export type Msg = { from: "ai" | "user"; text: string; cta?: string };
export type Rep = { name: string; avatar?: string } | null;
export type Conversation = { id: number; title: string; date: string };

const velvet = { type: "spring", stiffness: 420, damping: 34, mass: 0.7 } as const;
const border: CSSProperties = { borderWidth: 1, borderStyle: "solid", borderColor: "var(--bo-border)" };

// Mock past conversations for the header history dropdown (prototype data).
const HISTORY: Conversation[] = [
  { id: 1, title: "Pricing for a 20-person team", date: "2 days ago" },
  { id: 2, title: "Onboarding & data migration", date: "9 days ago" },
  { id: 3, title: "Security & SOC 2 questions", date: "3 weeks ago" },
  { id: 4, title: "Growth vs Scale plan", date: "2 months ago" },
];

function ThinkingDots() {
  return (
    <div className="flex w-[14px] flex-col gap-[0.82px]">
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
        <div className="flex size-full items-center justify-center bg-gradient-to-br from-[#f0a8b8] to-[#b06b8a] font-semibold text-white" style={{ borderRadius: radius, fontSize: size * 0.42 }}>{rep.name[0]}</div>
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
}) {
  const [draft, setDraft] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const title = rep ? `${rep.name} is active now` : "AI Agent";
  const thinkLabel = rep ? `${rep.name} is typing...` : "Thinking...";
  const submit = () => { if (draft.trim() && onSend) onSend(draft.trim()); setDraft(""); };
  const txt = { color: "var(--bo-text)" };

  return (
    <div className="flex flex-col items-center gap-[10px]" style={theme.vars as CSSProperties}>
      <div className="flex items-end gap-[8px]">
        <Avatar rep={rep} theme={theme} size={40} radius={56.25} logo={logo} online />

        <div className={`${theme.gradientStroke ? "glass-stroke" : ""} flex h-[329px] w-[479px] flex-col justify-end gap-[20px] p-[12px]`} style={{ ...border, backgroundColor: "var(--bo-fill)", backdropFilter: "blur(38px)", WebkitBackdropFilter: "blur(38px)", boxShadow: "var(--bo-shadow)", borderRadius: "var(--bo-r-card)" }}>
          <div className="flex min-h-0 flex-1 flex-col gap-[12px]">
            <div className="flex w-full shrink-0 items-center justify-between pr-[4px]">
              <div className="flex items-center gap-[6px]">
                <div className="overflow-hidden rounded-[5px]" style={border}><Avatar rep={rep} theme={theme} size={20} radius={5} logo={logo} /></div>
                <div className="relative">
                  <button type="button" onClick={() => setHistoryOpen((o) => !o)} className="flex items-center gap-[4px]">
                    <span className="whitespace-nowrap text-[14px] font-medium leading-none" style={txt}>{title}</span>
                    <motion.img src="/breakout/arrow-down.svg" alt="" className="size-[12px]" animate={{ rotate: historyOpen ? 180 : 0 }} transition={velvet} style={{ filter: theme.iconDark ? "brightness(0) opacity(0.7)" : "none" }} />
                  </button>
                  <AnimatePresence>
                    {historyOpen && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setHistoryOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.98 }}
                          transition={velvet}
                          className={`${theme.gradientStroke ? "glass-stroke" : ""} absolute left-0 top-[calc(100%+8px)] z-30 w-[268px] overflow-hidden rounded-[12px] p-[6px]`}
                          style={{ ...border, backgroundColor: "var(--bo-fill)", backdropFilter: "blur(38px)", WebkitBackdropFilter: "blur(38px)", boxShadow: "var(--bo-shadow)", transformOrigin: "top left" }}
                        >
                          <p className="px-[8px] pb-[2px] pt-[4px] text-[11px] font-medium leading-none opacity-50" style={txt}>Chat history</p>
                          {HISTORY.map((h) => (
                            <button key={h.id} type="button" onClick={() => { onSelectHistory?.(h); setHistoryOpen(false); }} className="group relative flex w-full items-center justify-between gap-[10px] overflow-hidden rounded-[8px] px-[8px] py-[7px] text-left">
                              <span className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-150 group-hover:opacity-100" style={{ backgroundColor: "var(--bo-sec-hover)" }} />
                              <span className="relative min-w-0 flex-1 truncate text-[13px] font-medium leading-none" style={txt}>{h.title}</span>
                              <span className="relative shrink-0 text-[11px] leading-none opacity-50" style={txt}>{h.date}</span>
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="flex items-center gap-[12px]">
                {cta && (
                  <button type="button" onClick={onCta} className="flex h-[28px] items-center rounded-full px-[12px] text-[13px] font-medium leading-none transition-[filter] duration-200 hover:brightness-95" style={{ ...border, backgroundColor: "var(--bo-sec-hover)", ...txt }}>{cta}</button>
                )}
                <button type="button" onClick={onMinimize} className="opacity-80 transition-opacity hover:opacity-100"><img src="/breakout/minimize.svg" alt="minimize" className="size-[14px]" style={{ filter: theme.iconDark ? "brightness(0) opacity(0.7)" : "none" }} /></button>
                <button type="button" onClick={onClose} className="opacity-80 transition-opacity hover:opacity-100"><img src="/breakout/close.svg" alt="close" className="size-[14px]" style={{ filter: theme.iconDark ? "brightness(0) opacity(0.7)" : "none" }} /></button>
              </div>
            </div>

            <div className="flex min-h-0 w-full flex-1 flex-col items-start justify-end gap-[12px] overflow-y-auto pl-[4px] pt-[8px] [scrollbar-width:none]" style={{ maskImage: "linear-gradient(to bottom, transparent 0, black 30px)", WebkitMaskImage: "linear-gradient(to bottom, transparent 0, black 30px)" }}>
              {messages.map((m, i) =>
                m.from === "ai" ? (
                  <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={velvet} className="flex w-[337px] max-w-full flex-col items-start gap-[8px]">
                    <p className="whitespace-pre-wrap text-[14px] font-medium leading-[1.45] tracking-[0.14px]" style={txt}>{m.text}</p>
                    {m.cta && (
                      <motion.button type="button" onClick={onCta} className="flex items-center gap-[6px] rounded-[36px] px-[14px] py-[8px] text-[14px] font-medium transition-[filter] duration-200 hover:brightness-95" style={{ backgroundColor: "var(--bo-primary-fill)", color: "var(--bo-primary-text)", borderRadius: "var(--bo-r-btn)" }} whileTap={{ scale: 0.97 }} transition={velvet}>{m.cta} <span className="opacity-80">↗</span></motion.button>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key={i} initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={velvet} className="self-end rounded-[8px] px-[8px] py-[6px]" style={{ backgroundColor: "var(--bo-sec-hover)" }}>
                    <span className="whitespace-nowrap text-[14px] font-medium leading-[1.45]" style={txt}>{m.text}</span>
                  </motion.div>
                ),
              )}
              {thinking && (
                <div className="flex w-full items-center gap-[8px]">
                  <ThinkingDots />
                  <span className="text-[14px] font-medium leading-[1.45] opacity-70" style={txt}>{thinkLabel}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex w-full flex-col gap-[10px]">
            <div className="h-px w-full" style={{ backgroundColor: "var(--bo-border)", opacity: theme.gradientStroke ? 0.5 : 1 }} />
            <div className="flex w-full items-center justify-between">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="What can I help you with?" className="flex-1 bg-transparent text-[14px] font-medium leading-none tracking-[-0.14px] outline-none placeholder:text-[var(--bo-text)] placeholder:opacity-30" style={{ color: "var(--bo-text)", caretColor: "var(--bo-text)" }} />
              <motion.button type="button" onClick={submit} className="flex size-[30px] shrink-0 items-center justify-center rounded-full transition-[filter] duration-200 hover:brightness-95" style={{ backgroundColor: "var(--bo-sec-hover)" }} whileTap={{ scale: 0.94 }} transition={velvet}>
                <span className="text-[14px] leading-none" style={{ color: "var(--bo-text)" }}>↑</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
