import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'database.json');
const CONFLICTS_PATH = path.join(process.cwd(), 'data', 'aok-email-conflicts.json');

export async function GET() {
  try {
    if (!fs.existsSync(CONFLICTS_PATH)) {
      return NextResponse.json([]);
    }
    const data = fs.readFileSync(CONFLICTS_PATH, 'utf8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading AOK conflicts:', error);
    return NextResponse.json({ error: 'Failed to read conflicts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, zip, chosenEmail } = await request.json();

    if (!name || !zip || typeof chosenEmail !== 'string') {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update database.json
    if (fs.existsSync(DB_PATH)) {
        let db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        let dbUpdated = false;
        
        for (let heim of db) {
            if (heim.zip === zip && heim.name === name) {
                if (heim.email !== chosenEmail) {
                    heim.email = chosenEmail;
                    dbUpdated = true;
                }
                // Do not break here! If there are duplicate facilities in database.json, 
                // we want to ensure ALL of them get the updated email.
            }
        }

        if (dbUpdated) {
            fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
        }
    }

    // Remove from conflicts
    if (fs.existsSync(CONFLICTS_PATH)) {
        let conflicts = JSON.parse(fs.readFileSync(CONFLICTS_PATH, 'utf8'));
        const initialCount = conflicts.length;
        
        conflicts = conflicts.filter((c: any) => !(c.zip === zip && c.name === name));
        
        if (conflicts.length < initialCount) {
             fs.writeFileSync(CONFLICTS_PATH, JSON.stringify(conflicts, null, 2), 'utf8');
        }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating AOK conflict:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
