import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

export async function writeObjectToFile(obj) {
  try {
    // Find the location of the current file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // Resolve the path to db.json relative to this file
    const dbFilePath = path.resolve(__dirname, "../db.json");

    // Convert the object to a JSON string
    const data = JSON.stringify(obj, null, 2);

    // Write the JSON string to the db.json file
    await fs.writeFile(dbFilePath, data, "utf-8");

    console.log(`Successfully wrote object to the file at ${dbFilePath}.`);
  } catch (error) {
    console.error(`Failed to write to the file:`, error);
  }
}
export async function readJsonFile() {
  try {
    // Resolve the path to db.json relative to the current file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dbFilePath = path.resolve(__dirname, "../db.json");

    // Read the JSON file and parse its content
    const data = await fs.readFile(dbFilePath, "utf-8");
    const json = JSON.parse(data);

    return json;
  } catch (error) {
    console.error(`Error reading the JSON file:`, error);
  }
}
