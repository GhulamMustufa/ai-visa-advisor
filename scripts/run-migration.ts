import fs from "fs";
import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({ connectionString });
  await client.connect();
  console.log("Connected to database.");

  try {
    const sql = fs.readFileSync(
      "db/migrations/20260907133700_add_evidence_schema.sql",
      "utf8"
    );
    await client.query(sql);
    console.log("Migration executed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

main();
