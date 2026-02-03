#!/usr/bin/env node
/**
 * Build primary-school seed data from official HKSAR CSDI / data.gov.hk datasets.
 *
 * Sources are ZIP files containing a single CSV.
 * We normalize into the schema fields used by Convex `schools` table:
 *   nameEn, nameZh, level, type,
 *   districtEn/districtZh, genderEn/genderZh, religionEn/religionZh,
 *   addressEn/addressZh, latitude/longitude, websiteUrl, sourceLastUpdate
 *
 * Run:
 *   node scripts/buildPrimarySchoolsSeed.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_DIR = path.resolve(__dirname, "../data/seed");
const TMP_DIR = path.resolve(__dirname, "../.tmp/seed");

const SOURCES = [
  {
    key: "aided_primary",
    label: "Aided Primary Schools",
    url: "https://static.csdi.gov.hk/csdi-webpage/download/f95508de05b054ca8de2ffc65d71c46c/csv",
  },
  {
    key: "govt_primary",
    label: "Government Primary Schools",
    url: "https://static.csdi.gov.hk/csdi-webpage/download/3712791c2d28533896e51f14a4eecbaf/csv",
  },
  {
    key: "private_primary",
    label: "Private Primary Schools",
    url: "https://static.csdi.gov.hk/csdi-webpage/download/963d88edb82b537fbcc31b567608eea5/csv",
  },
  {
    key: "dss_primary",
    label: "Direct Subsidy Scheme Primary Schools",
    url: "https://static.csdi.gov.hk/csdi-webpage/download/5d52d767073f5b5d889aaef216159b54/csv",
  },
  {
    key: "esf_primary",
    label: "English Schools Foundation (Primary)",
    url: "https://static.csdi.gov.hk/csdi-webpage/download/9d25e53486d350c9b92f1dc042feac62/csv",
  },
  {
    key: "international_primary",
    label: "International Schools (Primary)",
    url: "https://static.csdi.gov.hk/csdi-webpage/download/dae3cc5f0f1053a2a47b98381d044165/csv",
  },
];

function parseCsvLine(line) {
  // Minimal CSV parser for this dataset (no embedded newlines; quotes may appear).
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function pickWebsiteUrl(row) {
  // In this EDB dataset, the website appears in one of NSEARCH fields.
  // We try NSEARCH3 first (common), then scan for a value that looks like a URL.
  const candidates = [
    row.NSEARCH03_EN,
    row.NSEARCH03_TC,
    row.NSEARCH04_EN,
    row.NSEARCH04_TC,
    row.NSEARCH05_EN,
    row.NSEARCH05_TC,
  ].filter(Boolean);

  for (const c of candidates) {
    const v = String(c).trim();
    if (v.startsWith("http://") || v.startsWith("https://")) return v;
  }

  for (const v of Object.values(row)) {
    if (!v) continue;
    const s = String(v).trim();
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
  }

  return "";
}

function normalizeType(type) {
  return String(type ?? "").trim().toUpperCase();
}

function normalizeLevel(level) {
  const v = String(level ?? "").trim().toUpperCase();
  if (!v) return "PRIMARY";
  return v;
}

function normalizeDistrict(d) {
  return String(d ?? "").trim().toUpperCase();
}

function makeDedupeKey({ nameEn, nameZh, districtEn, websiteUrl }) {
  const website = (websiteUrl || "").trim().toLowerCase();
  if (website) return `url:${website}`;
  return `name:${nameEn.toLowerCase()}|${nameZh.toLowerCase()}|${(districtEn || "").toLowerCase()}`;
}

async function download(url, outPath) {
  await execFileAsync("curl", ["-L", "-o", outPath, url], { maxBuffer: 1024 * 1024 * 20 });
}

async function unzipToString(zipPath) {
  // The ZIPs contain exactly one CSV file.
  const { stdout: list } = await execFileAsync("unzip", ["-l", zipPath]);
  const csvLine = list
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.endsWith(".csv"));
  if (!csvLine) throw new Error(`No CSV found in zip: ${zipPath}`);

  const parts = csvLine.split(/\s+/);
  const csvName = parts[parts.length - 1];

  const { stdout } = await execFileAsync("unzip", ["-p", zipPath, csvName], {
    maxBuffer: 1024 * 1024 * 50,
  });
  return stdout;
}

function parseEdBSchoolCsv(csvText, { type }) {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length !== header.length) continue;
    const row = Object.fromEntries(header.map((h, idx) => [h, values[idx]]));

    const nameEn = (row.NAME_EN ?? "").trim();
    const nameZh = (row.NAME_TC ?? "").trim();
    if (!nameEn && !nameZh) continue;

    const websiteUrl = pickWebsiteUrl(row);

    const latitude = row.LATITUDE ? Number(row.LATITUDE) : undefined;
    const longitude = row.LONGITUDE ? Number(row.LONGITUDE) : undefined;

    rows.push({
      nameEn,
      nameZh,
      level: normalizeLevel(row.SEARCH04_EN ?? "PRIMARY"),
      type: normalizeType(type ?? row.SEARCH05_EN),

      districtEn: normalizeDistrict(row.SEARCH03_EN ?? ""),
      districtZh: (row.SEARCH03_TC ?? "").trim(),

      genderEn: (row.SEARCH01_EN ?? "").trim() || undefined,
      genderZh: (row.SEARCH01_TC ?? "").trim() || undefined,

      religionEn: (row.NSEARCH01_EN ?? "").trim() || undefined,
      religionZh: (row.NSEARCH01_TC ?? "").trim() || undefined,

      addressEn: (row.ADDRESS_EN ?? "").trim() || undefined,
      addressZh: (row.ADDRESS_TC ?? "").trim() || undefined,

      latitude: Number.isFinite(latitude) ? latitude : undefined,
      longitude: Number.isFinite(longitude) ? longitude : undefined,

      websiteUrl,
      sourceLastUpdate: (row.LASTUPDATE ?? "").trim() || undefined,

      // Note: intentionally omit any extra fields not in the Convex validator.
    });
  }

  return rows;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(TMP_DIR, { recursive: true });

  const all = [];

  for (const src of SOURCES) {
    const zipPath = path.join(TMP_DIR, `${src.key}.zip`);
    process.stdout.write(`Downloading ${src.label}... `);
    await download(src.url, zipPath);
    process.stdout.write(`ok\n`);

    const csvText = await unzipToString(zipPath);

    // Derive type from key
    const type = src.key
      .replace(/_primary$/, "")
      .replace(/_/, " ")
      .toUpperCase();

    const rows = parseEdBSchoolCsv(csvText, { type });
    all.push(...rows);
  }

  const deduped = new Map();
  for (const s of all) {
    const k = makeDedupeKey(s);
    if (!deduped.has(k)) deduped.set(k, s);
  }

  const out = {
    generatedAt: new Date().toISOString(),
    sources: SOURCES,
    countRaw: all.length,
    countDeduped: deduped.size,
    schools: [...deduped.values()].sort((a, b) => a.nameEn.localeCompare(b.nameEn)),
  };

  const outPath = path.join(OUT_DIR, "hk_primary_schools_seed.json");
  const payload = JSON.stringify(out, null, 2);
  await fs.writeFile(outPath, payload);

  // Also copy into `convex/` so the seed snapshot can be bundled and used by scheduled jobs.
  const convexSeedDir = path.resolve(__dirname, "../convex/seed");
  await fs.mkdir(convexSeedDir, { recursive: true });
  const convexOutPath = path.join(convexSeedDir, "hk_primary_schools_seed.json");
  await fs.writeFile(convexOutPath, payload);

  console.log(`\nWrote: ${outPath}`);
  console.log(`Copied: ${convexOutPath}`);
  console.log(`Raw rows: ${out.countRaw}`);
  console.log(`Deduped:  ${out.countDeduped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
