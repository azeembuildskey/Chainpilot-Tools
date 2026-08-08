# ShipCheck AI — Setup Guide

This adds an AI-powered version of your document checker to the ChainPilot Tools site.
Instead of a fixed checklist, it reads the actual documents and flags real mismatches
between them (quantities, names, HS codes, values, dates).

## What's in this folder

- `shipment-audit-ai.html` — the new tool page (upload docs, see results)
- `netlify/functions/audit-ai.js` — the serverless function that calls Claude to compare the documents

## Setup (15-20 minutes)

1. **Copy files into your existing repo** (`Chainpilot-Tools`):
   - Put `shipment-audit-ai.html` in the same folder as your other tool pages (root, alongside `shipment-audit.html`)
   - Put the `netlify/functions/audit-ai.js` file at that same path inside your repo — Netlify auto-detects anything in `netlify/functions/`

2. **Get an Anthropic API key** (if you don't have one):
   - Go to console.anthropic.com → Settings → API Keys → Create Key
   - Note: this uses pay-as-you-go API credits, separate from your claude.ai subscription. Each document check costs a few cents.

3. **Add the key to Netlify:**
   - Netlify dashboard → your site → Site configuration → Environment variables
   - Add: `ANTHROPIC_API_KEY` = (paste your key)

4. **Commit and push to GitHub** as usual — Netlify auto-deploys from your `main` branch, so this will go live automatically.

5. **Test it:** visit `yoursite.netlify.app/shipment-audit-ai.html`, upload two documents (even two photos of unrelated papers, just to test the flow), and confirm you get a result back.

## Link it from your site

Add a card/link to `shipment-audit-ai.html` next to your existing two tools on the homepage —
label it something like "ShipCheck AI (Beta)" so it's clear it's the next-gen version.

## Notes

- Works with photos or scans of documents (JPEG/PNG). PDF support would need one more step (PDF→image conversion) — ask if you want that added.
- No database, no user accounts — stateless, same as your current tools. Nothing is stored.
- If you later want to charge per-check or add usage limits, that's a small addition on top of this (e.g. Stripe + a simple counter) — don't build it until you have a paying client asking for it.
