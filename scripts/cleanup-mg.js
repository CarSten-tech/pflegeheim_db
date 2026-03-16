const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/database.json');
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

// Filter out Mönchengladbach to process
const mg = db.filter(f => f.city.includes("Mönchengladbach"));
const nonMg = db.filter(f => !f.city.includes("Mönchengladbach"));

console.log(`Initial Mönchengladbach DB Size: ${mg.length}`);

// Normalization function for grouping
function getGroupId(f) {
  if (!f.street) return f.name.toLowerCase();
  
  // Custom grouping for known edge cases
  const nameBase = f.name.replace(/Kurzzeitpflege|Haus \d+|Vollstationär|Stationäre Pflege|Wohnbereich|Etage|\(Junge Pflege\)|\"/gi, "").replace(/[^a-zA-Zäöüß]/g, "").toLowerCase();
  
  return f.street.trim().toLowerCase();
}

const grouped = new Map();
mg.forEach(f => {
  const gId = getGroupId(f);
  if (!grouped.has(gId)) grouped.set(gId, []);
  grouped.get(gId).push(f);
});

const finalMg = [];
let mergedFacilities = 0;

for (const [key, items] of grouped.entries()) {
  if (items.length === 1) {
    items[0].name = items[0].name.replace(/&quot;/g, '"').replace(/&ouml;/g, 'ö').replace(/&auml;/g, 'ä').replace(/&uuml;/g, 'ü').replace(/&szlig;/g, 'ß');
    finalMg.push(items[0]);
  } else {
    mergedFacilities += (items.length - 1);
    
    // Sort to keep the one with verified data / real contact person / actual fax as base
    items.sort((a, b) => {
       let scoreA = (a.fax_verified_at ? 10 : 0) + (a.contact_person ? 2 : 0) + (a.fax && a.fax !== '—' ? 1 : 0);
       let scoreB = (b.fax_verified_at ? 10 : 0) + (b.contact_person ? 2 : 0) + (b.fax && b.fax !== '—' ? 1 : 0);
       return scoreB - scoreA;
    });

    const base = items[0];
    
    for (let i = 1; i < items.length; i++) {
       const other = items[i];
       if (!base.phone || base.phone === '—') base.phone = other.phone;
       if (!base.fax || base.fax === '—') base.fax = other.fax;
       if (!base.email || base.email.includes('?body=')) base.email = other.email;
       if (!base.contact_person) base.contact_person = other.contact_person;
       base.has_kurzzeitpflege = base.has_kurzzeitpflege || other.has_kurzzeitpflege;
       base.has_vollstationaer = base.has_vollstationaer || other.has_vollstationaer;
    }
    
    // Clean name text
    base.name = base.name.replace(/&quot;/g, '"').replace(/&ouml;/g, 'ö').replace(/&auml;/g, 'ä').replace(/&uuml;/g, 'ü').replace(/&szlig;/g, 'ß')
                         .replace(/ - Kurzzeitpflege -|- Kurzzeitpflege| Kurzzeitpflege| Stationäre Pflege|- Stationäre Pflege| Vollstationäre Pflege| Vollstationär|\/|gGmbH|eV|e\.V\./g, "").trim();
    
    if (base.name.endsWith("-")) base.name = base.name.slice(0, -1).trim();                     
    if (base.name.toLowerCase().includes("haus elisabeth")) base.name = "Haus Elisabeth Pflegezentrum";

    finalMg.push(base);
    console.log(`Merged at ${key}: -> Kept as: ${base.name}`);
  }
}

// Combine back with nonMönchengladbach DB
const finalDb = [...nonMg, ...finalMg];

fs.writeFileSync(DB_PATH, JSON.stringify(finalDb, null, 2));
console.log(`\nCleanup Complete! Merged ${mergedFacilities} duplicates in Mönchengladbach.`);
console.log(`Mönchengladbach went from ${mg.length} to ${finalMg.length} facilities.`);
