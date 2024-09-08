import "dotenv/config";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import randomUserAgent from "random-useragent";
import { writeObjectToFile } from "./utils/db.js";
import { report } from "./utils/getMedian.js"; // Ensure this path is correct
import { executablePath } from "puppeteer";

puppeteer.use(StealthPlugin());

let finalResult = {};
let firstTime = true;

const extractPricesFromPage = async (page) => {
  const prices = { standard: [], premium: [] };

  try {
    // Click the "package-tab-2" tab and extract prices
    console.log("extracting prices for standard tier");
    // await page.waitForSelector('label[for="package-tab-2"]', { visible: true });
    await page.waitForNetworkIdle({ idleTime: 1000, timeout: 0 });
    await page.click('label[for="package-tab-2"]');
    await page.waitForSelector("span.price-with-tooltip > span.price");
    const priceSelectorStandard = await page.$(
      "span.price-with-tooltip > span.price"
    );

    const standardPrices = await page.evaluate(() => {
      const priceElements = priceSelectorStandard;
      return Array.from(priceElements).map((span) => span.innerText.trim());
    });
    console.log(`standard tier extracted prices ${standardPrices}`);
    prices.standard.push(...standardPrices);

    // Click the "package-tab-3" tab and extract prices
    console.log("extracting prices for premium tier");

    // await page.waitForSelector('label[for="package-tab-3"]', { visible: true });
    await page.waitForNetworkIdle({ idleTime: 1000, timeout: 0 });
    await page.click('label[for="package-tab-3"]');
    await page.waitForSelector("span.price-with-tooltip > span.price");
    const priceSelectorPremium = await page.$(
      "span.price-with-tooltip > span.price"
    );

    const premiumPrices = await page.evaluate(() => {
      const priceElements = priceSelectorPremium;
      return Array.from(priceElements).map((span) => span.innerText.trim());
    });
    console.log(`premium tier extracted prices ${premiumPrices}`);

    prices.premium.push(...premiumPrices);
  } catch (error) {
    console.error("Error extracting prices from page:", error.message);
  }

  return prices;
};

const waitForPressHoldToDisappear = async (page) => {
  let pressHoldExists = true;
  let checkCounter = 0;
  console.log("checking captcha presence");
  while (pressHoldExists) {
    // Ensure the page is fully loaded and idle
    await page.waitForNetworkIdle({ idleTime: 1000, timeout: 0 }); // Remove timeout to wait indefinitely

    // Check if the 'Press & Hold' element exists
    pressHoldExists = await page.evaluate(() => {
      return !!document.querySelector('[aria-label="Press & Hold"]');
    });

    if (pressHoldExists) {
      checkCounter++;
      console.log(
        `Check ${checkCounter}: 'Press & Hold' element still present. Waiting 1 minute...`
      );
      // Wait for 1 minute before checking again
      await new Promise((res) => setTimeout(res, 60000));
    } else {
      console.log("'Press & Hold' element has disappeared.");
      break; // Exit loop when element is gone
    }
  }
};

const main = async (term, number) => {
  console.log("Starting Puppeteer...");

  try {
    const browser = await puppeteer.launch({
      headless: false,
      executablePath: executablePath(),
    });
    // process.env.PUPPETEER_EXECUTABLE_PATH ||
    //       "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    const page = await browser.newPage();
    const userAgent = randomUserAgent.getRandom();
    await page.setUserAgent(userAgent);
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

    const navigateTo = async (url) => {
      try {
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: "networkidle0", timeout: 3 * 60000 });
        console.log("Page loaded.");
      } catch (error) {
        console.error(`Error navigating to ${url}:`, error.message);
        throw error;
      }
    };

    console.log(`Scraping results for "${term}"...`);
    const url = `https://www.fiverr.com/search/gigs?query=${encodeURIComponent(
      term
    )}&page=${number}`;
    await navigateTo(url);
    // await waitForPressHoldToDisappear(page);
    const pressHoldElement = await page.$('[aria-label="Press & Hold"]');
    if (pressHoldElement) {
      console.log(
        "Element found, possibly need to handle press & hold interaction"
      );
    } else {
      console.log("No Press & Hold element found");
    }
    // Extract hrefs from gig cards
    console.log(`extracting hrefs...`);
    let hrefs = await page.evaluate(() => {
      return [
        ...document.querySelectorAll(
          ".gig-card-layout a,.double-card-layout a,.basic-gig-card a"
        ),
      ].map((anchor) => anchor.href);
    });
    hrefs = hrefs.length ? [...new Set(hrefs)] : [];
    console.log(hrefs);
    console.log(
      `${hrefs.length ? `✅ hrefs extracted` : `❌ hrefs extraction failed`}`
    );

    for (let i = 0; i < hrefs.length; i++) {
      console.log(`running for ${i + 1} href of ${hrefs.length} hrefs`);
      const href = hrefs[i];
      // Navigate to gig detail page in the same tab
      await navigateTo(href);

      const { skipCheck, clickModal, clickCookies } = await page.evaluate(
        () => {
          return {
            skipCheck: !!document.querySelector('[aria-label="Press & Hold"]'),
            clickCookies: !!document.querySelector("#onetrust-banner-sdk"),
            clickModal: !!document.querySelector(".modal-content"),
          };
        }
      );
      if (skipCheck) continue;
      clickCookies && (await page.click("#onetrust-reject-all-handler"));
      clickModal && (await page.click(".modal-content-close"));
      // await waitForPressHoldToDisappear(page);
      await page.waitForNetworkIdle({ idleTime: 1000, timeout: 0 });
      const packageContent = page.$(".package-content");
      if (!packageContent) continue;
      // Wait for 'Press & Hold' to disappear, if applicable
      console.log(`evaluating press and hold presence`);

      // Extract prices from the gig detail page
      console.log(`getting results for gig`);
      const { standard, premium } = await extractPricesFromPage(page);

      // Go back to the search results page
      console.log(`rolling back to run next href...`);
      await page.goBack({ waitUntil: "networkidle0" });

      // Store the extracted prices
      if (standard.length) {
        finalResult[term] = finalResult[term] || {};
        finalResult[term][0] = (finalResult[term][0] || []).concat(standard);
      }
      if (premium.length) {
        finalResult[term] = finalResult[term] || {};
        finalResult[term][1] = (finalResult[term][1] || []).concat(premium);
      }

      console.log(`Finished scraping gig: ${i + 1}`);
    }

    console.log(
      `Extracted prices from page ${number} for "${term}":`,
      finalResult[term]
    );

    await browser.close();
    console.log("Browser closed.");
  } catch (error) {
    console.error("Overall Error:", error.message);
  }
};

const terms = [
  `fullstack`,
  `fullstack app`,
  `fullstack nextjs`,
  `fullstack developer`,
];

const runLoop = async () => {
  for (const term of terms) {
    for (const i of [1, 2]) {
      await main(term, i);
    }
  }
  await writeObjectToFile(finalResult);
  await report();
};

runLoop();
