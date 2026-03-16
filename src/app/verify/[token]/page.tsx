'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShieldCheck, Mail, Printer } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from 'next/navigation';

export default function VerifyPage() {
  const params = useParams();
  const token = params.token as string;

  const [facility, setFacility] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [fax, setFax] = useState('');
  const [email, setEmail] = useState('');
  const [contactPerson, setContactPerson] = useState('');

  useEffect(() => {
    // Fetch facility data via token
    fetch(`/api/facilities/verify-fetch?token=${token}`)
      .then(res => {
        if (!res.ok) throw new Error('Token ungültig oder abgelaufen');
        return res.json();
      })
      .then(data => {
        setFacility(data);
        setFax(data.fax || '');
        setEmail(data.email || '');
        setContactPerson(data.contact_person || '');
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const res = await fetch('/api/facilities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edit_token: token,
          fax,
          email,
          contact_person: contactPerson
        })
      });

      if (!res.ok) throw new Error('Fehler beim Speichern');
      setSuccess(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-neutral-200">
          <CardHeader><Skeleton className="h-8 w-3/4 mx-auto" /></CardHeader>
          <CardContent className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-red-200 bg-red-50 text-center">
          <CardHeader>
            <CardTitle className="text-red-700">Zugriff verweigert</CardTitle>
          </CardHeader>
          <CardContent className="text-red-600 font-medium">{error}</CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-emerald-200 text-center py-6">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl text-emerald-800">Daten verifiziert!</CardTitle>
            <CardDescription className="text-emerald-600 mt-2">
              Vielen Dank für Ihre Bestätigung. Ihre direkten Stationskontaktdaten wurden im NRW Überleitungsverzeichnis hinterlegt.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-neutral-200">
        <CardHeader className="text-center space-y-2 pb-6 border-b border-neutral-100">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold text-neutral-900">NRW Überleitungsverzeichnis</CardTitle>
          <CardDescription className="text-sm">
            Bitte bestätigen oder korrigieren Sie die direkte Kontaktnummer Ihrer Einrichtung: <strong>{facility?.name}</strong>.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                <Printer className="h-4 w-4 text-neutral-400" />
                Direkte Faxnummer für Überleitungen
              </label>
              <Input 
                value={fax} 
                onChange={e => setFax(e.target.value)} 
                placeholder="z.B. 0211 / 123456" 
                className="bg-neutral-50 text-lg font-mono"
                required
              />
              <p className="text-xs text-neutral-500">Bitte keine Sammelnummern der Hauptverwaltung angeben.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                <Mail className="h-4 w-4 text-neutral-400" />
                Stations-E-Mail (Optional)
              </label>
              <Input 
                type="email"
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="station1@pflegeheim.de" 
                className="bg-neutral-50"
              />
            </div>

            <Button type="submit" disabled={saving} className="w-full text-base font-semibold py-6">
              {saving ? 'Wird verifiziert...' : 'Daten bestätigen & verifizieren'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
