# Breakout

A bottom-centre website widget prototype (Book a Call / Ask AI / secondary actions), with a
configuration panel for simulating the visit and the customer's setup.

React + TypeScript + Vite + Tailwind v4 + Framer Motion.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

## The `/site` proxy

The default theme's backdrop is the real getbreakout.ai, served **through our own origin**
at `/site`. Same-origin is what lets all three of these be true at once:

- the site scrolls natively, so its `100vh` sections and sticky headers stay undistorted;
- its own hover states keep working;
- we can read its `scrollTop` to drive the widget's on-scroll shrink.

A cross-origin iframe forces you to pick two of the three.

The proxy is declared in **two** places and both must stay in sync:

| Where | File | Applies to |
| --- | --- | --- |
| Local | `vite.config.ts` (`server.proxy` + `preview.proxy`) | `npm run dev`, `npm run preview` |
| Deployed | `vercel.json` (`rewrites`) | Vercel production and previews |

Every asset and link on the Framer-hosted site is an absolute URL, so nothing else needs
rewriting.

## Notes for anyone touching the glass

An element becomes a *backdrop root* if it has `opacity < 1`, `filter`, `isolation: isolate`
or `backdrop-filter`. Any `backdrop-filter` at or below that root samples an **empty**
backdrop, so the glass silently disappears. `transform` is safe. Consequences, all learned
the hard way:

- No glass surface may fade in. Entrances are scale + travel only.
- Glass may not nest inside glass. The chat's history dropdown is a *sibling* of the panel.
- Buttons sitting on a glass panel carry no `backdrop-filter` of their own.
