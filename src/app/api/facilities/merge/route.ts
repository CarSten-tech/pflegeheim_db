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
    const { keepToken, deleteTokens, applyKurzzeit } = body;

    if (!keepToken || !deleteTokens || !Array.isArray(deleteTokens)) {
      return NextResponse.json({ error: 'Ungültiger Request Body.' }, { status: 400 });
    }

    let data = readDB();
    
    // Find the item to keep
    const keepIndex = data.findIndex(f => f.edit_token === keepToken);
    
    if (keepIndex === -1) {
      return NextResponse.json({ error: 'Haupt-Einrichtung nicht gefunden.' }, { status: 404 });
    }

    // Apply the Kurzzeitpflege flag if requested
    if (applyKurzzeit) {
      data[keepIndex].has_kurzzeitpflege = true;
    }

    // Filter out the items to delete
    data = data.filter(f => !deleteTokens.includes(f.edit_token));

    const success = writeDB(data);

    if (success) {
      return NextResponse.json({ message: 'Erfolgreich zusammengeführt' });
    } else {
      return NextResponse.json({ error: 'Fehler beim Speichern in die Datei.' }, { status: 500 });
    }

  } catch (err) {
    return NextResponse.json({ error: 'Interner Server Fehler' }, { status: 500 });
  }
}
