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
    const d = data[key].map((price) => +price.match(/\d+/)[0]);
    const medianOfDate = median(d);
    console.log(`for ${d.length} records of ${key} median is ${medianOfDate}`);
  }
};
