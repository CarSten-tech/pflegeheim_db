const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '../data/database.json');
const API_URL = 'https://pfadwtg.mags.nrw/api/heimfinder/v2/einrichtungen';

// Fetch the existing database
let existingDb = [];
if (fs.existsSync(DB_PATH)) {
  existingDb = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

console.log(`Starting import. Current DB size: ${existingDb.length} facilities.`);

// Fetch from Heimfinder
fetch(API_URL)
  .then(res => res.json())
  .then(json => {
    // The API returns an array in `_data` where the first element is usually a string ("Ergebnisse ")
    const apiData = json._data.filter(item => item && typeof item === 'object' && item.name);
    
    console.log(`Fetched ${apiData.length} valid facilities from Heimfinder NRW.`);

    let addedCount = 0;
    let updatedCount = 0;

    apiData.forEach(apiItem => {
      // Find existing facility by matching name and city/zip
      const existing = existingDb.find(f => 
        f.name.toLowerCase().trim() === apiItem.name.toLowerCase().trim() && 
        f.city.toLowerCase().trim() === apiItem.ort.toLowerCase().trim()
      );

      if (existing) {
        // Smart Merge: Update address details, but PRESERVE user-edited contact info if available
        existing.street = apiItem.strasse || existing.street;
        existing.zip = apiItem.plz || existing.zip;
        
        // Only override our local fax/email if we don't have one, or if ours is obviously broken
        if (!existing.fax || existing.fax.trim() === '') existing.fax = apiItem.fax || '';
        if (!existing.email || existing.email.includes('?body=')) existing.email = apiItem.email || '';
        
        // Remove old free-spots indicators if they exist
        delete existing.vacant_kurzzeit_spots;
        delete existing.vacant_vollstationaer_spots;
        delete existing.last_vacancy_update;
        
        updatedCount++;
      } else {
        // Add new facility
        const newFacility = {
          name: apiItem.name,
          street: apiItem.strasse || '',
          zip: apiItem.plz || '',
          city: apiItem.ort || '',
          phone: apiItem.telefon || '',
          fax: apiItem.fax || '',
          email: apiItem.email || '',
          website: apiItem.web || '',
          has_kurzzeitpflege: true, // We assume true, but this pivot no longer cares about this filter
          has_vollstationaer: true,
          edit_token: crypto.randomUUID(),
          contact_person: apiItem.ansprechpartner || '',
          fax_verified_at: null, // New field for verification status
          email_verified_at: null // New field for verification status
        };
        existingDb.push(newFacility);
        addedCount++;
      }
    });

    // Write back to DB
    fs.writeFileSync(DB_PATH, JSON.stringify(existingDb, null, 2));
    console.log(`\nImport complete!`);
    console.log(`Added: ${addedCount}`);
    console.log(`Updated existing: ${updatedCount}`);
    console.log(`Total DB size is now: ${existingDb.length}`);

  })
  .catch(err => {
    console.error('Error during import:', err);
    process.exit(1);
  });
