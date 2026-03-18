#!/usr/bin/env node
/**
 * review-data.js – Interaktives CLI-Tool zur manuellen Prüfung der Pflegeheim-Kontaktdaten
 * 
 * Usage: node scripts/review-data.js [--all] [--category <cat>] [--city <city>]
 * 
 * Kategorien:
 *   1 = Fax == Phone
 *   2 = Verdächtig lange Telefon/Fax
 *   3 = Personalisierte Email auf Träger-Domain
 *   4 = Alle anderen personalisierten Emails
 *   5 = Alle (auch bereits ok aussehende)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');

// ============================================================================
// CONFIG
// ============================================================================
const DB_PATH = path.join(__dirname, '../data/database.json');

// Bekannte Träger-Domains (Teilstrings)
const CARRIER_DOMAINS = [
  'caritas', 'diakonie', 'awo', 'drk', 'johanniter', 'malteser',
  'alloheim', 'pro-talis', 'korian', 'orpea', 'cusanus', 'augustinus',
  'rheinlandklinikum', 'bethel', 'diakoniewerk', 'evangelisch',
  'alexianer', 'christophorus', 'vinzenz', 'katharina-kasper',
  'marienhaus', 'cellitinnen', 'bonifatius', 'recollectio'
];

// Email-Prefixe die als "allgemein/ok" gelten
const GENERAL_EMAIL_PREFIXES = [
  'info', 'kontakt', 'verwaltung', 'empfang', 'aufnahme', 'pflegeheim',
  'zentrale', 'seniorenheim', 'senioren', 'haus', 'home', 'office',
  'mail', 'service', 'post', 'rezeption', 'sekretariat', 'leitung',
  'einrichtungsleitung', 'heimleitung', 'el', 'seniorenzentrum',
  'seniorenstift', 'altenpflege', 'pflege', 'beratung', 'aufnahme-senioreneinrichtungen',
  'aph.heimaufnahme', 'beratung-pflege', 'pflegeberatung', 'seniorenberatung',
  'beratungszentrum', 'zbm', 'eac', 'pdl', 'stadthaus',
  'kontakt-altenpflege'
];

// ============================================================================
// ANSI COLORS (no dependency needed)
// ============================================================================
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

function isPersonalizedEmail(email) {
  if (!email || !email.includes('@')) return false;
  const local = email.split('@')[0].toLowerCase();
  // Check if it matches a known general prefix
  if (GENERAL_EMAIL_PREFIXES.some(p => local === p || local.startsWith(p + '.'))) return false;
  // Check for facility-specific patterns that are OK (e.g. dormagen@alloheim.de, juechen@senioren-park.de)
  // These are city/location-based → fine
  if (/^[a-z\-]+$/.test(local) && !local.includes('.')) return false;
  // Has a dot or looks like firstname.lastname
  if (/^[a-z]+\.[a-z]+/.test(local)) return true;
  // Single initial + dot + name
  if (/^[a-z]\.[a-z]+/.test(local)) return true;
  // If it contains a dot and doesn't match general patterns
  if (local.includes('.') && !GENERAL_EMAIL_PREFIXES.includes(local.split('.')[0])) return true;
  return false;
}

function isCarrierDomain(email) {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1].toLowerCase();
  return CARRIER_DOMAINS.some(cd => domain.includes(cd));
}

function isFaxEqualsPhone(entry) {
  if (!entry.fax || !entry.phone) return false;
  const cleanFax = entry.fax.replace(/[\s\-\/\(\)]/g, '');
  const cleanPhone = entry.phone.replace(/[\s\-\/\(\)]/g, '');
  return cleanFax === cleanPhone && cleanFax.length > 3;
}

function isSuspiciouslyLong(number) {
  if (!number) return false;
  const digits = number.replace(/[^\d]/g, '');
  return digits.length > 15;
}

function hasMultipleNumbers(field) {
  if (!field) return false;
  return /oder|und|\+|\/\s*0|\d\s{2,}\d/.test(field);
}

// ============================================================================
// CATEGORIZE ENTRIES
// ============================================================================

function categorizeEntry(entry) {
  const issues = [];

  if (isFaxEqualsPhone(entry)) {
    issues.push({ cat: 1, label: '🔴 FAX == PHONE', field: 'fax', severity: 'critical' });
  }
  if (isSuspiciouslyLong(entry.phone)) {
    issues.push({ cat: 2, label: '🟡 PHONE zu lang', field: 'phone', severity: 'warning' });
  }
  if (isSuspiciouslyLong(entry.fax)) {
    issues.push({ cat: 2, label: '🟡 FAX zu lang', field: 'fax', severity: 'warning' });
  }
  if (hasMultipleNumbers(entry.phone)) {
    issues.push({ cat: 2, label: '🟡 PHONE enthält mehrere Nummern', field: 'phone', severity: 'warning' });
  }
  if (hasMultipleNumbers(entry.fax)) {
    issues.push({ cat: 2, label: '🟡 FAX enthält mehrere Nummern', field: 'fax', severity: 'warning' });
  }
  if (isPersonalizedEmail(entry.email) && isCarrierDomain(entry.email)) {
    issues.push({ cat: 3, label: '🟠 Personalisierte Email + Träger-Domain', field: 'email', severity: 'high' });
  } else if (isPersonalizedEmail(entry.email)) {
    issues.push({ cat: 4, label: '🟡 Personalisierte Email', field: 'email', severity: 'medium' });
  }

  return issues;
}

// ============================================================================
// UI RENDERING
// ============================================================================

function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[H');
}

function renderEntry(entry, issues, index, total) {
  clearScreen();

  const progress = `${index + 1}/${total}`;
  const pct = Math.round(((index + 1) / total) * 100);
  const barLen = 30;
  const filled = Math.round(barLen * (index + 1) / total);
  const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);

  console.log(`${c.bgBlue}${c.white}${c.bold} 📋 DATA REVIEW ${c.reset}  ${c.dim}${progress} (${pct}%)${c.reset}`);
  console.log(`${c.dim}${bar}${c.reset}\n`);

  // Issues
  for (const issue of issues) {
    console.log(`  ${issue.label}`);
  }
  console.log();

  // Entry details
  console.log(`${c.bold}${c.cyan}  ${entry.name}${c.reset}`);
  console.log(`${c.dim}  ${entry.street}, ${entry.zip} ${entry.city}${c.reset}`);
  console.log();

  // Contact fields with highlighting
  const phoneColor = issues.some(i => i.field === 'phone') ? c.red : c.green;
  const faxColor = issues.some(i => i.field === 'fax') ? c.red : c.green;
  const emailColor = issues.some(i => i.field === 'email') ? c.red : c.green;

  console.log(`  ${c.dim}Phone:${c.reset}   ${phoneColor}${entry.phone || '(leer)'}${c.reset}`);
  console.log(`  ${c.dim}Fax:${c.reset}     ${faxColor}${entry.fax || '(leer)'}${c.reset}`);
  console.log(`  ${c.dim}Email:${c.reset}   ${emailColor}${entry.email || '(leer)'}${c.reset}`);
  console.log(`  ${c.dim}Website:${c.reset} ${entry.website || '(leer)'}`);
  if (entry.contact_person) {
    console.log(`  ${c.dim}Kontakt:${c.reset} ${entry.contact_person}`);
  }
  console.log();

  // Actions
  console.log(`${c.dim}─────────────────────────────────────────────${c.reset}`);
  console.log(`  ${c.green}[Enter]${c.reset} ✅ Alles OK    ${c.yellow}[n]${c.reset} ❌ Feld nullen    ${c.magenta}[e]${c.reset} ✏️  Editieren`);
  console.log(`  ${c.blue}[o]${c.reset} 🔎 Google öffnen  ${c.dim}[s]${c.reset} ⏭  Überspringen   ${c.red}[q]${c.reset} 🛑 Beenden`);
  console.log(`${c.dim}─────────────────────────────────────────────${c.reset}`);
}

// ============================================================================
// INTERACTIVE PROMPTS
// ============================================================================

function createRL() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function askFieldToNull(rl) {
  console.log(`\n  Welches Feld auf ${c.red}null${c.reset} setzen?`);
  console.log(`  ${c.yellow}[p]${c.reset} Phone  ${c.yellow}[f]${c.reset} Fax  ${c.yellow}[e]${c.reset} Email  ${c.yellow}[a]${c.reset} Alle drei  ${c.yellow}[c]${c.reset} Abbrechen`);
  const answer = await ask(rl, `  > `);
  const map = {
    'p': ['phone'],
    'f': ['fax'],
    'e': ['email'],
    'a': ['phone', 'fax', 'email'],
    'c': []
  };
  return map[answer.toLowerCase()] || [];
}

async function askFieldToEdit(rl, entry) {
  console.log(`\n  Welches Feld editieren?`);
  console.log(`  ${c.magenta}[p]${c.reset} Phone: ${entry.phone || '(leer)'}`);
  console.log(`  ${c.magenta}[f]${c.reset} Fax: ${entry.fax || '(leer)'}`);
  console.log(`  ${c.magenta}[e]${c.reset} Email: ${entry.email || '(leer)'}`);
  console.log(`  ${c.magenta}[c]${c.reset} Abbrechen`);
  const fieldChoice = await ask(rl, `  > `);

  const fieldMap = { 'p': 'phone', 'f': 'fax', 'e': 'email' };
  const field = fieldMap[fieldChoice.toLowerCase()];
  if (!field) return null;

  const currentVal = entry[field] || '';
  const newVal = await ask(rl, `  Neuer Wert (aktuell: ${c.dim}${currentVal}${c.reset}): `);
  if (newVal.trim() === '') return null;

  return { field, value: newVal.trim() };
}

function openGoogleSearch(entry) {
  const query = encodeURIComponent(`"${entry.name}" ${entry.city || ''} Kontakt Email Fax`);
  const url = `https://www.google.com/search?q=${query}`;
  // macOS
  exec(`open "${url}"`);
  console.log(`  ${c.blue}🔎 Browser geöffnet...${c.reset}`);
}

// ============================================================================
// MAIN
// ============================================================================

async function run() {
  console.log(`${c.bgBlue}${c.white}${c.bold} 📋 Pflegeplatz-Portal: Data Review Tool ${c.reset}\n`);

  // Parse args
  const args = process.argv.slice(2);
  const showAll = args.includes('--all');
  let filterCat = null;
  let filterCity = null;
  const catIdx = args.indexOf('--category');
  if (catIdx !== -1) filterCat = parseInt(args[catIdx + 1]);
  const cityIdx = args.indexOf('--city');
  if (cityIdx !== -1) filterCity = args[cityIdx + 1];

  // Load DB
  let db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  console.log(`  ${c.dim}Geladen: ${db.length} Einträge${c.reset}`);

  // Find entries that need review
  let toReview = [];

  for (let i = 0; i < db.length; i++) {
    const entry = db[i];

    // Skip already reviewed (unless --all)
    if (entry.reviewed_at && !showAll) continue;

    // City filter
    if (filterCity && entry.city?.toLowerCase() !== filterCity.toLowerCase()) continue;

    const issues = categorizeEntry(entry);

    if (issues.length > 0) {
      // Category filter
      if (filterCat && !issues.some(iss => iss.cat === filterCat)) continue;
      toReview.push({ dbIndex: i, entry, issues });
    }
  }

  // Sort by severity (critical first)
  const severityOrder = { critical: 0, high: 1, warning: 2, medium: 3 };
  toReview.sort((a, b) => {
    const aSev = Math.min(...a.issues.map(i => severityOrder[i.severity] ?? 99));
    const bSev = Math.min(...b.issues.map(i => severityOrder[i.severity] ?? 99));
    return aSev - bSev;
  });

  // Stats
  const catCounts = {};
  for (const item of toReview) {
    for (const iss of item.issues) {
      catCounts[iss.label] = (catCounts[iss.label] || 0) + 1;
    }
  }

  console.log(`\n  ${c.bold}Zu prüfende Einträge: ${c.yellow}${toReview.length}${c.reset}`);
  console.log();
  for (const [label, count] of Object.entries(catCounts)) {
    console.log(`    ${label}: ${count}`);
  }
  console.log();

  if (toReview.length === 0) {
    console.log(`  ${c.green}✅ Keine verdächtigen Einträge gefunden! Alles geprüft.${c.reset}\n`);
    return;
  }

  const rl = createRL();
  await ask(rl, `  ${c.dim}[Enter um zu starten]${c.reset} `);

  // Stats tracking
  let stats = { approved: 0, nulled: 0, corrected: 0, skipped: 0 };

  // Review loop
  for (let idx = 0; idx < toReview.length; idx++) {
    const { dbIndex, entry, issues } = toReview[idx];

    renderEntry(entry, issues, idx, toReview.length);

    const action = await ask(rl, `\n  Aktion: `);

    switch (action.toLowerCase()) {
      case '': // Enter = approve
        entry.reviewed_at = new Date().toISOString();
        entry.review_action = 'approved';
        stats.approved++;
        break;

      case 'n': // Null fields
        const fieldsToNull = await askFieldToNull(rl);
        if (fieldsToNull.length > 0) {
          for (const field of fieldsToNull) {
            entry[field] = null;
          }
          entry.reviewed_at = new Date().toISOString();
          entry.review_action = 'nulled';
          stats.nulled++;
          console.log(`  ${c.red}⮕ ${fieldsToNull.join(', ')} auf null gesetzt${c.reset}`);
        }
        break;

      case 'e': // Edit
        const edit = await askFieldToEdit(rl, entry);
        if (edit) {
          entry[edit.field] = edit.value;
          entry.reviewed_at = new Date().toISOString();
          entry.review_action = 'corrected';
          stats.corrected++;
          console.log(`  ${c.magenta}⮕ ${edit.field} geändert zu: ${edit.value}${c.reset}`);
        }
        break;

      case 'o': // Open Google
        openGoogleSearch(entry);
        idx--; // Show same entry again after opening browser
        await ask(rl, `  ${c.dim}[Enter um weiterzumachen]${c.reset} `);
        continue;

      case 's': // Skip
        stats.skipped++;
        break;

      case 'q': // Quit
        console.log(`\n  ${c.yellow}⏹  Beende und speichere...${c.reset}`);
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
        printStats(stats);
        rl.close();
        return;

      default:
        console.log(`  ${c.dim}Unbekannte Eingabe, überspringe...${c.reset}`);
        stats.skipped++;
    }

    // Save after every action
    db[dbIndex] = entry;
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  }

  // Done!
  clearScreen();
  console.log(`\n${c.bgGreen}${c.white}${c.bold} 🎉 REVIEW ABGESCHLOSSEN! ${c.reset}\n`);
  printStats(stats);

  rl.close();
}

function printStats(stats) {
  console.log(`\n  ${c.bold}Statistik:${c.reset}`);
  console.log(`    ${c.green}✅ Akzeptiert:${c.reset}  ${stats.approved}`);
  console.log(`    ${c.red}❌ Genullt:${c.reset}     ${stats.nulled}`);
  console.log(`    ${c.magenta}✏️  Korrigiert:${c.reset} ${stats.corrected}`);
  console.log(`    ${c.dim}⏭  Übersprungen:${c.reset} ${stats.skipped}`);
  console.log();
}

run().catch(err => {
  console.error(`\n${c.red}FEHLER:${c.reset}`, err);
  process.exit(1);
});
