export type ThemeKey = "default" | "ketch" | "netapp";

export type Theme = {
  key: ThemeKey;
  label: string;
  bgImage: string;
  bgSize: string;
  bgPosition: string;
  bgColor: string;
  /** true → white gradient glass stroke; false → solid hairline border */
  gradientStroke: boolean;
  /** true → tint the mono icons dark (light themes) */
  iconDark: boolean;
  /** logo mark. bg present → coloured disc + centred glyph (padded); no bg → full-bleed image. */
  logo: { src: string; bg?: string; pad?: string };
  /** Alternate mark shown when the visitor is a "Known company" (e.g. their own logo). */
  logoKnown?: { src: string; bg?: string; pad?: string };
  /** true → the bottom-left mark is a rounded SQUARE (follows the pod corner radius)
   *  instead of a circle. Used by NetApp. */
  logoSquare?: boolean;
  /** Live site shown in the background iframe, per simulated page.
   *  NOTE: exact sub-paths are best-guesses — tweak any that 404. Some hosts
   *  (e.g. NetApp) block iframe embedding via X-Frame-Options and will render blank. */
  pages: Record<string, string>;
  /** Full-page screenshot used as a scrollable backdrop instead of a live iframe.
   *  Used for sites (Ketch, NetApp) that block embedding — a tall image scrolls
   *  behind the widget so it still reads as a live, browsable page. */
  pageImage?: string;
  vars: Record<string, string>;
};

const ketchShadow =
  "0px 8px 8px 0px rgba(0,0,0,0.04), 0px 2px 4px 0px rgba(0,0,0,0.05)";
const netappShadow =
  "0px 8px 5px 0px rgba(0,0,0,0.05), 0px 4px 4px 0px rgba(0,0,0,0.09), inset 0px 0px 12px 0px rgba(255,255,255,0.24)";

export const THEMES: Record<ThemeKey, Theme> = {
  default: {
    key: "default",
    label: "Default",
    bgImage: "/breakout/backdrop.png",
    bgSize: "142% auto",
    bgPosition: "center top",
    bgColor: "#4b4bd6",
    gradientStroke: true,
    iconDark: false,
    // Anonymous visitor → Clarasight brand mark (purple gradient). Known company
    // → the visitor's own mark (the sliced-circle "linear" logo).
    logo: { src: "/breakout/clarasight-mark.png" },
    logoKnown: { src: "/breakout/logo.png" },
    // LIVE Clarasight iframe (browsable). The on-scroll states can't be driven here
    // (a cross-origin iframe never reports its scroll to us) — they fire on the
    // Ketch/NetApp snapshot themes, which are real scroll containers.
    pages: {
      Home: "https://www.clarasight.com/",
      Pricing: "https://www.clarasight.com/pricing",
      Blog: "https://www.clarasight.com/blog",
      Product: "https://www.clarasight.com/product",
    },
    vars: {
      "--bo-fill": "rgba(33,33,33,0.3)",
      "--bo-blur": "20px",
      "--bo-border": "transparent",
      "--bo-text": "#ffffff",
      "--bo-shadow": "none",
      "--bo-r-pill": "36px",
      "--bo-r-pod": "60px",
      "--bo-r-btn": "36px",
      "--bo-r-card": "15px",
      "--bo-primary-fill": "rgba(255,255,255,0.4)",
      "--bo-primary-text": "#ffffff",
      "--bo-handle": "rgba(33,33,33,0.2)",
      "--bo-sec-hover": "rgba(255,255,255,0.2)",
    },
  },
  ketch: {
    key: "ketch",
    label: "Ketch",
    bgImage: "/breakout/ketch-bg.png",
    bgSize: "103% auto",
    bgPosition: "center top",
    bgColor: "#ffffff",
    gradientStroke: false,
    iconDark: true,
    logo: { src: "/breakout/ketch-mark.png" },
    pageImage: "/breakout/ketch-page.png",
    pages: {
      Home: "https://www.ketch.com/",
      Pricing: "https://www.ketch.com/pricing",
      Blog: "https://www.ketch.com/blog",
      Product: "https://www.ketch.com/platform",
    },
    vars: {
      "--bo-fill": "#ffffff",
      "--bo-blur": "0px",
      "--bo-border": "rgba(0,0,0,0.1)",
      "--bo-text": "#1a1a1a",
      "--bo-shadow": ketchShadow,
      "--bo-r-pill": "36px",
      "--bo-r-pod": "60px",
      "--bo-r-btn": "36px",
      "--bo-r-card": "15px",
      "--bo-primary-fill": "#8706ef",
      "--bo-primary-text": "#ffffff",
      "--bo-handle": "rgba(0,0,0,0.12)",
      "--bo-sec-hover": "rgba(0,0,0,0.06)",
    },
  },
  netapp: {
    key: "netapp",
    label: "NetApp",
    bgImage: "/breakout/netapp-bg.png",
    bgSize: "100% auto",
    bgPosition: "center top",
    bgColor: "#cfe0ea",
    gradientStroke: false,
    iconDark: false,
    logo: { src: "/breakout/netapp-mark.png", bg: "#ffffff", pad: "26%" },
    logoSquare: true,
    pageImage: "/breakout/netapp-page.png",
    pages: {
      Home: "https://www.netapp.com/",
      Pricing: "https://www.netapp.com/",
      Blog: "https://www.netapp.com/blog/",
      Product: "https://www.netapp.com/data-storage/",
    },
    vars: {
      "--bo-fill": "#232324",
      "--bo-blur": "0px",
      "--bo-border": "rgba(255,255,255,0.2)",
      "--bo-text": "#ffffff",
      "--bo-shadow": netappShadow,
      "--bo-r-pill": "8px",
      "--bo-r-pod": "16px",
      "--bo-r-btn": "12px",
      "--bo-r-card": "16px",
      "--bo-primary-fill": "#ffffff",
      "--bo-primary-text": "#232324",
      "--bo-handle": "rgba(35,35,36,0.2)",
      "--bo-sec-hover": "rgba(255,255,255,0.14)",
    },
  },
};

export const THEME_LIST = [THEMES.default, THEMES.ketch, THEMES.netapp];
