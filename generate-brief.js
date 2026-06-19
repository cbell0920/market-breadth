// generate-brief.js — Market Breadth Brief Generator
// Runs via GitHub Actions. Writes index.html and archives to archive/YYYYMMDD-breadth.html

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TODAY = new Date()
  .toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const NOW_UTC = new Date().toUTCString();

console.log(`Generating Market Breadth Brief for ${TODAY}...`);

const SYSTEM = `You are a senior macro analyst at TPTraders producing the daily Market Breadth & Sentiment Report.
Today's date is ${TODAY}. Use web search to gather current market data before writing.

Search for current data on:
- US equity index futures: NQ (Nasdaq 100), ES (S&P 500), YM (Dow Jones), RTY (Russell 2000)
- VIX spot level and any term structure or skew commentary
- DXY (US Dollar Index) current level and trend
- Commodities: GLD (Gold), WTI Crude Oil, Silver, Copper
- US Treasuries: 10Y yield, 2Y yield, 30Y yield, yield curve spread (10Y-2Y)
- Bitcoin (BTC) as a risk sentiment proxy
- Put/Call ratio (total and equity)
- NYSE Advance/Decline data if available
- Any significant overnight macro news, Fed speaker comments, or geopolitical developments
- Fear & Greed index or similar sentiment indicators if available

Your output must be a SINGLE complete HTML file — no markdown, no code fences, just raw HTML starting with <!DOCTYPE html>.
The file must be self-contained (all CSS and JS inline) and render correctly on GitHub Pages.`;

const USER = `Generate today's Market Breadth & Sentiment Report as a complete, self-contained HTML file.

PURPOSE: This report sets the macro tone for the trading session. It covers instruments that may not be directly traded but collectively determine whether conditions favor risk-on or risk-off positioning.

REQUIRED SECTIONS (in this order):

1. Header bar: "MARKET BREADTH · ${TODAY} · TPTRADERS" | generated timestamp | "Not financial advice"

2. Session Tone Verdict — the most prominent element on the page:
   - Large badge: RISK-ON / RISK-OFF / NEUTRAL / MIXED
   - Conviction level: HIGH / MODERATE / LOW
   - 2-sentence summary of what is driving today's tone

3. Futures Strip — compact row of 4 cards:
   NQ | ES | YM | RTY
   Each card: name, current level, point change, % change, color-coded (green/red)

4. Volatility — VIX card:
   - Spot level, 24h change
   - Term structure reading: CONTANGO / BACKWARDATION
   - Fear reading: LOW FEAR / ELEVATED / HIGH FEAR / EXTREME FEAR
   - 2-sentence interpretation

5. Dollar (DXY) — card:
   - Current level, 24h change, trend direction
   - Implication note: what DXY strength/weakness means for risk assets today

6. Commodities — 4 cards in a row:
   GOLD (GLD) | WTI CRUDE | SILVER | COPPER
   Each: price, 24h % change, signal (BULLISH/BEARISH/NEUTRAL), one-line implication

7. Yields & Curve — table:
   | Tenor | Yield | 24h Change | Signal |
   2Y | 10Y | 30Y | Spread (10Y-2Y)
   Below table: 2-sentence yield curve interpretation (steepening/flattening, recession signal if relevant)

8. Risk Proxy — Bitcoin:
   - BTC price, 24h % change
   - Correlation note: is BTC confirming or diverging from equity risk sentiment today?

9. Sentiment Indicators — 2-column layout:
   - Put/Call Ratio (total): value + reading (BEARISH SENTIMENT / NEUTRAL / BULLISH SENTIMENT)
   - Put/Call Ratio (equity): value + reading
   - Fear & Greed Index: score + label if available
   - NYSE A/D: breadth reading if available

10. Macro Catalyst Strip — upcoming events that could shift tone:
    List format: Date | Time ET | Event | Expected Impact (HIGH/MED/LOW)
    Cover next 3 trading days only.

11. Analyst Synthesis — 2 paragraphs:
    Para 1: Integrate all signals into a coherent macro picture. What is the market telling us today?
    Para 2: Tactical implication — given today's breadth reading, what should a trader be doing or avoiding?

DESIGN REQUIREMENTS:
- Background: #0a0e1a (dark navy)
- Text: #e2e8f0
- Accent color: #f97316 (orange) for headers, highlights, and the hub link
- Cards: #0f1629 background, 1px #1e2d4a border, 8px border-radius
- Monospace font (IBM Plex Mono or Consolas) for all data values
- Session Tone verdict box: very large, centered, dominant — this is the headline
  - RISK-ON: bright green background glow
  - RISK-OFF: red background glow
  - NEUTRAL: gray
  - MIXED: amber
- Futures positive: green text. Negative: red text.
- Fully responsive, mobile-friendly
- Print-friendly @media print styles (white bg, black text)
- Header link: "← Hub" linking to https://cbell0920.github.io/tptraders-hub
- Footer: "CLAUDE SONNET 4.6 · ${NOW_UTC} · TPTRADERS" | "Not financial advice · Verify all data before trading"

Start your response with <!DOCTYPE html> and nothing else. No preamble, no explanation.`;

async function generateBrief() {
  try {
    console.log("Calling Anthropic API with web search...");

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      system: SYSTEM,
      messages: [{ role: "user", content: USER }],
    });

    const html = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    if (!html.includes("<!DOCTYPE html>") && !html.includes("<html")) {
      throw new Error("Response does not appear to be valid HTML.");
    }

    const cleanHtml = html
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    fs.writeFileSync("index.html", cleanHtml, "utf8");
    console.log(`✓ Wrote index.html (${(cleanHtml.length / 1024).toFixed(1)} KB)`);

    const archiveDir = "archive";
    if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir);
    const archivePath = path.join(archiveDir, `${TODAY}-breadth.html`);
    fs.writeFileSync(archivePath, cleanHtml, "utf8");
    console.log(`✓ Archived to ${archivePath}`);

  } catch (err) {
    console.error("Error generating brief:", err);
    process.exit(1);
  }
}

generateBrief();
