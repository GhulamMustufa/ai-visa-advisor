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

async function run() {
  console.log(`\n🔍 Parsing and deduplicating: ${INPUT_CSV}`);

  const rawRows: VisaEntry[] = [];

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(INPUT_CSV)
      .pipe(csv())
      .on("data", (data: any) => {
        const country = (data.Country || data.country || "").trim();
        const pathway = (data.Pathway || data.pathway || "").trim();
        const url = (data.URL || data.url || "").trim();
        
        // Skip header lines repeated inside the body
        if (country.toLowerCase() === "country" && pathway.toLowerCase() === "pathway") {
          return;
        }

        if (country && pathway && url) {
          rawRows.push({ Country: country, Pathway: pathway, URL: url });
        }
      })
      .on("end", () => resolve())
      .on("error", (err) => reject(err));
  });

  console.log(`📊 Total rows parsed: ${rawRows.length}`);

  // Deduplicate on (Country + Pathway)
  const seen = new Set<string>();
  const duplicates: VisaEntry[] = [];
  const uniqueEntries: VisaEntry[] = [];

  for (const entry of rawRows) {
    let cleanUrl = entry.URL.trim().replace(/^['"]|['"]$/g, "");
    
    // Validate URL structure
    try {
      const parsed = new URL(cleanUrl);
      cleanUrl = parsed.toString();
    } catch {
      console.log(`❌ Skipping malformed URL: ${entry.Country} - ${entry.Pathway}: ${cleanUrl}`);
      continue;
    }

    const key = `${entry.Country}|||${entry.Pathway}`.toLowerCase().trim();
    if (seen.has(key)) {
      duplicates.push({ ...entry, URL: cleanUrl });
    } else {
      seen.add(key);
      uniqueEntries.push({ ...entry, URL: cleanUrl });
    }
  }

  // Sort alphabetically by Country, then by Pathway
  uniqueEntries.sort((a, b) => {
    const c = a.Country.localeCompare(b.Country);
    if (c !== 0) return c;
    return a.Pathway.localeCompare(b.Pathway);
  });

  console.log(`⚠️ Removed ${duplicates.length} duplicate entries.`);
  console.log(`✅ Kept ${uniqueEntries.length} verified unique entries.`);

  const csvWriter = createObjectCsvWriter({
    path: OUTPUT_CSV,
    header: [
      { id: "Country", title: "Country" },
      { id: "Pathway", title: "Pathway" },
      { id: "URL", title: "URL" },
    ],
  });

  await csvWriter.writeRecords(uniqueEntries);
  console.log(`💾 Cleaned data written to: ${OUTPUT_CSV}`);

  // Also update country_visa.csv so the primary source is clean
  const csvWriterPrimary = createObjectCsvWriter({
    path: INPUT_CSV,
    header: [
      { id: "Country", title: "Country" },
      { id: "Pathway", title: "Pathway" },
      { id: "URL", title: "URL" },
    ],
  });
  await csvWriterPrimary.writeRecords(uniqueEntries);
  console.log(`💾 Primary file country_visa.csv updated with clean data!\n`);
}

run().catch(console.error);
