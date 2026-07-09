import pkg from "./node_modules/playwright-core/index.js";
const { chromium } = pkg;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 820 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
p.on("pageerror", (e) => console.log("CRASH:", e.message));
await p.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await p.waitForTimeout(900);
const clip = { x: 470, y: 660, width: 500, height: 160 };

await p.screenshot({ path: "/tmp/h-default.png", clip });
// hover the pod — must NOT expand (color only)
await p.mouse.move(760, 748); await p.waitForTimeout(600);
await p.screenshot({ path: "/tmp/h-hover.png", clip });
// click the pod (left area, not primary) — should focus + expand + popover
await p.mouse.click(650, 748); await p.waitForTimeout(900);
await p.screenshot({ path: "/tmp/h-click.png", clip: { x: 440, y: 360, width: 640, height: 460 } });
await b.close();
console.log("done");
