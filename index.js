import "dotenv/config";
import puppeteer from "puppeteer-extra";

import StealthPlugin from "puppeteer-extra-plugin-stealth";
import median, { report } from "./utils/getMedian.js";
import { environment } from "puppeteer-core/internal/environment.js";
import { writeObjectToFile } from "./utils/db.js";
import randomUserAgent from "random-useragent";
import { executablePath } from "puppeteer";
let firstTime = true;
puppeteer.use(StealthPlugin());
let finalResult = {};
const main = async (term, number) => {
  console.log("Starting Puppeteer...");

  try {
    // Launch a new browser instance
    const browser = await puppeteer.launch({
      headless: false,
      executablePath: executablePath(),
    });
    //  process.env.PUPPETEER_EXECUTABLE_PATH ||
    //     "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    console.log("Browser launched.");

    const page = await browser.newPage();
    console.log("New page created.");

    // Set user-agent and accept-language headers to mimic a real browser
    const userAgent = randomUserAgent.getRandom();
    await page.setUserAgent(userAgent);
    // await page.setUserAgent(
    //   "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.119 Safari/537.36"
    // );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
    });

    // Function to navigate to a URL with error handling
    const navigateTo = async (url) => {
      try {
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
        firstTime && (await new Promise((res) => setTimeout(res, 1 * 60000)));
        firstTime = false;
        console.log("Page loaded.");
      } catch (error) {
        console.error(`Error navigating to ${url}:`, error.message);
        throw error;
      }
    };

    // Function to extract prices from the page
    // Function to extract prices from the page
    const extractPrices = async () => {
      try {
        return await page.evaluate(() => {
          const prices = [];
          const gigCards = document.querySelectorAll(
            ".gig-card-layout, .double-card-layout, .basic-gig-card"
          );

          gigCards.forEach((card) => {
            // Extract price text, focusing on elements with "From" or similar price indications
            const priceElement = card.querySelectorAll("span");
            priceElement.forEach((span) => {
              if (span) {
                // Capture prices that follow "From" and include € or $
                const priceText = span.innerText.trim();
                const priceMatch = priceText.match(/([€$]\d+(?:\.\d+)?)/);
                if (priceMatch) {
                  prices.push(priceMatch[1]);
                }
              }
            });
          });

          return prices;
        });
      } catch (error) {
        console.error("Error extracting prices:", error.message);
        return [];
      }
    };

    // Scrape prices for all search terms

    console.log(`Scraping results for "${term}"...`);

    const url = `https://www.fiverr.com/search/gigs?query=${encodeURIComponent(
      term
    )}&page=${number}`;
    await navigateTo(url);
    const prices = await extractPrices();
    if (prices.length) {
      finalResult[term] = finalResult[term]
        ? [...finalResult[term], ...prices]
        : [...prices];
    }
    console.log(`Extracted prices from page ${number} for "${term}":`, prices);

    console.log("Scraping completed.");

    // Close the browser
    await browser.close();
    console.log("Browser closed.");
  } catch (error) {
    console.error("Overall Error:", error.message);
  }
};
const searched = `for 552 records of fullstack app median is 95
for 552 records of fullstack web app median is 76
for 564 records of fullstack median is 81
for 564 records of fullstack nextjs median is 76
for 570 records of fullstack nextjs app median is 76
for 276 records of nextjs median is 90
for 864 records of nextjs developer median is 67
for 846 records of nextjs app median is 76
for 852 records of fullstack developer median is 95
for 570 records of fullstack web developer median is 81
for 582 records of react median is 76
for 558 records of react developer median is 86
for 288 records of fullstack react app median is 95
for 576 records of express api median is 48
for 576 records of expressjs api median is 29
for 570 records of api developer median is 76
for 576 records of api developement median is 95
for 330 records of frontend developer median is 76
for 852 records of backend developer median is 76
for 612 records of fullstack developer median is 76
for 612 records of fullstack web developement median is 95
for 1146 records of figma to react median is 48
for 624 records of figma to nextjs median is 29
for 132 records of drizzle orm median is 62
for 678 records of prisma orm median is 48
for 846 records of connect backend to database median is 48
for 1140 records of connect website to database median is 29
for 1152 records of website database integration median is 92.5`;

const terms = [``];
const runLoop = async () => {
  for (const term of terms.filter((term) => !searched.includes(term)))
    for (const i of [4, 3, 2, 1]) await main(term, i);
  await writeObjectToFile(finalResult);
  await report();
};
searched
  .split("\n")
  .sort((a, b) => -+a.match(/\d+(\.\d+)?/g)[1] + +b.match(/\d+(\.\d+)?/g)[1])
  .forEach((d) =>
    console.log(
      `${d.slice(d.indexOf("of") + 2, d.indexOf("median")).trim()} : ${
        d.match(/\d+(\.\d+)?/g)[1]
      }`
    )
  );
// runLoop();
// const data = [];
// console.log(median(data.map((p) => +p.match(/\d+/)[0])));
// console.log(terms.filter((term) => !searched.includes(term)));
