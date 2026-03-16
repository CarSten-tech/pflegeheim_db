import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface Facility {
  name: string;
  street: string;
  zip: string;
  city: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
  has_kurzzeitpflege: boolean;
  has_vollstationaer: boolean;
  edit_token: string;
  contact_person: string;
  fax_verified_at: string | null;
  email_verified_at: string | null;
  specialties?: {
    junge_pflege?: boolean;
    demenz?: boolean;
    beatmung?: boolean;
    palliativ?: boolean;
    bariatrisch?: boolean;
    sucht?: boolean;
    mrsa?: boolean;
    kultur?: boolean;
    haustiere?: boolean;
  };
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

const writeDB = (data: Facility[]): boolean => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Fehler beim Schreiben der Datenbank:', err);
    return false;
  }
};

export async function GET() {
  const data = readDB();
  
  // WICHTIG: Das Dashboard bekommt NICHT die edit_tokens der Heime gesendet!
  const safeData = data.map((d) => {
    const { edit_token, ...safeFacility } = d;
    return safeFacility;
  });

  return NextResponse.json(safeData);
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const token = body.edit_token; 

    if (!token) {
      return NextResponse.json({ error: 'Kein Token bereitgestellt.' }, { status: 401 });
    }

    const data = readDB();
    const facilityIndex = data.findIndex(f => f.edit_token === token);

    if (facilityIndex === -1) {
      return NextResponse.json({ error: 'Einrichtung für diesen Token nicht gefunden.' }, { status: 404 });
    }

    const current = data[facilityIndex];
    
    data[facilityIndex] = {
      ...current,
      phone: body.phone ?? current.phone,
      fax: body.fax ?? current.fax,
      email: body.email ?? current.email,
      contact_person: body.contact_person ?? current.contact_person,
      has_kurzzeitpflege: body.has_kurzzeitpflege ?? current.has_kurzzeitpflege,
      has_vollstationaer: body.has_vollstationaer ?? current.has_vollstationaer,
      specialties: {
        ...(current.specialties || {}),
        ...(body.specialties || {})
      },
      fax_verified_at: body.fax !== undefined ? new Date().toISOString() : current.fax_verified_at,
      email_verified_at: body.email !== undefined ? new Date().toISOString() : current.email_verified_at
    };

    const success = writeDB(data);

    if (success) {
      return NextResponse.json({ message: 'Erfolgreich gespeichert', facility: data[facilityIndex] });
    } else {
      return NextResponse.json({ error: 'Fehler beim Speichern in die Datei.' }, { status: 500 });
    }

  } catch (err) {
    return NextResponse.json({ error: 'Ungültiger Request' }, { status: 400 });
  }
}
