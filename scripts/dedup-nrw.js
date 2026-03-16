const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/database.json');

let db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const initialCount = db.length;

// Helper to normalize strings (remove HTML entities, quotes, double spaces, convert to lowercase)
function normalizeName(str) {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&bdquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/,,/g, '"')
    .replace(/''/g, '"')
    .replace(/"/g, '') // Remove all quotes for comparison
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ') // Normalize spaces
    .toLowerCase()
    .trim();
}

console.log(`Starting deduplication. Initial count: ${initialCount} facilities.`);

// Map to group facilities by normalized name + city
const grouped = new Map();

db.forEach(facility => {
  const normName = normalizeName(facility.name);
  const normCity = normalizeName(facility.city);
  // Also remove common prefixes like "Altenheim" or "Senioren-Residenz" for an even stricter match if needed, but for now exact normalized match is safer.
  const key = `${normName}|${normCity}`;

  if (!grouped.has(key)) {
    grouped.set(key, [facility]);
  } else {
    grouped.get(key).push(facility);
  }
});

const dedupedDb = [];
let mergedCount = 0;

for (const [key, items] of grouped.entries()) {
  if (items.length === 1) {
    // No duplicate, just clean the name slightly for display
    let f = items[0];
    f.name = f.name.replace(/&quot;/g, '"').replace(/&bdquo;/g, '„').replace(/&rdquo;/g, '“').replace(/,,/g, '„');
    dedupedDb.push(f);
  } else {
    mergedCount += (items.length - 1);
    
    // We have duplicates. We need to merge them thoughtfully.
    // Usually, the FIRST one is our original manually edited one, the LAST one is from the NRW API.
    // Or vice versa depending on array order. 
    // Let's take the first one as base, and enrich it.
    
    // Sort items so the one with a contact person or non-empty fax is preferred as base
    items.sort((a, b) => {
       const score = (obj) => (obj.contact_person ? 2 : 0) + (obj.fax && obj.fax !== '—' && obj.fax.trim() !== '' ? 1 : 0);
       return score(b) - score(a); 
    });

    const base = items[0];
    
    for (let i = 1; i < items.length; i++) {
       const other = items[i];
       // Enrich missing base data from 'other'
       if (!base.street) base.street = other.street;
       if (!base.phone || base.phone === '—') base.phone = other.phone;
       if (!base.fax || base.fax === '—') base.fax = other.fax;
       if (!base.email || base.email.includes('?body=')) base.email = other.email;
       if (!base.website || base.website === '—') base.website = other.website;
       if (!base.contact_person) base.contact_person = other.contact_person;
       
       // OR together the features
       base.has_kurzzeitpflege = base.has_kurzzeitpflege || other.has_kurzzeitpflege;
       base.has_vollstationaer = base.has_vollstationaer || other.has_vollstationaer;
    }
    
    // Clean name
    base.name = base.name.replace(/&quot;/g, '"').replace(/&bdquo;/g, '„').replace(/&rdquo;/g, '“').replace(/,,/g, '„');
    
    dedupedDb.push(base);
  }
}

console.log(`Merged ${mergedCount} duplicates.`);
console.log(`Final DB size: ${dedupedDb.length} facilities.`);

fs.writeFileSync(DB_PATH, JSON.stringify(dedupedDb, null, 2));
console.log('Deduplication complete.');
