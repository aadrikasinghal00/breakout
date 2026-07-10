import { chromium } from "playwright-core";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 820 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto("http://localhost:5174/", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(6000);
// open the chat, capture the first frames of the panel's entrance
await p.getByRole("button", { name: "Book a Call" }).hover(); await p.waitForTimeout(400);
const ib = await p.locator("input.bo-input").boundingBox();
await p.mouse.click(ib.x + 30, ib.y + ib.height / 2); await p.waitForTimeout(300);
await p.keyboard.type("Compare plans");
p.keyboard.press("Enter");
const CLIP = { x: 520, y: 460, width: 300, height: 120 };
for (let i = 0; i < 6; i++) await p.screenshot({ path: `seq7/e-${i}.png`, clip: CLIP });
await p.waitForTimeout(900);
await p.screenshot({ path: "seq7/e-settled.png", clip: CLIP });
// will-change / opacity audit on glass ancestors
const audit = await p.evaluate(() => {
  const panel = [...document.querySelectorAll("div")].find((d) => getComputedStyle(d).backdropFilter.includes("47.5"));
  const chain = [];
  for (let el = panel; el && el !== document.body; el = el.parentElement) {
    const cs = getComputedStyle(el);
    if (cs.opacity !== "1" || cs.willChange !== "auto" || cs.filter !== "none") chain.push({ cls: el.className.toString().slice(0, 30), opacity: cs.opacity, willChange: cs.willChange, filter: cs.filter });
  }
  return chain;
});
console.log("backdrop-root hazards above the chat panel:", JSON.stringify(audit));
await b.close();
