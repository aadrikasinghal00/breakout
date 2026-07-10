import { useCallback, useEffect, useRef, useState } from "react";
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

  const frameRef = useRef<HTMLIFrameElement>(null);
  const idle = useRef<number | undefined>(undefined);

  // Direction doesn't matter: ANY scroll holds the compact bar, and the widget only
  // returns to its resting state once the page has actually stopped moving. (Scrolling
  // back up used to restore it mid-flick, which read as the widget flapping open.)
  const watchScroll = useCallback((on: (fn: () => void) => () => void) => {
    const onScroll = () => {
      setScrolled(true);
      window.clearTimeout(idle.current);
      idle.current = window.setTimeout(() => setScrolled(false), 900);
    };
    const off = on(onScroll);
    return () => { window.clearTimeout(idle.current); off(); };
  }, []);

  useEffect(
    () =>
      watchScroll((fn) => {
        window.addEventListener("scroll", fn, { passive: true });
        return () => window.removeEventListener("scroll", fn);
      }),
    [watchScroll],
  );

  // The proxied site is same-origin, so its scroll is ours to read. If the visitor
  // clicks through to a real getbreakout.ai URL the frame goes cross-origin and the
  // access throws — we just stop listening rather than break the page.
  const bindFrameScroll = useCallback(() => {
    const win = frameRef.current?.contentWindow;
    try {
      if (!win || !win.document) return;
      setScrolled(false);
      return watchScroll((fn) => {
        win.addEventListener("scroll", fn, { passive: true });
        return () => win.removeEventListener("scroll", fn);
      });
    } catch {
      return;
    }
  }, [watchScroll]);

  useEffect(() => {
    const detach = bindFrameScroll();
    return detach;
    // Re-bind whenever the frame swaps documents (theme / page change).
  }, [bindFrameScroll, config.theme, config.page]);

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
        /* LIVE website backdrop, served same-origin through the /site proxy. It fills the
           viewport exactly, so the site's own `100vh` sections and sticky headers are
           undistorted; it scrolls natively and keeps every one of its hover states; and
           because it shares our origin we can read its scroll to drive the widget's
           on-scroll shrink. The widget sits above it on its own layer, so nothing about
           the widget's hover or click behaviour is contested. */
        <iframe
          key={`${theme.key}-${config.page}`}
          ref={frameRef}
          src={siteUrl}
          title="Site preview"
          onLoad={bindFrameScroll}
          className="fixed inset-0 z-0 block size-full border-0"
        />
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
          unread={config.unread}
          unreadStyle={config.unreadStyle}
          pulse={config.pulse}
          pulseColor={config.pulseColor}
        />
      </div>
    </div>
  );
}
