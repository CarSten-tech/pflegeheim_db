const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/database.json');
const IMPORT_PATH = '/Users/carstenrheidt/Downloads/einrichtungen.json';

const dbRaw = fs.readFileSync(DB_PATH, 'utf8');
const db = JSON.parse(dbRaw);

const importRaw = fs.readFileSync(IMPORT_PATH, 'utf8');
const importData = JSON.parse(importRaw);

// The _data array starts with a string "Ergebnisse " and then objects
const externeHeime = importData._data.filter(item => typeof item === 'object');

const normalize = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

let updatedCount = 0;

for (let heim of db) {
  if (!heim.email || heim.email === 'null' || String(heim.email).trim() === '') {
    
    // Find matching facility in the external data
    let match = externeHeime.find(ext => {
       const extCity = normalize(ext.ort);
       const heimCity = normalize(heim.city);
       const extZip = normalize(String(ext.plz));
       const heimZip = normalize(String(heim.zip));
       const extStreet = normalize(ext.strasse);
       const heimStreet = normalize(heim.street);
       const extName = normalize(ext.name);
       const heimName = normalize(heim.name);

       const isSameLoc = (extZip && heimZip && extZip === heimZip) || (extCity && heimCity && extCity === heimCity);
       const isSameStreet = (extStreet && heimStreet && extStreet === heimStreet && extStreet.length > 3);
       const isSameName = (extName && heimName && extName === heimName && extName.length > 5);

       // Very strong match
       if (isSameLoc && (isSameStreet || isSameName)) {
           return true;
       }
       return false;
    });

    if (match && match.email && match.email.trim() !== '') {
       heim.email = match.email;
       // Also mark as verified by the external source if we want, but the user said "nichts anderes abgleichen"
       // We ONLY update the email. No other fields.
       updatedCount++;
       console.log(`[+] Email gefunden für ${heim.name} (${heim.city}): ${heim.email}`);
    }
  }
}

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

console.log(`\n🎉 Fertig! Es wurden ${updatedCount} fehlende Email-Adressen aus der externen Liste importiert.`);
