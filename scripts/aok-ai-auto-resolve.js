const fs = require('fs');

const DB = '/Users/carstenrheidt/.gemini/antigravity/scratch/pflegeplatz-portal/data/database.json';
const CONF = '/Users/carstenrheidt/.gemini/antigravity/scratch/pflegeplatz-portal/data/aok-email-conflicts.json';

try {
  let db = JSON.parse(fs.readFileSync(DB, 'utf8'));
  let confs = JSON.parse(fs.readFileSync(CONF, 'utf8'));
  
  let appliedCount = 0;
  let remainingConfs = [];

  for (let c of confs) {
    // Wenn KI-Empfehlung da ist UND es kein "KI-Fehler" war
    if (c.aiRecommendation && c.aiReasoning && !c.aiReasoning.includes("KI-Fehler")) {
      
      // Update in DB (für ALLE Duplikate falls vorhanden)
      for (let h of db) {
        if (h.zip === c.zip && h.name === c.name) {
          h.email = c.aiRecommendation;
        }
      }
      appliedCount++;
    } else {
      // Behalte in der Konflikt-Liste
      remainingConfs.push(c);
    }
  }

  fs.writeFileSync(DB, JSON.stringify(db, null, 2));
  fs.writeFileSync(CONF, JSON.stringify(remainingConfs, null, 2));

  console.log(`\n✅ Erfolgreich ${appliedCount} KI-Vorschläge automatisch in database.json übernommen!`);
  console.log(`⚠️ Es verbleiben noch ${remainingConfs.length} ungeklärte Konflikte zur manuellen Prüfung.`);
} catch (err) {
  console.error("Fehler beim Auto-Resolve:", err);
}
