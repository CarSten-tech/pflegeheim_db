import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'database.json');

const readDB = (): any[] => {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data) as any[];
  } catch (err) {
    console.error('Fehler beim Lesen der Datenbank:', err);
    return [];
  }
};

// GET: Lädt alle Einrichtungen INKLUSIVE Tokens (NUR für das interne KH-Dashboard)
export async function GET() {
  const data = readDB();
  return NextResponse.json(data);
}
