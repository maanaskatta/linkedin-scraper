import nodemailer from "nodemailer";
import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

const { EMAIL_SERVICE, EMAIL_USER, EMAIL_PASS, EMAIL_TO } = process.env;

/**
 * Shortens a URL using TinyURL API.
 */
async function shortenUrl(longUrl) {
  try {
    const response = await axios.get(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`
    );
    return response.data;
  } catch (err) {
    console.error(`⚠️ Failed to shorten URL: ${longUrl}`, err.message);
    return longUrl; // fallback to original
  }
}

/**
 * Sends the scraped jobs to your email.
 */
export async function sendJobsByEmail(jobs) {
  if (!jobs || jobs.length === 0) return;

  const transporter = nodemailer.createTransport({
    service: EMAIL_SERVICE,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  // Shorten all job URLs
  const jobHtmlBlocks = await Promise.all(
    jobs.map(async (job, index) => {
      const shortUrl = await shortenUrl(job.url);
      return `<p><b>${index + 1}. ${
        job.title
      }</b><br/><a href="${shortUrl}">${shortUrl}</a></p>`;
    })
  );

  const mailOptions = {
    from: `"LinkedIn Scraper Bot" <${EMAIL_USER}>`,
    to: EMAIL_TO,
    subject: `🧾 ${jobs.length} New LinkedIn Job Postings`,
    html: `<h2>LinkedIn Jobs</h2>${jobHtmlBlocks.join("")}`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📩 Email sent: ${info.response}`);
  } catch (err) {
    console.error("❌ Failed to send email:", err.message);
  }
}
