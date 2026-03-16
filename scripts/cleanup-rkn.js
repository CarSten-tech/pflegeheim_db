const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/database.json');
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

console.log(`Initial DB Size: ${db.length}`);

// 1. Remove Fliedner Haus
const withoutFliedner = db.filter(f => !f.name.includes("Fliedner Haus"));
console.log(`Removed ${db.length - withoutFliedner.length} "Fliedner Haus" entries.`);

// 2. Exact Mapping to force-merge identical facilities
const nameMap = {
  "Augustinushaus Dormagen": "Augustinushaus",
  "Caritashaus St. Josef Dormagen": "Caritashaus St. Josef",
  "Malteserstift St. Katharina / (Junge Pflege)": "Malteserstift St. Katharina",
  "Alloheim Senioren-Residenz „Bernardus“": "Seniorenzentrum \"Bernardus\"",
  "Alloheim Senioren-Residenz &bdquo;Bernardus&rdquo;": "Seniorenzentrum \"Bernardus\"",
  "Seniorenzentrum Albert Schweitzer Haus": "Seniorenzentrum Albert-Schweitzer-Haus gGmbH",
  "PRO TALIS Betreuung und Service in Grevenbr. GmbH": "PRO TALIS Betreuung und Service in Grevenbroich GmbH",
  "Seniorenzentrum / Haus Maria Frieden": "Seniorenzentrum Haus Maria Frieden",
  "Senioren-Park carpe diem J&uuml;chen_": "Senioren-Park carpe diem Jüchen",
  "Johanniter-Haus Kaarst": "Johanniter-Stift Kaarst",
  "Vinzenz-Haus - Wohn- und Pflegehaus": "Alten- und Pflegeheim Vinzenz-Haus",
  "Wohnanlage Am Dreeskamp VS": "Wohnanlage Am Dreeskamp",
  "Rheinland KIlinikum Neuss gGmbH Seniorenhaus Korschenbroich ": "Kreisseniorenheim",
  "AZURIT Seniorenzentrum Korschenbroich": "Seniorenzentrum Korschenbroich",
  "Hildegundis von Meer": "Alten- und Pflegeheim Hildegundis von Meer",
  "Meridias-Rheinstadtpflegehaus Meerbusch Haus I / Vollstation&auml;r": "Meridias Meerbusch",
  "Meridias-Rheinstadtpflegehaus Meerbusch GmbH | Haus 2": "Meridias Meerbusch",
  "Malteserstift St. Stephanus / - NeuroCare -": "Malteserstift St. Stephanus",
  "Johanniter-Stift Meerbusch / Meerbusch-B&uuml;derich": "Johanniter-Stift Meerbusch-Büderich",
  "Alloheim Senioren-Residenz \"Neuss\"": "Alloheim Senioren-Residenz \"Neuss\"",
  "Alloheim Senioren-Residenz &quot;Neuss&quot;": "Alloheim Senioren-Residenz \"Neuss\"",
  "Haus Immaculata": "Altenheim Kloster Immaculata",
  "Pflegeheim Herz Jesu": "Altenpflegeheim Herz Jesu",
  "gerontopsychiatrisches Seniorenpflegeheim Haus St. Georg": "Haus St. Georg",
  "Pflegeheim St. Georg Kurzzeitpflege": "Haus St. Georg",
  "Seniorenheim St. Hubertusstift gGmbH": "Seniorenheim St. Hubertusstift",
  "Seniorenpflegeheim / Johannes von Gott": "Seniorenpflegeheim Johannes-von-Gott",
  "Haus Nordpark - Wohn- und Pflegehaus": "Haus Nordpark",
  "Heinrich-Gr&uuml;ber-Haus": "Heinrich-Grüber-Haus"
};

function getGroupName(f) {
  let name = f.name.replace(/&quot;/g, '"')
                   .replace(/&bdquo;/g, '„')
                   .replace(/&rdquo;/g, '“')
                   .replace(/&auml;/g, 'ä')
                   .replace(/&uuml;/g, 'ü')
                   .replace(/,,/g, '"')
                   .replace(/''/g, '"')
                   .trim();
                   
  if (nameMap[name]) name = nameMap[name];
  if (nameMap[f.name]) name = nameMap[f.name];
  
  return `${name}|${f.city}`;
}

const grouped = new Map();
withoutFliedner.forEach(f => {
  const gName = getGroupName(f);
  if (!grouped.has(gName)) grouped.set(gName, []);
  grouped.get(gName).push(f);
});

const finalDb = [];
let mergedFacilities = 0;

for (const [key, items] of grouped.entries()) {
  if (items.length === 1) {
    items[0].name = items[0].name.replace(/&quot;/g, '"').replace(/&bdquo;/g, '„').replace(/&rdquo;/g, '“').replace(/&auml;/g, 'ä').replace(/&uuml;/g, 'ü').replace(/,,/g, '"');
    finalDb.push(items[0]);
  } else {
    mergedFacilities += (items.length - 1);
    
    items.sort((a, b) => {
       let scoreA = (a.fax_verified_at ? 10 : 0) + (a.contact_person ? 2 : 0) + (a.fax && a.fax !== '—' ? 1 : 0);
       let scoreB = (b.fax_verified_at ? 10 : 0) + (b.contact_person ? 2 : 0) + (b.fax && b.fax !== '—' ? 1 : 0);
       return scoreB - scoreA;
    });

    const base = items[0];
    
    for (let i = 1; i < items.length; i++) {
       const other = items[i];
       if (!base.street) base.street = other.street;
       if (!base.phone || base.phone === '—') base.phone = other.phone;
       if (!base.fax || base.fax === '—') base.fax = other.fax;
       if (!base.email || base.email.includes('?body=')) base.email = other.email;
       if (!base.contact_person) base.contact_person = other.contact_person;
       base.has_kurzzeitpflege = base.has_kurzzeitpflege || other.has_kurzzeitpflege;
       base.has_vollstationaer = base.has_vollstationaer || other.has_vollstationaer;
    }
    
    base.name = base.name.replace(/&quot;/g, '"').replace(/&bdquo;/g, '„').replace(/&rdquo;/g, '“').replace(/&auml;/g, 'ä').replace(/&uuml;/g, 'ü').replace(/,,/g, '"');
    if (nameMap[base.name]) base.name = nameMap[base.name]; 
    if (nameMap[items[0].name]) base.name = nameMap[items[0].name]; // Backup assign
    
    finalDb.push(base);
    console.log(`Merged: ${key.split('|')[0]}`);
  }
}

fs.writeFileSync(DB_PATH, JSON.stringify(finalDb, null, 2));
console.log(`\nCleanup Complete! Merged ${mergedFacilities} duplicates.`);
console.log(`Final DB Size: ${finalDb.length} facilities.`);
