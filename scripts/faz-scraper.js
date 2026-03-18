const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const DB_PATH = path.join(__dirname, '../data/database.json');
const FAZ_URLS_PATH = '/Users/carstenrheidt/Downloads/faz_heime.json';
const PROGRESS_PATH = path.join(__dirname, '../data/faz_progress.json');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

async function scrapeFaz() {
  console.log('Loading database...');
  let db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const fazDataRaw = JSON.parse(fs.readFileSync(FAZ_URLS_PATH, 'utf8'));

  // Create a Set of all known ZIP codes in our DB to filter non-NRW URLs
  const dbZips = new Set(db.map(h => String(h.zip || '').trim()).filter(z => z.length === 5));

  // Extract URLs
  let allUrls = fazDataRaw.map(item => item.FAZ_Detail_Link).filter(Boolean);
  
  // Filter URLs: Only keep ones whose ZIP is in our database
  let urls = allUrls.filter(url => {
    const slugMatch = url.match(/-([0-9]{5})-/i);
    if (!slugMatch) return true; // Keep if we can't parse the ZIP to be safe
    return dbZips.has(slugMatch[1]);
  });
  
  console.log(`Filtered out ${allUrls.length - urls.length} non-NRW URLs.`);
  console.log(`Found ${urls.length} relevant NRW/DB URLs to check.`);

  let progress = { processed: [], lastIndex: 0 };
  if (fs.existsSync(PROGRESS_PATH)) {
    progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
    console.log(`Resuming from index ${progress.lastIndex}...`);
  }

  let updatedCount = 0;
  
  // Create a map/index of our DB for faster lookups
  // Since URL contains zip and city, we can try to extract those, but it's not strictly formatted.
  // Instead, we just fetch the page, parse Name, Zip, City, Phone, Fax, Email.
  
  for (let i = progress.lastIndex; i < urls.length; i++) {
    const url = urls[i];
    
    // We only want to scrape if we actually have missing data in our DB, but we don't know the facility yet.
    // Let's scrape it first.
    let html;
    try {
      const response = await axios.get(url, {
         timeout: 10000,
         headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
         }
      });
      html = response.data;
    } catch (e) {
      console.log(`[Error] Failed to fetch ${url}: ${e.message}`);
      // Wait before next retry
      await delay(2000);
      continue;
    }
    
    const $ = cheerio.load(html);
    
    // Attempt to extract data. FAZ 50plus usually has a clear structure for address/contact.
    // Let's extract the entire text and use Regex for a robust fallback.
    const pageText = $('body').text().replace(/\s+/g, ' ');
    
    // Specific element scraping (adjust selectors based on actual FAZ structure if needed):
    // Often there's an address block
    const name = $('h1').first().text().trim() || $('title').text().split('|')[0].trim();
    
    // For reliable matching, we can use the URL slug which contains zip and city
    // Example: .../altenwohnheim-st-aegidius-drostenweg-15-33378-rheda-wiedenbrueck
    const slugMatch = url.match(/-([0-9]{5})-([a-z0-9-]+)$/i);
    let extractedZip = slugMatch ? slugMatch[1] : '';
    let extractedCity = slugMatch ? slugMatch[2].replace(/-/g, ' ') : '';
    
    // Extract Email via regex
    const emailMatch = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : null;
    
    // Extract Phone via regex (basic German format)
    // Matches e.g. 0211 123456, 0211-123456, +49 211 123456
    const phoneMatch = pageText.match(/(?:Telefon|Tel\.?):?\s*(\+?[0-9\s/-/()]{6,20})/i);
    const phone = phoneMatch ? phoneMatch[1].trim() : null;
    
    // Extract Fax
    const faxMatch = pageText.match(/(?:Telefax|Fax\.?):?\s*(\+?[0-9\s/-/()]{6,20})/i);
    const fax = faxMatch ? faxMatch[1].trim() : null;

    if (email || phone || fax) {
       console.log(`[Extracted] -> Email: ${email}, Phone: ${phone}, Fax: ${fax} (name: ${name}, zip: ${extractedZip}, city: ${extractedCity})`);
       
       // Try to find matching facility in DB
       let dbMatch = db.find(heim => {
          if (!heim.zip) return false;
          if (extractedZip && heim.zip === extractedZip) return true;
          return false;
       });
       
       // If matched by ZIP, let's verify Name or City to avoid false positives in same ZIP
       if (dbMatch) {
          const dbNameNorm = normalize(dbMatch.name);
          const extNameNorm = normalize(name);
          
          const isNameSimilar = dbNameNorm.length > 5 && extNameNorm.includes(dbNameNorm.substring(0, 5));
          
          if (isNameSimilar) {
             let changed = false;
             
             if (email && (!dbMatch.email || dbMatch.email === 'null')) {
                dbMatch.email = email;
                changed = true;
             }
             if (phone && (!dbMatch.phone || dbMatch.phone === 'null')) {
                dbMatch.phone = phone;
                changed = true;
             }
             if (fax && (!dbMatch.fax || dbMatch.fax === 'null')) {
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
    
    progress.processed.push(url);
    progress.lastIndex = i + 1;
    
    // Save periodically (every 50 records)
    if (i % 50 === 0) {
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
      fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2), 'utf8');
      console.log(`--- Saved progress at index ${i} ---`);
    }
    
    // Delay to avoid IP bans
    await delay(1200);
  }
  
  // Final save
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2), 'utf8');
  
  console.log(`\nDone! Successfully checked ${urls.length} URLs. Updated ${updatedCount} facilities.`);
}

scrapeFaz().catch(console.error);
