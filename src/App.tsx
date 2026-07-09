import { useEffect, useState } from "react";
import BreakoutWidget from "./components/BreakoutWidget";
import ConfigPanel, {
  type Config,
  DEFAULT_CONFIG,
  primaryOption,
  secondaryOptions,
  menuOptions,
  SUGGESTIONS_BY_PAGE,
  loadFont,
} from "./components/ConfigPanel";
import { THEMES } from "./themes";

export default function App() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Direction-aware: scrolling DOWN shrinks the widget; scrolling UP (or near the
    // top) restores the default state.
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 60) setScrolled(false);
      else if (y > last + 4) setScrolled(true);
      else if (y < last - 4) setScrolled(false);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const theme = THEMES[config.theme];
  const siteUrl = theme.pages[config.page] ?? theme.pages.Home;

  useEffect(() => { loadFont(config.font); }, [config.font]);

  return (
    <div className="relative h-screen w-screen overflow-hidden" style={{ backgroundColor: theme.bgColor }}>
      {/* Fallback: branded image shows if the live site refuses to embed. */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `url('${theme.bgImage}')`,
          backgroundSize: theme.bgSize,
          backgroundPosition: theme.bgPosition,
          backgroundRepeat: "no-repeat",
          backgroundColor: theme.bgColor,
        }}
      />
      {theme.pageImage ? (
        /* Full-page screenshot backdrop — for sites that block iframe embedding
           (Ketch, NetApp). A tall image scrolls behind the widget so the page
           still reads as live and browsable. */
        <div className="fixed inset-0 z-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <img key={theme.key} src={theme.pageImage} alt="Site preview" className="w-full select-none" draggable={false} />
        </div>
      ) : (
        /* LIVE website backdrop that ALSO scrolls AND drives the on-scroll state. The
           iframe is a bit taller than the viewport and sits inside a scroll container;
           `pointer-events: none` lets the wheel scroll the container (so the real page
           visibly moves) while the widget listens to that same scroll. Real live site +
           it scrolls + on-scroll shrink — no static image. (Kept modest so the site's
           100vh hero isn't distorted.) */
        <div className="fixed inset-0 z-0 overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <iframe
            key={theme.key}
            src={siteUrl}
            title="Site preview"
            className="pointer-events-none block w-full border-0"
            style={{ height: "135vh" }}
          />
        </div>
      )}

      <ConfigPanel config={config} onChange={setConfig} />

      <div className="fixed bottom-[30px] left-1/2 z-10">
        <BreakoutWidget
          theme={theme}
          primary={primaryOption(config)}
          secondaries={secondaryOptions(config)}
          menu={menuOptions(config)}
          scrolled={scrolled}
          repActive={config.repOnline}
          visitor={config.visitor}
          useLogo={config.useLogo}
          askOnScroll={config.askOnScroll}
          primaryColor={config.primaryColor}
          font={config.font}
          suggestions={SUGGESTIONS_BY_PAGE[config.page] ?? SUGGESTIONS_BY_PAGE.Home}
          nudge={config.nudge}
          nudgeType={config.nudgeType}
          pulse={config.pulse}
          pulseColor={config.pulseColor}
        />
      </div>
    </div>
  );
}
