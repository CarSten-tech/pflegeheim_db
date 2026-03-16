import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Facility } from '../route';

const DB_PATH = path.join(process.cwd(), 'data', 'database.json');

const readDB = (): Facility[] => {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data) as Facility[];
  } catch (err) {
    return [];
  }
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const data = readDB();
  const facility = data.find(f => f.edit_token === token);

  if (!facility) {
    return NextResponse.json(
      { error: 'Einrichtung nicht gefunden oder Link ungültig.' },
      { status: 404 }
    );
  }

  return NextResponse.json(facility);
}
