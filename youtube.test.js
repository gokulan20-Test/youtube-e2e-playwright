import { test, expect } from "@playwright/test";
import fs from "fs";

test.use({ launchOptions: { headless: false, slowMo: 200 } });

test("YouTube E2E test", async ({ page }) => {
  test.setTimeout(180000); // allow up to 3 minutes

  // Navigate to YouTube
  await page.goto("https://www.youtube.com/", { waitUntil: "domcontentloaded" });

  // Handle cookie banner if it appears
  const acceptCookies = page.locator('button:has-text("Accept all")');
  if (await acceptCookies.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log("Accepting cookies...");
    await acceptCookies.click();
  }

  // Perform a search
  const searchBox = page.locator('//input[@placeholder="Search"]');
  await searchBox.waitFor({ state: "visible" });
  await searchBox.fill("QA automation");
  await page.locator('button.ytSearchboxComponentSearchButton').first().click();

  // Verify search results
  const results = page.locator("ytd-video-renderer");
  await results.first().waitFor();
  const count = await results.count();
  console.log(`Found ${count} search results`);
  expect(count).toBeGreaterThan(0);

  // Open the first video
  await results.first().click();

  // Handle ads (wait up to 30s for skip button)
  const skipAd = page.locator("button.ytp-skip-ad-button");
  try {
    await skipAd.waitFor({ state: "visible", timeout: 30000 });
    console.log("Skip ad button appeared, clicking...");
    await skipAd.click();
  } catch {
    console.log("No skip ad button, waiting for ad to finish...");
    await page.waitForTimeout(30000);
  }

  // Wait briefly for video to stabilize
  await page.waitForTimeout(2000);

  // Play and pause check
  const videoPlayer = page.locator("#movie_player video").first();
  await videoPlayer.evaluate(v => v.play());
  await page.waitForTimeout(2000);
  await videoPlayer.evaluate(v => v.pause());
  const paused = await videoPlayer.evaluate(v => v.paused);
  expect(paused).toBeTruthy();
  console.log("Video paused successfully");

  // Seek forward three times using YouTube shortcut
  await videoPlayer.evaluate(v => v.play());
  const before = await videoPlayer.evaluate(v => v.currentTime);

  for (let i = 1; i <= 2; i++) {
    await page.keyboard.press("L"); // skip forward 10s
    await page.waitForTimeout(2000);
    const current = await videoPlayer.evaluate(v => v.currentTime);
    console.log(`Seek ${i}: current time ${current.toFixed(2)}s`);
  }

  const after = await videoPlayer.evaluate(v => v.currentTime);
  expect(after).toBeGreaterThan(before);

  // Wait 30s after seek, then take screenshot
  console.log("Waiting 30s before screenshot...");
  await page.waitForTimeout(10000);

  if (!fs.existsSync("screenshots")) fs.mkdirSync("screenshots");
  const screenshotPath = "screenshots/video_playing.png";
  await page.screenshot({ path: screenshotPath });
  expect(fs.existsSync(screenshotPath)).toBeTruthy();
  console.log(`Screenshot saved: ${screenshotPath}`);

  // Verify video title
  const titleLocator = page.locator("h1.title, h1 > yt-formatted-string").first();
  await titleLocator.waitFor({ state: "visible" });
  const title = await titleLocator.innerText();
  expect(title.trim().length).toBeGreaterThan(0);
  console.log(`Video title: ${title.trim()}`);

  console.log("YouTube E2E test completed successfully");
});
