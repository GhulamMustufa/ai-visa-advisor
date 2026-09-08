import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { createObjectCsvWriter } from "csv-writer";

interface VisaEntry {
  Country: string;
  Pathway: string;
  URL: string;
}

const INPUT_CSV = path.join(process.cwd(), "country_visa.csv");
const OUTPUT_CSV = path.join(process.cwd(), "country_visa_clean.csv");

// Using a simple delay to throttle requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function validateURL(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD", // Prefer HEAD to save bandwidth
      signal: AbortSignal.timeout(5000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    // If HEAD fails, try GET (some sites block HEAD)
    if (!res.ok && res.status !== 405) {
      return false; 
    }
    return true;
  } catch (err) {
    // If HEAD fails completely (e.g. timeout), try a standard GET
    try {
      const resGet = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      });
      return resGet.ok;
    } catch {
      return false;
    }
  }
}

async function run() {
  console.log(`\n🔍 Starting Deep Analysis of ${INPUT_CSV}\n`);

  const results: VisaEntry[] = [];
  
  // 1. Read CSV
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(INPUT_CSV)
      .pipe(csv())
      .on("data", (data: VisaEntry) => results.push(data))
      .on("end", () => resolve())
      .on("error", (error) => reject(error));
  });

  console.log(`📊 Total rows parsed: ${results.length}`);

  // 2. Identify Duplicates
  const seen = new Set<string>();
  const duplicates: VisaEntry[] = [];
  const uniqueEntries: VisaEntry[] = [];

  for (const entry of results) {
    const key = `${entry.Country}-${entry.Pathway}`.toLowerCase().trim();
    if (seen.has(key)) {
      duplicates.push(entry);
    } else {
      seen.add(key);
      uniqueEntries.push(entry);
    }
  }

  console.log(`\n⚠️ Found ${duplicates.length} duplicate entries (same Country + Pathway).`);
  duplicates.forEach(d => console.log(`   - Duplicate: ${d.Country} | ${d.Pathway}`));
  
  console.log(`\n✅ Validating ${uniqueEntries.length} unique URLs... (This may take a minute)`);

  const validEntries: VisaEntry[] = [];
  const brokenUrls: VisaEntry[] = [];

  // 3. Batch Validate URLs (Batch size of 20 to avoid rate limits)
  const BATCH_SIZE = 20;
  for (let i = 0; i < uniqueEntries.length; i += BATCH_SIZE) {
    const batch = uniqueEntries.slice(i, i + BATCH_SIZE);
    
    // Process batch concurrently
    const batchResults = await Promise.all(
      batch.map(async (entry) => {
        const isValid = await validateURL(entry.URL);
        return { entry, isValid };
      })
    );

    // Sort results
    for (const res of batchResults) {
      if (res.isValid) {
        validEntries.push(res.entry);
        process.stdout.write("."); // Progress indicator
      } else {
        brokenUrls.push(res.entry);
        process.stdout.write("x");
      }
    }
    
    // Pause briefly between batches to respect rate limits
    await delay(500);
  }

  console.log(`\n\n❌ Found ${brokenUrls.length} broken or blocked URLs:`);
  brokenUrls.forEach(b => console.log(`   - Broken: ${b.URL} (${b.Country})`));

  console.log(`\n💾 Saving ${validEntries.length} verified entries to ${OUTPUT_CSV}...`);

  // 4. Save to new CSV
  const csvWriter = createObjectCsvWriter({
    path: OUTPUT_CSV,
    header: [
      { id: 'Country', title: 'Country' },
      { id: 'Pathway', title: 'Pathway' },
      { id: 'URL', title: 'URL' }
    ]
  });

  await csvWriter.writeRecords(validEntries);
  console.log(`🎉 Done! Cleaned data saved successfully.\n`);
}

run().catch(console.error);
