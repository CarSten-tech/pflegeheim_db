require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const SERPER_API_KEY = process.env.SERPER_API_KEY || '84a62940245c8b1ba57fd963373615590a80851d';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAXn92fK4yBDhJgBHNlteVa9g83-3Uiaq8';

const CONFLICTS_PATH = path.join(__dirname, '../data/aok-email-conflicts.json');
const BATCH_SIZE = 5;
const IS_TEST = process.argv.includes('--test');

async function googleSearch(query) {
    try {
        const response = await axios.post('https://google.serper.dev/search', {
            q: query, gl: 'de', hl: 'de', num: 4
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
        return snippets;
    } catch (err) {
        console.error(`  [!] Serper API Fehler:`, err.message);
        return "";
    }
}

async function getAiSuggestion(heim, snippets) {
    const prompt = `
Du bist ein forensischer Datenanalyst.
Wir haben zwei unterschiedliche E-Mail-Adressen für das folgende Pflegeheim:
HEIM: "${heim.name}"
STADT: "${heim.city}"
PLZ: "${heim.zip}"

E-Mail 1 (Interne DB): ${heim.ourEmail}
E-Mail 2 (AOK DB): ${heim.aokEmail}

SUCHERGEBNISSE ZU DEM HEIM:
${snippets}

AUFGABE:
Finde heraus, welche E-Mail-Adresse die RICHTIGE, OFFIZIELLE Verwaltungs- oder Einrichtungsadresse für genau dieses Heimes ist.
- Wenn E-Mail 1 oder 2 durch die Google-Ergebnisse (z.B. Impressum) bestätigt wird, wähle sie aus.
- Wenn E-Mail 1 und 2 offensichtlich falsch sind oder zu einer überregionalen Zentrale gehören, du aber in den Suchergebnissen die exakte lokale Heim-Email findest, wähle die gefundene.
- Wenn du nichts Eindeutiges findest, rate nicht, sondern gib als recommendedEmail die Adresse zurück, die generischer/allgemeiner aussieht (z.B. info@... anstatt name.nachname@...).

Formuliere eine extrem kurze, prägnante \`reasoning\` (Max 1 Satz, z.B. "Steht im aktuellen Impressum" oder "Vorname.Nachname ist vermutlich ein Mitarbeiter, info@ ist besser.").

Gib AUSSCHLIESSLICH ein valides JSON-Objekt zurück. Kein Text drumherum. Keine Markdown-Block-Tags.
{
  "recommendedEmail": "...",
  "reasoning": "..."
}
`;

    try {
        const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
        }, { headers: { 'Content-Type': 'application/json' }});

        let rawAnswer = response.data.candidates[0].content.parts[0].text;
        return JSON.parse(rawAnswer);
    } catch (err) {
        console.error(`  [!] Gemini API Fehler:`, err.response?.data?.error || err.message);
        return { recommendedEmail: heim.ourEmail || heim.aokEmail, reasoning: "KI-Fehler" };
    }
}

async function run() {
    console.log("=========================================");
    console.log("🤖 AOK E-Mail KI-Vorschlags-Skript gestartet");
    console.log("=========================================");

    let conflicts = [];
    if (fs.existsSync(CONFLICTS_PATH)) {
        conflicts = JSON.parse(fs.readFileSync(CONFLICTS_PATH, 'utf8'));
    }

    let pending = conflicts.filter(c => !c.aiRecommendation);
    console.log(`> Gefunden: ${pending.length} noch ungelöste Konflikte.`);

    if (IS_TEST) {
        pending = pending.slice(0, 5); // Nur 5 für Test
        console.log(`> TEST-MODUS AKTIVIERT: Arbeite nur 5 Stück ab.`);
    }

    if (pending.length === 0) return;

    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        const batch = pending.slice(i, i + BATCH_SIZE);
        
        const promises = batch.map(async (heim) => {
            console.log(`🔎 Prüfe: ${heim.name} (${heim.zip})...`);
            const query = `"${heim.name}" ${heim.zip} ${heim.city} Impressum Email Kontakt`;
            const snippets = await googleSearch(query);
            
            const aiData = await getAiSuggestion(heim, snippets);
            
            heim.aiRecommendation = aiData.recommendedEmail;
            heim.aiReasoning = aiData.reasoning;

            console.log(`  => KI rät: ${heim.aiRecommendation} | Grund: ${heim.aiReasoning}`);
        });

        await Promise.all(promises);
        
        // Save back
        fs.writeFileSync(CONFLICTS_PATH, JSON.stringify(conflicts, null, 2), 'utf8');
        console.log(`💾 Batch gespeichert! Fortschritt: ${Math.min(i + BATCH_SIZE, pending.length)} / ${pending.length}`);
        
        if (i + BATCH_SIZE < pending.length) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    
    console.log("\n🎉 KI-Skript ist durchgelaufen!");
}

run().catch(console.error);
