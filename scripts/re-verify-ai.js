#!/usr/bin/env node
/**
 * re-verify-ai.js – Strenges AI-Verifizierungs-Tool für Pflegeheim-Kontaktdaten
 * 
 * Nutzt Serper API (Google Suche) + Gemini 2.5 Flash, um Kontaktdaten zu GÜLTIGEN
 * Heimen zuzuordnen. 
 * 
 * ZIEL: 0% Halluzinationen. Nur direkte Kontakte, keine Träger.
 * Wenn auch nur der geringste Zweifel besteht: null.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// ============================================================================
// CONFIG (Keys als ENV Varsa oder direkt hier eintragen zum Testen)
// ============================================================================
const SERPER_API_KEY = process.env.SERPER_API_KEY || '84a62940245c8b1ba57fd963373615590a80851d'; // <-- DEIN SERPER KEY HIER
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAXn92fK4yBDhJgBHNlteVa9g83-3Uiaq8'; // <-- DEIN GEMINI KEY HIER

const DB_PATH = path.join(__dirname, '../data/database.json');
const LOG_PATH = path.join(__dirname, '../data/re-verify-log.txt');
const BATCH_SIZE = 5;
const DELAY_MS = 1500;

function appendLog(text) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(LOG_PATH, `[${timestamp}] ${text}\n`, 'utf8');
}

// Bekannte Träger-Domains zur Warnung/Filterung:
const CARRIER_DOMAINS = [
  'caritas', 'diakonie', 'awo', 'drk', 'johanniter', 'malteser',
  'alloheim', 'pro-talis', 'korian', 'orpea', 'cusanus', 'augustinus',
  'rheinlandklinikum', 'bethel', 'diakoniewerk', 'evangelisch',
  'alexianer', 'christophorus', 'vinzenz', 'katharina-kasper',
  'marienhaus', 'cellitinnen', 'bonifatius', 'recollectio'
];

const GENERAL_EMAIL_PREFIXES = [
  'info', 'kontakt', 'verwaltung', 'empfang', 'aufnahme', 'pflegeheim',
  'zentrale', 'seniorenheim', 'senioren', 'haus', 'home', 'office',
  'mail', 'service', 'post', 'rezeption', 'sekretariat', 'leitung',
  'einrichtungsleitung', 'heimleitung', 'el', 'seniorenzentrum',
  'seniorenstift', 'altenpflege', 'pflege', 'beratung', 'aufnahme-senioreneinrichtungen',
  'aph.heimaufnahme', 'beratung-pflege', 'pflegeberatung', 'seniorenberatung',
  'beratungszentrum', 'zbm', 'eac', 'pdl', 'stadthaus', 'kontakt-altenpflege'
];

function isPersonalizedEmail(email) {
  if (!email || !email.includes('@')) return false;
  const local = email.split('@')[0].toLowerCase();
  
  if (GENERAL_EMAIL_PREFIXES.some(p => local === p || local.startsWith(p + '.'))) return false;
  if (/^[a-z\-]+$/.test(local) && !local.includes('.')) return false; 
  if (/^[a-z]+\.[a-z]+/.test(local)) return true; // max.mustermann
  if (/^[a-z]\.[a-z]+/.test(local)) return true; // m.mustermann
  if (local.includes('.') && !GENERAL_EMAIL_PREFIXES.includes(local.split('.')[0])) return true;
  return false;
}

function isCarrierDomain(email) {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1].toLowerCase();
  return CARRIER_DOMAINS.some(cd => domain.includes(cd));
}


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
            num: 6 // Etwas mehr Kontext
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
        console.error(`  [!] Serper API Fehler:`, err.response?.data?.message || err.message);
        return "";
    }
}

async function verifyWithGemini(heim, snippets) {
    if (!snippets) return { fax: null, phone: null, email: null, status: "error" };

const prompt = `
Du bist ein extrem pingeliger, forensischer Datenanalyst.
DEIN EINZIGES ZIEL: 0% Halluzinationen. 0% Träger-Daten. Nur 100% verifizierte, LOKALE Kontaktdaten für dieses spezifische Pflegeheim.

HEIM: "${heim.name}"
STADT: "${heim.city}"
POSTLEITZAHL: "${heim.zip}"
STRASSE: "${heim.street}"

BISHERIGE DATEN (Möglicherweise falsch!):
Phone: ${heim.phone || 'null'}
Fax: ${heim.fax || 'null'}
Email: ${heim.email || 'null'}

ANALYSISIEREN SIE DIESE GOOGLE-SUCHERGEBNISSE:
${snippets}

KRITISCHE EXEKUTIONS-REGELN (BEI MISSACHTUNG GIBST DU "null" ZURÜCK):
1. LOKALITÄT ZWINGEND: Du suchst den Kontakt für genau DIESES Heim in ${heim.city}. Telefon-Vorwahlen müssen zu ${heim.city} passen.
2. KEIN TRÄGER (CARITAS, DIAKONIE, ETC. ZENTRALEN): Wenn eine E-Mail oder Nummer offensichtlich zu einer übergeordneten Trägerzentrale, einem e.V.-Hauptbüro, oder einer zentralen Platzvermittlung gehört -> IGNORIEREN! Behalte lieber "null"!
3. FAX IST NICHT TELEFON:
   - Eine Telefonnummer steht hinter "Tel", "Telefon", 📞.
   - Eine Faxnummer steht ZWINGEND hinter "Fax", "Telefax", 📠.
   - Wenn du dir nicht zu 100% sicher bist, dass es ein Fax ist -> "null"!
   - Fax- und Telefonnummer sind oftmals fast identisch (z.B. Tel endet auf -0, Fax auf -9). WENN SIE EXAKT GLEICH SIND, IST DAS FAX MEIST FALSCH! -> "null"!
4. EMAIL-REGELN (WICHTIG!):
   - Wir wollen ALLGEMEINE Heim-Emails: info@..., kontakt@..., verwaltung@..., [heimname]@...
   - PERSONALISIERTE Emails (Vorname.Nachname@...) sind VERBOTEN, es sei denn, der Text sagt explizit "Einrichtungsleitung / Heimleitung".
   - Wenn du eine personalisierte E-Mail findest, die auf einer Träger-Website (z.B. caritas-...) liegt, ist das meist ein Manager -> VERBOTEN -> "null".
5. MUT ZUR LÜCKE: Gib ein Feld als "null" zurück, wenn du im Text keinen 100% eindeutigen Beweis findest. RATE NIEMALS. Keine Durchwahlen erraten.

DU ANTWORTEST AUSSCHLIESSLICH UND NUR MIT EINEM REINEN VALIDEN JSON-OBJEKT! KEIN MARKDOWN! KEIN TEXT DRUMHERUM!
Format:
{
  "phone": "Verifizierte Nummer oder null",
  "fax": "Verifizierte Faxnummer oder null",
  "email": "Verifizierte E-Mail oder null"
}
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
        return JSON.parse(rawAnswer);
    } catch (err) {
        console.error(`  [!] Gemini API Fehler für ${heim.name}.`);
        return { fax: null, phone: null, email: null };
    }
}

// ============================================================================
// MAIN LOOP
// ============================================================================
async function run() {
    console.log("=================================================================");
    console.log("🤖 Pflegeplatz-Portal: STRICT AI RE-VERIFICATION (0% Hallucination)");
    console.log("=================================================================");

    if (!SERPER_API_KEY || !GEMINI_API_KEY) {
        console.error("❌ FEHLER: SERPER_API_KEY oder GEMINI_API_KEY fehlt.");
        console.error("Bitte im Code eintragen oder als Umgebungsvariable setzen!");
        process.exit(1);
    }

    let db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    
    // Welche Heime müssen reverifiziert werden?
    // 1. Alle die noch nicht mit dem neuen strict-script (strict_ai_verified_at) geprüft wurden.
    // 2. Optional: Wir filtern hier nach denen, die wir als "verdächtig" eingestuft haben.
    
    let unchecked = db.filter(f => {
        if (f.strict_ai_verified_at) return false;
        
        // Finde verdächtige nach unseren alten Regeln:
        const hasFaxPhoneMatch = f.fax && f.phone && f.fax.replace(/[\s\-\/\(\)]/g,'') === f.phone.replace(/[\s\-\/\(\)]/g,'') && f.fax.length > 5;
        const hasPersonalizedCarrierEmail = isPersonalizedEmail(f.email) && isCarrierDomain(f.email);
        const hasPersonalizedEmail = isPersonalizedEmail(f.email);
        const hasLongNumbers = (f.phone && f.phone.replace(/[^\d]/g,'').length > 15) || (f.fax && f.fax.replace(/[^\d]/g,'').length > 15);
        
        // Du kannst hier true zurückgeben, um ALLE nochmal zu prüfen,
        // oder nur die verdächtigen:
        return hasFaxPhoneMatch || hasPersonalizedEmail || hasLongNumbers || hasPersonalizedCarrierEmail || (!f.fax && !f.email);
    });

    console.log(`> Gefunden: ${unchecked.length} Heime, die STRENG AI-reverifiziert werden müssen.`);

    if (unchecked.length === 0) return;

    for (let i = 0; i < unchecked.length; i += BATCH_SIZE) {
        const batch = unchecked.slice(i, i + BATCH_SIZE);
        console.log(`\n============== BATCH ${i/BATCH_SIZE + 1} ==============`);
        
        const promises = batch.map(async (heim) => {
            const query = `"${heim.name}" ${heim.city || ''} ${heim.street || ''} Pflegeheim Kontakt Email Fax`;
            const snippets = await googleSearch(query);
            
            const aiData = await verifyWithGemini(heim, snippets);
            
            let changes = [];
            
            // Vergleichen und updaten
            if (aiData.fax !== undefined) {
                if (aiData.fax !== heim.fax) {
                    changes.push(`Fax: [${heim.fax || 'null'}] -> [${aiData.fax}]`);
                    heim.fax = aiData.fax;
                }
            }
            if (aiData.email !== undefined) {
                if (aiData.email !== heim.email) {
                    changes.push(`Email: [${heim.email || 'null'}] -> [${aiData.email}]`);
                    heim.email = aiData.email;
                }
            }
            if (aiData.phone !== undefined) {
                if (aiData.phone !== heim.phone) {
                    changes.push(`Phone: [${heim.phone || 'null'}] -> [${aiData.phone}]`);
                    heim.phone = aiData.phone;
                }
            }
            
            heim.strict_ai_verified_at = new Date().toISOString();

            if (changes.length > 0) {
                const logMsg = `KORRIGIERT: ${heim.name} | ` + changes.join(' | ');
                console.log(`[🔄 ${logMsg}]`);
                appendLog(logMsg);
            } else {
                console.log(`[✅ OK] ${heim.name} - Keine Änderung nötig (oder AI hat nichts Besseres gefunden).`);
            }
            
            // Finde den Index im original array
            const dbIndex = db.findIndex(x => x.edit_token === heim.edit_token || (x.name === heim.name && x.street === heim.street));
            if (dbIndex !== -1) {
                db[dbIndex] = heim;
            }
        });

        await Promise.all(promises);

        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
        console.log(`💾 Batch gespeichert!`);

        if (i + BATCH_SIZE < unchecked.length) {
            await delay(DELAY_MS);
        }
    }
    
    console.log("\n🎉 ALLE VERDÄCHTIGEN HEIME WURDEN DURCH DIE STRENGE KI RE-VERIFIZIERT! 🎉");
}

run().catch(console.error);
