import { mkdir } from "node:fs/promises";
import { chromium, type Page } from "playwright";

/**
 * Capture README screenshots against a running server (default port 8080).
 * Start the app first: `npm run build:web && npm start`, then run this script.
 * The language model must be reachable so real answers are captured.
 */
const BASE_URL = process.env.SCREENSHOT_URL ?? "http://127.0.0.1:8080";
const OUT_DIR = "docs";

/** Wait for an in-flight answer to finish streaming, then let scrolling settle. */
async function waitForAnswer(page: Page): Promise<void> {
  await page.waitForSelector(".message-assistant .bubble", { timeout: 60_000 });
  // Streaming is complete once no assistant message carries the streaming flag
  // and the latest answer actually has content.
  await page.waitForFunction(
    () => {
      const streaming = document.querySelector('.message-assistant[data-streaming="true"]');
      const bubbles = document.querySelectorAll(".message-assistant .bubble");
      const last = bubbles[bubbles.length - 1];
      return streaming === null && (last?.textContent?.trim().length ?? 0) > 20;
    },
    { timeout: 120_000 },
  );
  // The component smooth-scrolls to the newest message when a turn changes;
  // wait for that animation to finish before repositioning for a screenshot.
  await page.waitForTimeout(1200);
}

async function scrollToTop(page: Page): Promise<void> {
  await page.evaluate(() => document.querySelector(".messages")?.scrollTo({ top: 0 }));
  await page.waitForTimeout(400);
}

async function ask(page: Page, question: string): Promise<void> {
  await page.fill(".composer-input", question);
  await page.click(".composer-send");
  await waitForAnswer(page);
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 860 },
    deviceScaleFactor: 2,
  });

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForSelector(".welcome");
  await page.screenshot({ path: `${OUT_DIR}/screenshot-welcome.png` });
  console.log("captured welcome screen");

  // Hero shot: a complete answer with the sources collapsed into a chip.
  await ask(page, "How much protein should I eat to build muscle?");
  await scrollToTop(page);
  await page.screenshot({ path: `${OUT_DIR}/screenshot-answer.png` });
  console.log("captured answer");

  // Grounding shot: the same answer with its retrieved sources expanded.
  await page.setViewportSize({ width: 1280, height: 1240 });
  await page.click(".message-assistant .citations summary");
  await scrollToTop(page);
  await page.screenshot({ path: `${OUT_DIR}/screenshot-sources.png` });
  console.log("captured sources");

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
