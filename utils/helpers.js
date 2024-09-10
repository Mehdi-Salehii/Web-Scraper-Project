import data from "./data.js";
import { readJsonFile } from "./db.js";

export default function median(values) {
  if (values.length === 0) {
    throw new Error("Input array is empty");
  }

  // Sorting values, preventing original array
  // from being mutated.
  values = [...values].sort((a, b) => a - b);

  const half = Math.floor(values.length / 2);

  return values.length % 2
    ? values[half]
    : (values[half - 1] + values[half]) / 2;
}

const allPrices = data
  .reduce((prev, curr) => [...prev, ...curr], [])
  .map((price) => +price.match(/\d+/)[0]);
// console.log("total median :", median(allPrices));
// console.log("total number of records :", allPrices.length);
export const report = async () => {
  const data = await readJsonFile();
  for (const key of Object.keys(data)) {
    if (Array.isArray(data[key])) {
      const d = data[key].map((price) => {
        const refinedPrice = price.replace(",", "");
        return +refinedPrice.match(/\d+/)[0];
      });
      const medianOfDate = median(d);
      console.log(
        `for ${d.length} records of ${key} median is ${medianOfDate}`
      );
    } else {
      const basic = data[key]["basic"].map((price) => {
        const refinedPrice = price.replace(",", "");
        return +refinedPrice.match(/\d+/)[0];
      });
      const standard = data[key]["standard"].map((price) => {
        const refinedPrice = price.replace(",", "");
        return +refinedPrice.match(/\d+/)[0];
      });
      const premium = data[key]["premium"].map((price) => {
        const refinedPrice = price.replace(",", "");
        return +refinedPrice.match(/\d+/)[0];
      });
      const medianOfbasic = median(basic);
      const medianOfstandard = median(standard);
      const medianOfpremium = median(premium);
      return (
        `${"".padStart(30, "*")}${key}${"".padEnd(30, "*")}\n` +
        `for ${basic.length} records of ${key}:basic median is ${medianOfbasic}\n` +
        `for ${standard.length} records of ${key}:standard median is ${medianOfstandard}\n` +
        `for ${premium.length} records of ${key}:premium median is ${medianOfpremium}\n`
      );
    }
  }
};
export const sortedReport = async (sortBy = "standard") => {
  const data = await fs.readFile("./complete-summary.txt", "utf-8");

  const refinedData = data.split(/\n(?=\*+)/).map((d) => {
    const title = d.match(/(?<=\*\s{2})\D+(?=\s{2}\*)/);
    const basicMedian = +d.match(/(?<=basic\D+)\d+/);
    const standardMedian = +d.match(/(?<=standard\D+)\d+/);
    const premiumMedian = +d.match(/(?<=premium\D+)\d+/);
    return [`${title}`, basicMedian, standardMedian, premiumMedian];
  });
  const dataToShow = {
    basic: [...refinedData].sort((a, b) => b[1] - a[1]),
    standard: [...refinedData].sort((a, b) => b[2] - a[2]),
    premium: [...refinedData].sort((a, b) => b[3] - a[3]),
  };

  console.log(`sorted by highest ${sortBy} :`, dataToShow[sortBy]);
};
