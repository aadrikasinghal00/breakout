import AgentIcon from "./AgentIcon";

export type LogoDef = { src?: string; bg?: string; pad?: string; agent?: boolean };

/** The shared 40px mark (agent icon or brand logo) used across the panels. */
export default function PanelMark({ logo, size = 40, radius = 56.25 }: { logo?: LogoDef; size?: number; radius?: number }) {
  const L = logo ?? { agent: true, bg: "linear-gradient(145deg,#2b2b30,#141416)" };
  return (
    <div className="relative shrink-0 overflow-hidden" style={{ width: size, height: size, borderRadius: radius, boxShadow: "var(--bo-shadow)" }}>
      {L.bg ? (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: L.bg, color: "#fff" }}>
          {L.agent ? <AgentIcon size={Math.round(size * 0.74)} /> : <img src={L.src} alt="" className="size-full object-contain" style={{ padding: L.pad ?? "26%" }} />}
        </div>
      ) : (
        <img src={L.src} alt="" className="absolute inset-0 size-full object-contain" />
      )}
      <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0px_-2px_3px_0px_rgba(255,255,255,0.2),inset_0px_2px_3px_0px_rgba(255,255,255,0.2)]" />
    </div>
  );
}
