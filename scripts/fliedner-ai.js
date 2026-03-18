require('dotenv').config();
const fs = require('fs');
const axios = require('axios');

const DB_PATH = '/Users/carstenrheidt/.gemini/antigravity/scratch/pflegeplatz-portal/data/database.json';
const SERPER_API_KEY = process.env.SERPER_API_KEY || '84a62940245c8b1ba57fd963373615590a80851d';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAXn92fK4yBDhJgBHNlteVa9g83-3Uiaq8';

async function extractText(url) {
    try {
        const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        let text = res.data.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '')
                           .replace(/<style[^>]*>([\S\s]*?)<\/style>/gmi, '')
                           .replace(/<\/?[^>]+(>|$)/g, ' ')
                           .replace(/\s+/g, ' ')
                           .substring(0, 20000);
        return text;
    } catch(e) {
        return "";
    }
}

async function run() {
    console.log("Starte Fliedner Deep-Crawl...");
    let db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    let targets = db.filter(h => h.email && h.email.toLowerCase() === 'info@fliedner.de');

    for (let h of targets) {
        console.log(`\n--- ${h.name} (${h.city}) ---`);
        let url = "";
        try {
            const res = await axios.post('https://google.serper.dev/search', {
                q: `site:fliedner.de "${h.name}" Kontakt`, 
                gl: 'de', hl: 'de', num: 3
            }, { headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' }});
            
            if (res.data.organic && res.data.organic.length > 0) {
                url = res.data.organic[0].link;
            }
        } catch (e) {
            console.error("Serper Error");
        }

        if (!url) {
            console.log("=> Keine URL gefunden!");
            continue;
        }
        
        console.log(`Scraping: ${url}`);
        const pageText = await extractText(url);
        
        if (!pageText) {
            console.log("=> Konnte Seite nicht laden.");
            continue;
        }

        const prompt = `Du suchst nach der spezifischen, lokalen E-Mail-Adresse für das Pflegeheim "${h.name}" in ${h.city}.
        Die gesuchte E-Mail-Adresse lautet NICHT info@fliedner.de! Sie ist standortspezifisch, z.B. pflegeampark@fliedner.de, info.hageboelling@fliedner.de, oder vorname.nachname@fliedner.de für die Einrichtungsleitung.
        
        Hier ist der extrahierte Text der Webseite:
        ${pageText}
        
        Aufgabe: Finde exakt DIESE einrichtungsspezifische E-Mail-Adresse für den primären Kontakt oder die Einrichtungsleitung. 
        Wenn du nur info@fliedner.de findest, antworte "UNSICHER".
        Antworte NUR mit der E-Mail-Adresse (z.B. "info.hageboelling@fliedner.de"). Keine weiteren Worte.`;

        let aiResult = "Fehler";
        try {
            const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.1 }
            }, { headers: { 'Content-Type': 'application/json' }});
            aiResult = res.data.candidates[0].content.parts[0].text.trim();
            console.log(`=> GEFUNDEN: ${aiResult}`);
            
            if (aiResult && aiResult.includes('@') && aiResult !== 'UNSICHER' && aiResult !== 'info@fliedner.de') {
                h.email = aiResult;
                h.aiFixed = true;
            }
        } catch (e) {
             console.log("=> Gemini Error", e.message);
        }

        await new Promise(r => setTimeout(r, 1000));
    }
    
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    console.log(`\nDatenbank-Update abgeschlossen!`);
}

run().catch(console.error);
