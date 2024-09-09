import "dotenv/config";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import randomUserAgent from "random-useragent";
import { readJsonFile, writeObjectToFile } from "./utils/db.js";
import { report } from "./utils/helpers.js"; // Ensure this path is correct
import { executablePath } from "puppeteer";
import notification from "./utils/soundEffects.js";

puppeteer.use(StealthPlugin());

let finalResult = {};
let firstTime = true;
const checkCaptchaPresence = async (page) => {
  const captchaExists = await page.evaluate(() => {
    const pressHoldElement = document.querySelector(
      '[aria-label="Press & Hold"]'
    );
    const pxCaptchaElement = document.getElementById("px-captcha");

    return !!pressHoldElement || !!pxCaptchaElement; // true if either exists
  });

  return captchaExists;
};

const navigateTo = async (page, url) => {
  try {
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 3 * 60000 });
    console.log("Page loaded.");
  } catch (error) {
    console.error(`Error navigating to ${url}:`, error.message);
    throw error;
  }
};
const reactionToPage = async (
  page,
  captchaPresent,
  clickCookies,
  clickModal
) => {
  if (clickCookies)
    await page
      .click("#onetrust-reject-all-handler")
      .catch((e) => console.error("Cookies handler not found", e));
  if (clickModal)
    await page
      .click(".modal-content-close")
      .catch((e) => console.error("Modal close button not found", e));
  while (captchaPresent) {
    console.log("there is a captcha present ❌");
    if (clickCookies)
      await page
        .click("#onetrust-reject-all-handler")
        .catch((e) => console.error("Cookies handler not found", e));
    if (clickModal)
      await page
        .click(".modal-content-close")
        .catch((e) => console.error("Modal close button not found", e));
    await new Promise((res) => setTimeout(res, 1000 * 60));
  }
  console.log("passed from captcha ✅");
  // if (captchaPresent) continue;
};
const extractPricesFromPage = async (
  page,
  captchaPresent,
  clickCookies,
  clickModal
) => {
  const prices = { basic: [], standard: [], premium: [] };

  try {
    // Extract prices for the standard and premium tiers
    console.log("waiting for package-tab-1");
    // await reactionToPage(page, captchaPresent, clickCookies, clickModal);
    await page.waitForSelector('label[for="package-tab-1"]', { visible: true });
    // await reactionToPage(page, captchaPresent, clickCookies, clickModal);

    await page.waitForSelector(".price-wrapper span.price");
    const basicPrices = await page.$$eval(
      ".price-wrapper span.price",
      (elements) => elements.map((e) => e.innerText.trim())
    );
    prices.basic.push(...basicPrices);
    await page.waitForSelector('label[for="package-tab-2"]', { visible: true });
    // await reactionToPage(page, captchaPresent, clickCookies, clickModal);
    await page.click('label[for="package-tab-2"]');
    await page.waitForSelector(".price-wrapper span.price");
    const standardPrices = await page.$$eval(
      ".price-wrapper span.price",
      (elements) => elements.map((e) => e.innerText.trim())
    );
    prices.standard.push(...standardPrices);
    // await reactionToPage(page, captchaPresent, clickCookies, clickModal);
    await page.click('label[for="package-tab-3"]');

    await page.waitForSelector(".price-wrapper span.price");
    const premiumPrices = await page.$$eval(
      ".price-wrapper span.price",
      (elements) => elements.map((e) => e.innerText.trim())
    );
    prices.premium.push(...premiumPrices);
  } catch (error) {
    console.error("Error extracting prices from page:", error.message);
  }

  return prices;
};
const main = async (term, number) => {
  let captchaPresent = false;
  let clickModal = false;
  let clickCookies = false;

  // Define the interval to check for captcha presence

  console.log("Starting Puppeteer...");

  try {
    const browser = await puppeteer.launch({
      headless: false,
      executablePath: executablePath(),
    });
    const page = await browser.newPage();
    const userAgent = randomUserAgent.getRandom();
    await page.setUserAgent(userAgent);
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

    console.log(`Scraping results for "${term}"...`);
    const url = `https://www.fiverr.com/search/gigs?query=${encodeURIComponent(
      term
    )}&page=${number}`;
    // const checkCaptchaInterval = setInterval(async () => {
    //   const result = await page.evaluate(() => {
    //     return {
    //       captchaPresent: !!document.querySelector(
    //         '[aria-label="Press & Hold"]' ||
    //           !!document.getElementById("px-captcha")
    //       ),
    //       clickCookies: !!document.querySelector("#onetrust-banner-sdk"),
    //       clickModal: !!document.querySelector(".modal-content"),
    //     };
    //   });

    //   // Update the variables
    //   captchaPresent = result.captchaPresent;
    //   clickCookies = result.clickCookies;
    //   clickModal = result.clickModal;

    //   // Log to debug
    //   console.log(
    //     `captchaPresent: ${captchaPresent}, clickCookies: ${clickCookies}, clickModal: ${clickModal}`
    //   );
    // }, 1000);
    await navigateTo(page, url);
    // await reactionToPage(page, captchaPresent, clickCookies, clickModal);
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
    console.log(
      `${hrefs.length ? `✅ hrefs extracted` : `❌ hrefs extraction failed`}`
    );

    for (let i = 0; i < hrefs.length; i++) {
      try {
        console.log(`running for ${i + 1} href of ${hrefs.length} hrefs`);
        const href = hrefs[i];
        await navigateTo(page, href);
        let notifPlayed = false;
        while (await checkCaptchaPresence(page)) {
          !notifPlayed && notification();
          notifPlayed = true;
          console.log("captcha is present waiting for 20 seconds ");
          await new Promise((res) => setTimeout(res, 20000));
        }
        // await reactionToPage(page, captchaPresent, clickCookies, clickModal);

        const packageContentExists = await page.$(".package-content");
        if (!packageContentExists) continue;

        console.log(`getting results for gig`);
        const { basic, standard, premium } = await extractPricesFromPage(
          page,
          captchaPresent,
          clickCookies,
          clickModal
        );

        await page.goBack({ waitUntil: "domcontentloaded" });

        if (basic.length) {
          finalResult[term] = finalResult[term] || {};
          finalResult[term]["basic"] = (
            finalResult[term]["basic"] || []
          ).concat(basic);
        }
        if (standard.length) {
          finalResult[term] = finalResult[term] || {};
          finalResult[term]["standard"] = (
            finalResult[term]["standard"] || []
          ).concat(standard);
        }
        if (premium.length) {
          finalResult[term] = finalResult[term] || {};
          finalResult[term]["premium"] = (
            finalResult[term]["premium"] || []
          ).concat(premium);
        }

        console.log(`Finished scraping gig: ${i + 1}`);
      } catch (err) {
        console.error(err);
      }
    }

    console.log(
      `Extracted prices from page ${number} for "${term}":`,
      finalResult[term]
    );
    await writeObjectToFile(finalResult);
    await report();
    await browser.close();
    console.log("Browser closed.");
    // clearInterval(checkCaptchaInterval);
  } catch (error) {
    console.error("Overall Error:", error.message);
    // clearInterval(checkCaptchaInterval);
  }
};

const terms = [
  "fullstack nextjs",
  "fullstack nextjs app",
  "nextjs",
  "nextjs developer",
  "nextjs app",
  "fullstack developer",
  "fullstack web developer",
  "react",
  "react developer",
  "fullstack react app",
  "express api",
  "expressjs api",
  "api developer",
  "api development",
  "frontend developer",
  "backend developer",
  "fullstack developer",
  "fullstack web development",
  "figma to react",
  "figma to nextjs",
  "drizzle orm",
  "prisma orm",
  "connect backend to database",
  "connect website to database",
  "website database integration",
];

// `fullstack nextjs`,
//   `fullstack developer`,
const runLoop = async () => {
  for (const term of terms) {
    const dataInDb = await readJsonFile();
    if (!!dataInDb[term]) continue;
    for (const i of [1, 2, 3, 4]) {
      await main(term, i);
    }
  }
};

runLoop();
