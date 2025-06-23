import cron from "node-cron";
import scrapeLinkedInJobs from "./scrapper.js";

console.log("🟢 Scheduler started. Running every 1 hour.");

scrapeLinkedInJobs(); // Run immediately on boot

cron.schedule("0 * * * *", () => {
  console.log(`⏱️ Running scraper at ${new Date().toLocaleString()}`);
  scrapeLinkedInJobs();
});
