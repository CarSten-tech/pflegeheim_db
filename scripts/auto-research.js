const fs = require('fs');
const path = require('path');
const axios = require('axios');
// Optional: Du könntest das offizielle @google/generative-ai SDK installieren,
// aber wir nutzen hier plain REST Requests für null Abhängigkeiten.

// ============================================================================
// KONFIGURATION (VOM USER AUSZUFÜLLEN!)
// ============================================================================
const SERPER_API_KEY = process.env.SERPER_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Welche Regionen wollen wir als nächstes parsen? (Lass leer für "Alle ungeprüften")
// Filter Logic: Wenn das json flag `ai_checked` nicht existiert und auch keine manuellen Flags.
const DB_PATH = path.join(__dirname, '../data/database.json');
const BATCH_SIZE = 5; // Anzahl auf einmal
const DELAY_MS = 1000; // Pause zwischen Batches (1 Sekunde, verringert für Paid Tier)

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

const delay = ms => new Promise(res => setTimeout(res, ms));

async function googleSearch(query) {
    try {
        const response = await axios.post('https://google.serper.dev/search', {
            q: query,
            gl: 'de',
            hl: 'de',
            num: 5 // Top 5
        }, {
            headers: {
                'X-API-KEY': SERPER_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        let snippets = [];
        if (response.data.organic) {
             snippets = response.data.organic.map(res => `Titel: ${res.title}\nText: ${res.snippet}\nLink: ${res.link}`).join('\n\n');
        }
        if (response.data.answerBox) {
            snippets = `[WICHTIGE INFO BOX]\n${response.data.answerBox.snippet || response.data.answerBox.answer}\n\n` + snippets;
        }
        return snippets;
    } catch (err) {
        console.error(`  [!] Serper API Fehler:`, err.response?.data || err.message);
        return "";
    }
}

async function extractInfoWithGemini(heimName, snippets) {
    if (!snippets) return { fax: null, phone: null, email: null };

const prompt = `
Du bist ein hochpräziser Datenanalyst für Pflegedaten. 
Aufgabe: Extrahiere aus den Google-Suchergebnissen für das Pflegeheim "${heimName}" die FAXNUMMER und die EMAIL-ADRESSE.

STRANGSTE REGELN ZUR FAXNUMMER:
1. Verwechsle Fax nicht mit Telefon! Eine Telefonnummer steht meistens hinter "Tel.", "Telefon" oder einem Telefonsymbol (📞).
2. Eine Faxnummer steht explizit hinter "Fax", "Telefax" oder einem Faxsymbol (📠, 🖨️).
3. ABSOLUTES VERBOT ZU RATEN: Wenn in den Suchergebnissen nicht ausdrücklich das Wort "Fax" (oder ein eindeutiges Synonym davon) vor einer Nummer steht, gib ZWINGEND "null" aus.
4. Hänge niemals fiktive Durchwahlen (wie -199 oder -300) an eine gefundene Telefonnummer an. Entweder die Nummer steht genauso im Text als Fax, oder du gibst "null" aus.

WEITERE REGELN:
5. Formatiere gefundene Nummern sauber (z.B. 01234 56789).
6. Achte bei der E-Mail Adresse darauf, dass es eine valide Heim-Adresse ist (oft info@... oder kontakt@...).
7. ANTWORTE NUR MIT EINEM REINEN JSON OBJEKT! Keine Markdown Blocks, kein Text davor oder danach. Exakt dieses Format:
{
  "fax": "nummer oder null",
  "phone": "nummer oder null",
  "email": "email oder null"
}

SUCHERGEBNISSE:
${snippets}
`;

    try {
        const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.0,
                topK: 1,
                topP: 1,
                responseMimeType: 'application/json'
            }
        }, { headers: { 'Content-Type': 'application/json' }});

        let rawAnswer = response.data.candidates[0].content.parts[0].text;
        rawAnswer = rawAnswer.replace(/```json/g, '').replace(/```/g, '').trim();
        
        return JSON.parse(rawAnswer);
    } catch (err) {
        console.error(`  [!] Gemini API Fehler:`, err.response?.data || err.message);
        return { fax: null, phone: null, email: null, pdl: null };
    }
}

// ============================================================================
// MAIN LOOP
// ============================================================================
async function run() {
    console.log("=========================================");
    console.log("🤖 Pflegeplatz-Portal: AI Auto-Research");
    console.log("=========================================");

    if (SERPER_API_KEY.includes('DEIN_SERPER') || GEMINI_API_KEY.includes('DEIN_GEMINI')) {
        console.error("❌ FEHLER: Du musst erst die API Keys oben im Skript (oder als ENV) eintragen!");
        process.exit(1);
    }

    let db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    
    // Finde alle Heime, die noch von keinem regionalen Lauf _checked wurden UND noch nicht ai_checked sind
    let unchecked = db.filter(f => 
        !f.checked && 
        !f.fax_verified_at && 
        !f.duesseldorf_checked && 
        !f.koeln_bonn_checked && 
        !f.ruhrgebiet_west_checked && 
        !f.ruhrgebiet_ost_checked && 
        !f.muenster_checked && 
        !f.ai_checked // NEUES FLAG!
    );

    console.log(`> Gefunden: ${unchecked.length} Heime, die automatisiert geprüft werden sollen.`);

    if (unchecked.length === 0) return;

    // Wir bearbeiten in Batches
    for (let i = 0; i < unchecked.length; i += BATCH_SIZE) {
        const batch = unchecked.slice(i, i + BATCH_SIZE);
        console.log(`\n============== BATCH ${i/BATCH_SIZE + 1} ==============`);
        
        // Parallele Ausführung für den aktuellen Batch
        const promises = batch.map(async (heim) => {
            console.log(`[🔎 Suche] ${heim.name} (${heim.city || 'NRW'})...`);
            
            const query = `"${heim.name}" ${heim.city || ''} Pflegeheim Fax Email`;
            const snippets = await googleSearch(query);
            
            const aiData = await extractInfoWithGemini(heim.name, snippets);
            
            // Gefundene Daten ins Heim eintragen
            let updated = false;
            if (aiData.fax && (!heim.fax || heim.fax.trim() === '')) { heim.fax = aiData.fax; updated = true; }
            if (aiData.phone && (!heim.phone || heim.phone.trim() === '')) { heim.phone = aiData.phone; updated = true; }
            if (aiData.email && (!heim.email || heim.email.trim() === '' || heim.email.includes('?body='))) { heim.email = aiData.email; updated = true; }
            
            // Immer als gecheckt markieren, auch wenn nichts gefunden wurde (damit wir nicht im Loop hängen)
            heim.ai_checked = true;

            const resStr = [];
            if (aiData.fax) resStr.push(`🖨️ ${aiData.fax}`);
            if (aiData.email) resStr.push(`✉️ ${aiData.email}`);
            console.log(`[✅ Fertig] ${heim.name} -> ${resStr.length ? resStr.join(' | ') : 'Nichts neues gefunden.'} ${updated ? '(NEU)' : ''}`);
        });

        await Promise.all(promises);

        // Speichern nach jedem Batch
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
        console.log(`💾 Batch gespeichert!`);

        if (i + BATCH_SIZE < unchecked.length) {
            console.log(`⏳ Warte ${DELAY_MS / 1000}s wegen Rate-Limits...`);
            await delay(DELAY_MS);
        }
    }
    
    console.log("\n🎉 ALLE HEIME WURDEN DURCH DIE KI GEPRÜFT! 🎉");
}

run();
