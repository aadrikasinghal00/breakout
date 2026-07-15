import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { Theme } from "../themes";
import { glass } from "../glass";
import { MARK_ID, SURFACE_ID, contentIn, surfaceMorph } from "../morph";
import AgentIcon from "./AgentIcon";

export type Msg =
  | { from: "ai" | "user"; text: string; cta?: string; emailRequest?: boolean }
  /** A rendered divider, not a chat bubble: "Sarah joined the conversation". */
  | { from: "system"; name: string; text: string };
export type Rep = { name: string; avatar?: string } | null;

/** The live rep's photo, cropped to Figma's framing (frame 541:573). */
export const REP_AVATAR = "/breakout/rep-sarah.png";

const velvet = { type: "spring", stiffness: 420, damping: 34, mass: 0.7 } as const;

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

/** Placeholder profile shown while connecting to a rep whose identity isn't known yet:
 *  a neutral disc with a generic person silhouette, wrapped in a spinning loader ring. */
function EmptyProfile({ size, radius }: { size: number; radius: number }) {
  const ring = Math.max(1.5, size * 0.06);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden" style={{ borderRadius: radius, background: "linear-gradient(145deg,#3a3a42,#212127)" }}>
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="rgba(255,255,255,0.6)" aria-hidden>
          <circle cx="12" cy="8.6" r="3.7" />
          <path d="M5 20c0-3.9 3.1-6.6 7-6.6s7 2.7 7 6.6z" />
        </svg>
      </div>
      {/* Loader ring — not a glass surface, so it may spin/rotate freely. */}
      <motion.span
        className="absolute rounded-full"
        style={{ inset: -ring, borderWidth: ring, borderStyle: "solid", borderColor: "rgba(255,255,255,0.22)", borderTopColor: "#ffffff" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

function Avatar({ rep, theme, size, radius, logo, online, connecting }: { rep: Rep; theme: Theme; size: number; radius: number; logo?: { src?: string; bg?: string; pad?: string; agent?: boolean }; online?: boolean; connecting?: boolean }) {
  if (rep) {
    return (
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <img src={rep.avatar ?? REP_AVATAR} alt={rep.name} className="size-full object-cover" style={{ borderRadius: radius }} />
        {online && <span className="absolute block rounded-full" style={{ width: Math.round(size * 0.25), height: Math.round(size * 0.25), right: 0, bottom: 0, background: "#41E2A4" }} />}
      </div>
    );
  }
  if (connecting) return <EmptyProfile size={size} radius={radius} />;
  const L = logo ?? theme.logo;
  return (
    <div className="relative shrink-0 overflow-hidden" style={{ width: size, height: size, borderRadius: radius }}>
      {L.bg ? (<div className="absolute inset-0 flex items-center justify-center" style={{ background: L.bg, color: "#fff" }}>{L.agent ? <AgentIcon size={Math.round(size * 0.74)} /> : <img src={L.src} alt="" className="size-full object-contain" style={{ padding: L.pad ?? "26%" }} />}</div>) : (<img src={L.src} alt="" className="absolute inset-0 size-full object-contain" />)}
    </div>
  );
}

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Inline email capture, rendered under the agent's "what's your email?" message. A
 *  glass pill matching the composer: type + press → hands the address back up. */
function EmailField({ onSubmit }: { onSubmit?: (email: string) => void }) {
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const valid = EMAIL_RE.test(value.trim());
  const submit = () => {
    if (!valid) { setTouched(true); return; }
    onSubmit?.(value.trim());
  };
  return (
    <div
      className="mt-[2px] flex w-full items-center gap-[6px] overflow-hidden rounded-[24px] pl-[14px] pr-[4px] py-[4px]"
      style={{
        backgroundColor: "var(--bo-bubble)",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: touched && !valid ? "rgba(240,90,90,0.7)" : "var(--bo-hairline)",
      }}
    >
      <input
        type="email"
        inputMode="email"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="you@company.com"
        className="bo-input min-w-0 flex-1 bg-transparent text-[14px] font-medium leading-none tracking-[-0.14px] outline-none"
        style={{ color: "var(--bo-text)", caretColor: "var(--bo-text)", "--bo-ph-op": 0.75 } as CSSProperties}
      />
      {/* Send button is always present — it's disabled (dimmed, inert) until the
          email is valid, rather than disappearing. */}
      <motion.button
        type="button"
        onClick={submit}
        disabled={!valid}
        aria-label="Submit email"
        className="flex size-[26px] shrink-0 items-center justify-center rounded-full transition-[filter,opacity] duration-200 hover:brightness-110"
        style={{ backgroundColor: "var(--bo-primary-fill)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--bo-primary-border)", opacity: valid ? 1 : 0.4, pointerEvents: valid ? "auto" : "none" }}
        whileTap={{ scale: 0.92 }}
      >
        <span className="text-[14px] leading-none" style={{ color: "var(--bo-primary-text)" }}>↑</span>
      </motion.button>
    </div>
  );
}

/** Centred status caption between two hairlines (frame 541:713): "Sarah joined the
 *  conversation", or a bare status like "Connecting with Sales Rep". */
function JoinedDivider({ name, text }: { name: string; text: string }) {
  const rule = <div className="h-px min-w-0 flex-1" style={{ background: "var(--bo-text)", opacity: 0.18 }} />;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="flex w-full items-center justify-center gap-[6px] py-[4px]">
      {rule}
      <div className="flex shrink-0 items-center gap-[4px] whitespace-nowrap text-[12px] font-medium leading-none" style={{ color: "var(--bo-text)" }}>
        {name && <span>{name}</span>}
        <span className={name ? "opacity-75" : "bo-shimmer"}>{text}</span>
      </div>
      {rule}
    </motion.div>
  );
}

export default function ChatPanel({
  theme,
  logo,
  rep = null,
  connecting = false,
  messages,
  thinking,
  onSend,
  onClose,
  onMinimize,
  onCta,
  cta,
  emailCaptured = false,
  onEmailSubmit,
}: {
  theme: Theme;
  logo?: { src?: string; bg?: string; pad?: string; agent?: boolean };
  rep?: Rep;
  /** Awaiting a sales rep: header shows a loader + empty profile until they join. */
  connecting?: boolean;
  messages: Msg[];
  thinking: boolean;
  onSend?: (text: string) => void;
  onClose?: () => void;
  onMinimize?: () => void;
  onCta?: () => void;
  /** Primary CTA label shown in the header (frame 490:703). Omitted → no header CTA. */
  cta?: string;
  /** The visitor's email has been captured — hides the gate field, frees the composer. */
  emailCaptured?: boolean;
  onEmailSubmit?: (email: string) => void;
}) {
  const [draft, setDraft] = useState("");

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
  // The gate is open while an email-request message is showing and no email is in yet;
  // the composer is locked so the only way forward is the email field.
  const awaitingEmail = !emailCaptured && messages.some((m) => m.from === "ai" && m.emailRequest);
  const submit = () => { if (awaitingEmail) return; if (draft.trim() && onSend) onSend(draft.trim()); setDraft(""); };
  const txt = { color: "var(--bo-text)" };
  const iconFilter = theme.iconDark ? "brightness(0) opacity(0.7)" : "none";

  return (
    <div className="flex flex-col items-center gap-[10px]" style={theme.vars as CSSProperties}>
      <div className="relative flex items-end gap-[8px]">
        {/* Same mark as the resting pod — it travels, it does not re-appear. */}
        <motion.div layoutId={MARK_ID} layout="position" layoutDependency={0} transition={surfaceMorph} className="shrink-0">
          <Avatar rep={rep} theme={theme} size={40} radius={56.25} logo={logo} online connecting={connecting} />
        </motion.div>

        {/* Same glass surface as the resting pod — it changes shape, it is not rebuilt. */}
        <motion.div layoutId={SURFACE_ID} layoutDependency={0} transition={{ layout: surfaceMorph }} className={`${theme.gradientStroke ? "glass-stroke" : ""} flex h-[329px] w-[479px] flex-col justify-end gap-[20px] p-[12px]`} style={glass(theme, "--bo-r-card", "--bo-blur-lg")}>
          <motion.div className="flex min-h-0 w-full flex-1 flex-col justify-end gap-[20px]" layoutDependency={0} {...contentIn}>
          <div className="flex min-h-0 flex-1 flex-col gap-[12px]">
            <div className="relative flex w-full shrink-0 items-center justify-between pr-[4px]">
              <div className="flex items-center gap-[6px]">
                <div className="overflow-hidden rounded-[5px]" style={{ borderWidth: 0.625, borderStyle: "solid", borderColor: "var(--bo-hairline)" }}><Avatar rep={rep} theme={theme} size={20} radius={5} logo={logo} online={!!rep} connecting={connecting} /></div>
                {/* Plain title — no dropdown (history removed from the prototype). */}
                <span className="whitespace-nowrap text-[14px] font-medium leading-none" style={txt}>{title}</span>
                {/* Connecting status lives here in the header (Figma 622:2025), with a
                    loader — not as a transcript divider — and clears once the rep joins. */}
                {connecting && (
                  <span className="flex items-center gap-[5px] whitespace-nowrap text-[13px] font-medium leading-none opacity-55" style={txt}>
                    <motion.span className="block size-[11px] shrink-0 rounded-full" style={{ borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--bo-text)", borderTopColor: "transparent" }} animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                    Connecting with Sales Rep
                  </span>
                )}
              </div>
              <div className="flex items-center gap-[12px]">
                {/* Header CTA: strokeless, on the secondary fill — the same treatment as the
                    option chips in the suggestion panel. A hairline here reads as a hard
                    outline on the light theme's white glass. Hidden while the email gate is
                    open so "Book a Call" can't bypass the ask. */}
                {cta && !awaitingEmail && !connecting && (
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
                  <JoinedDivider key={i} name={m.name} text={m.text} />
                ) : m.from === "ai" ? (
                  <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={velvet} className="flex w-[337px] max-w-full flex-col items-start gap-[8px]">
                    <p className="whitespace-pre-wrap text-[14px] font-medium leading-[1.45] tracking-[0.14px]" style={txt}>{m.text}</p>
                    {m.emailRequest && !emailCaptured && <EmailField onSubmit={onEmailSubmit} />}
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
              {/* Same copy, and the same 75% placeholder, as the resting pod's input.
                  While the email gate is open the composer is locked. */}
              <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} disabled={awaitingEmail} placeholder={awaitingEmail ? "Add your email to continue" : "Ask anything..."} className="bo-input min-w-0 flex-1 bg-transparent text-[14px] font-medium leading-none tracking-[-0.14px] outline-none disabled:cursor-default" style={{ color: "var(--bo-text)", caretColor: "var(--bo-text)", "--bo-ph-op": 0.75 } as CSSProperties} />
              <motion.button type="button" onClick={submit} disabled={awaitingEmail} className="flex size-[32px] shrink-0 items-center justify-center rounded-full transition-[filter,opacity] duration-200 hover:brightness-110" style={{ backgroundColor: "var(--bo-primary-fill)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--bo-primary-border)", opacity: awaitingEmail ? 0.4 : 1, pointerEvents: awaitingEmail ? "none" : "auto" }} whileTap={{ scale: 0.94 }} transition={velvet}>
                <span className="text-[14px] leading-none" style={{ color: "var(--bo-primary-text)" }}>↑</span>
              </motion.button>
            </div>
          </div>
          </motion.div>
        </motion.div>

      </div>
    </div>
  );
}
