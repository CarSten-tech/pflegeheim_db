import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'database.json');

const readDB = (): any[] => {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Fehler beim Lesen der Datenbank:', err);
    return [];
  }
};

const writeDB = (data: any[]): boolean => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Fehler beim Schreiben der Datenbank:', err);
    return false;
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { merges } = body; // Array of { keepToken, deleteTokens, applyKurzzeit }

    if (!merges || !Array.isArray(merges)) {
      return NextResponse.json({ error: 'Ungültiger Request Body.' }, { status: 400 });
    }

    let data = readDB();
    let allDeleteTokens: string[] = [];

    // Process each merge
    for (const merge of merges) {
      const { keepToken, deleteTokens, applyKurzzeit } = merge;
      
      const keepIndex = data.findIndex(f => f.edit_token === keepToken);
      if (keepIndex !== -1) {
        if (applyKurzzeit) {
          data[keepIndex].has_kurzzeitpflege = true;
        }
      }
      
      if (Array.isArray(deleteTokens)) {
        allDeleteTokens = allDeleteTokens.concat(deleteTokens);
      }
    }

    // Filter out all deleted items at once
    data = data.filter(f => !allDeleteTokens.includes(f.edit_token));

    const success = writeDB(data);

    if (success) {
      return NextResponse.json({ message: 'Alle Gruppen erfolgreich zusammengeführt' });
    } else {
      return NextResponse.json({ error: 'Fehler beim Speichern in die Datei.' }, { status: 500 });
    }

  } catch (err) {
    return NextResponse.json({ error: 'Interner Server Fehler' }, { status: 500 });
  }
}
