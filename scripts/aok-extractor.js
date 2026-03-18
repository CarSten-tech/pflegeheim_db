const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DB_PATH = path.join(__dirname, '../data/database.json');

const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

async function scrapeAok() {
  console.log('Loading database...');
  let db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

  const dbZips = new Set(db.map(h => String(h.zip || '').trim()).filter(z => z.length === 5));

  const limit = 500;
  let totalCount = 11000; // Will be updated dynamically after first request
  let updatedCount = 0;

  for (let from = 0; from < totalCount; from += limit) {
     const url = `https://navigatoren-api.aok.de/api/v1/carehomes/?sorting=alphabetical&care_focus=000&care_level=2&carehomes_care_typ=001&eigenanteil=no_limit&from=${from}&size=${limit}&initial_search=true`;
     console.log(`Fetching from ${from} to ${from + limit} (Current Total: ${totalCount})...`);
     
     let response;
     try {
         response = await axios.get(url, {
             timeout: 10000,
             headers: { 'User-Agent': 'Mozilla/5.0' }
         });
     } catch (err) {
         console.error(`Failed at offset ${from}: ${err.message}`);
         await new Promise(r => setTimeout(r, 2000));
         continue;
     }

     const data = response.data;
     if (data.count) totalCount = data.count; // Exact total from API

     if (data.results && data.results.length > 0) {
        for (let aok of data.results) {
            if (!aok.address || !aok.address.zip) continue;

            const zip = String(aok.address.zip).trim();
            // Optional: Skip completely unknown Zips outside NRW
            if (!dbZips.has(zip)) continue;

            let dbMatch = db.find(heim => {
                if (normalize(heim.zip) !== normalize(zip)) return false;
                
                // Strong Match: Street match
                const dbStreetNorm = normalize(heim.street);
                const extStreetNorm = normalize(aok.address.street);
                if (dbStreetNorm.length > 5 && dbStreetNorm === extStreetNorm) return true;

                // Good Match: Name Similarity
                const dbNameNorm = normalize(heim.name);
                const extNameNorm = normalize(aok.locationName);
                if (dbNameNorm.length > 5 && extNameNorm.includes(dbNameNorm.substring(0, 5))) return true;
                if (extNameNorm.length > 5 && dbNameNorm.includes(extNameNorm.substring(0, 5))) return true;

                return false;
            });

            if (dbMatch) {
                let changed = false;
                const email = (aok.email || '').trim();
                const phone = (aok.phone || '').trim();
                const fax = (aok.fax || '').trim();

                const isNull = val => !val || val === 'null' || val === '';

                if (email && !isNull(email) && isNull(dbMatch.email)) {
                   dbMatch.email = email;
                   changed = true;
                }
                if (phone && !isNull(phone) && isNull(dbMatch.phone)) {
                   dbMatch.phone = phone;
                   changed = true;
                }
                if (fax && !isNull(fax) && isNull(dbMatch.fax)) {
                   dbMatch.fax = fax;
                   changed = true;
                }

                if (changed) {
                   updatedCount++;
                   console.log(`[+] Updated ${dbMatch.name} (${dbMatch.zip}): Email=${email}, Phone=${phone}, Fax=${fax}`);
                }
            }
        }
     }
     
     // Be polite to the API
     await new Promise(r => setTimeout(r, 1000));
  }

  // Final save
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  console.log(`\n🎉 Done! Successfully checked ${totalCount} AOK entries. Updated ${updatedCount} facilities with missing values.`);
}

scrapeAok().catch(console.error);
