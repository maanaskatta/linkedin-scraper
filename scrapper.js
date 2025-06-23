import * as dotenv from "dotenv";
import { chromium } from "@playwright/test";
import { sendJobsByEmail } from "./email.js";

dotenv.config();

const { LINKEDIN_EMAIL, LINKEDIN_PASSWORD } = process.env;

async function scrollLinkedInJobsSidebar(page) {
  const listSelector = "ul.XLsfDgRPWWqswmzbPfSkbwlIWKwwAGMMWV";
  const jobCardSelector = ".job-card-container";

  await page.waitForSelector(listSelector);

  // Find the scrollable parent (not the ul itself)
  const scrollableSelector = await page.evaluateHandle(() => {
    const list = document.querySelector(
      "ul.XLsfDgRPWWqswmzbPfSkbwlIWKwwAGMMWV"
    );
    let parent = list?.parentElement;
    while (parent) {
      const overflowY = window.getComputedStyle(parent).overflowY;
      if (overflowY === "auto" || overflowY === "scroll") {
        return parent;
      }
      parent = parent.parentElement;
    }
    return null;
  });

  let lastCount = 0;
  let stableCount = 0;

  for (let i = 0; i < 20; i++) {
    // Scroll down
    await scrollableSelector.evaluate((el) => el.scrollBy(0, el.scrollHeight));
    await page.waitForTimeout(1000);

    const currentCount = await page.$$eval(
      jobCardSelector,
      (els) => els.length
    );

    if (currentCount === lastCount) {
      stableCount++;
      if (stableCount > 3) break;
    } else {
      stableCount = 0;
      lastCount = currentCount;
    }
  }

  console.log("Final job card count:", lastCount);
}

async function scrapeLinkedInJobs() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Go to LinkedIn homepage
    await page.goto("https://www.linkedin.com", {
      waitUntil: "domcontentloaded",
    });

    // Click "Sign in" button
    await page.click("a.nav__button-secondary");

    // Fill in email and password
    await page.fill('input[name="session_key"]', LINKEDIN_EMAIL);
    await page.fill('input[name="session_password"]', LINKEDIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForNavigation({ waitUntil: "domcontentloaded" });

    // Go to jobs page.
    await page.goto(
      "https://www.linkedin.com/jobs/search/?currentJobId=4254952876&distance=25&f_TPR=r3600&f_WT=1%2C2%2C3&geoId=102095887&keywords=Frontend%20Developer&origin=JOB_SEARCH_PAGE_JOB_FILTER&refresh=true",
      {
        waitUntil: "domcontentloaded",
      }
    );

    // Scroll the list
    await scrollLinkedInJobsSidebar(page);

    // Extract job info
    const jobs = await page.$$eval(".job-card-container", (cards) =>
      cards.map((card) => {
        const anchor = card.querySelector("a.job-card-container__link");
        const title = anchor?.innerText?.trim() || "";
        const href = anchor?.getAttribute("href") || "";
        const fullUrl = href ? `https://www.linkedin.com${href}` : "";

        return {
          title,
          url: fullUrl,
        };
      })
    );

    console.log(`Found ${jobs.length} jobs`);

    if (jobs.length) {
      await sendJobsByEmail(jobs);
    } else {
      console.warn("⚠️ No jobs found to send.");
    }
  } catch (err) {
    console.error("Error during scraping:", err.message);
  } finally {
    await browser.close();
  }
}

export default scrapeLinkedInJobs;
