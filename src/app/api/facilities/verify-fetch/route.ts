import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface Facility {
  name: string;
  edit_token: string;
  fax: string;
  email: string;
  contact_person: string;
}

const DB_PATH = path.join(process.cwd(), 'data', 'database.json');

const readDB = (): Facility[] => {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data) as Facility[];
  } catch (err) {
    console.error('Fehler beim Lesen der Datenbank:', err);
    return [];
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Kein Token bereitgestellt.' }, { status: 400 });
  }

  const data = readDB();
  const facility = data.find(f => f.edit_token === token);

  if (!facility) {
    return NextResponse.json({ error: 'Ungültiger oder abgelaufener Token.' }, { status: 404 });
  }

  // Only return the necessary fields for the verify form, not the whole facility object for security
  return NextResponse.json({
    name: facility.name,
    fax: facility.fax || '',
    email: facility.email || '',
    contact_person: facility.contact_person || ''
  });
}
