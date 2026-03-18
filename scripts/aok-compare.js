const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DB_PATH = path.join(__dirname, '../data/database.json');
const REPORT_PATH = '/Users/carstenrheidt/.gemini/antigravity/brain/65a79ddb-8860-4d79-939a-ce1ab7ad7263/aok_email_comparison.md';
const CONFLICTS_PATH = path.join(__dirname, '../data/aok-email-conflicts.json');

const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

async function compareAokEmails() {
  let db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const dbZips = new Set(db.map(h => String(h.zip || '').trim()).filter(z => z.length === 5));

  const limit = 500;
  let totalCount = 11000;
  
  let differences = [];

  for (let from = 0; from < totalCount; from += limit) {
     const url = `https://navigatoren-api.aok.de/api/v1/carehomes/?sorting=alphabetical&care_focus=000&care_level=2&carehomes_care_typ=001&eigenanteil=no_limit&from=${from}&size=${limit}&initial_search=true`;
     
     let response;
     try {
         response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
     } catch (err) {
         await new Promise(r => setTimeout(r, 2000));
         continue;
     }

     const data = response.data;
     if (data.count) totalCount = data.count;

     if (data.results && data.results.length > 0) {
        for (let aok of data.results) {
            if (!aok.address || !aok.address.zip) continue;
            const zip = String(aok.address.zip).trim();
            if (!dbZips.has(zip)) continue;

            let dbMatch = db.find(heim => {
                if (normalize(heim.zip) !== normalize(zip)) return false;
                
                const dbStreetNorm = normalize(heim.street);
                const extStreetNorm = normalize(aok.address.street);
                if (dbStreetNorm.length > 5 && dbStreetNorm === extStreetNorm) return true;

                const dbNameNorm = normalize(heim.name);
                const extNameNorm = normalize(aok.locationName);
                if (dbNameNorm.length > 5 && extNameNorm.includes(dbNameNorm.substring(0, 5))) return true;
                if (extNameNorm.length > 5 && dbNameNorm.includes(extNameNorm.substring(0, 5))) return true;

                return false;
            });

            if (dbMatch) {
                const aokEmail = (aok.email || '').trim().toLowerCase();
                const ourEmail = (dbMatch.email || '').trim().toLowerCase();

                const isNull = val => !val || val === 'null' || val === '';

                if (!isNull(aokEmail) && !isNull(ourEmail) && aokEmail !== ourEmail) {
                     differences.push({
                         name: dbMatch.name,
                         zip: dbMatch.zip,
                         city: dbMatch.city,
                         ourEmail: dbMatch.email,
                         aokEmail: aok.email
                     });
                }
            }
        }
     }
  }

  // Generate Markdown Report
  let md = `# AOK vs. Interne Datenbank E-Mail Gegenüberstellung\n\n`;
  md += `Es wurden **${differences.length}** Heime gefunden, bei denen unsere interne Datenbank eine E-Mail-Adresse hat, die AOK jedoch eine davon abweichende.\n\n`;
  
  if (differences.length > 0) {
      md += `| Einrichtung | PLZ Ort | Unsere E-Mail | AOK E-Mail |\n`;
      md += `|---|---|---|---|\n`;
      
      for (const diff of differences) {
          md += `| ${diff.name} | ${diff.zip} ${diff.city} | \`${diff.ourEmail}\` | \`${diff.aokEmail}\` |\n`;
      }
  }

  fs.writeFileSync(REPORT_PATH, md, 'utf8');
  fs.writeFileSync(CONFLICTS_PATH, JSON.stringify(differences, null, 2), 'utf8');
  console.log(`\n🎉 Done! Found ${differences.length} differences.`);
}

compareAokEmails().catch(console.error);
