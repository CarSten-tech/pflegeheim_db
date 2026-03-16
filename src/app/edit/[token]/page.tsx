'use client';

import { useState, useEffect, use } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

export default function EditProfile({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/facilities/${token}`)
      .then(res => res.json())
      .then((facility) => {
        if (facility.error) {
          toast.error(facility.error);
        } else {
          setData(facility);
        }
        setLoading(false);
      })
      .catch(() => {
        toast.error("Verbindungsfehler");
        setLoading(false);
      });
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/facilities', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await res.json();
      
      if (res.ok) {
        toast.success("Daten wurden erfolgreich aktualisiert!");
      } else {
        toast.error(result.error || "Fehler beim Speichern");
      }
    } catch (err) {
      toast.error("Netzwerkfehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        {/* Top Navigation Bar - Simple */}
        <div className="bg-white border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                 <span className="text-primary font-bold text-xl tracking-tight">Pflegeplatz-Portal</span>
            </div>
            <div className="text-sm font-medium text-neutral-500 bg-neutral-100 px-3 py-1.5 rounded-md border">
              Stammdaten-Verwaltung für Kooperationspartner
            </div>
          </div>
        </div>

        <main className="p-4 md:p-8 flex items-start justify-center pt-8">
          <Card className="w-full max-w-2xl shadow-sm border border-neutral-200 rounded-lg">
             <CardContent className="p-8 space-y-4">
               <Skeleton className="h-8 w-[200px]" />
               <Skeleton className="h-4 w-full" />
               <div className="grid grid-cols-2 gap-4 mt-8">
                 <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-10 w-full" />
               </div>
             </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        {/* Top Navigation Bar - Simple */}
        <div className="bg-white border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                 <span className="text-primary font-bold text-xl tracking-tight">Pflegeplatz-Portal</span>
            </div>
          </div>
        </div>

        <main className="p-4 md:p-8 flex items-start justify-center pt-8">
          <Card className="w-full max-w-md shadow-sm border-t-4 border-t-red-600 border-x-0 border-b-0 rounded-md text-center">
            <CardHeader>
              <CardTitle className="text-xl text-red-900">Zugriff verweigert</CardTitle>
              <CardDescription>Der aufgerufene Link ist ungültig oder abgelaufen.</CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
        {/* Top Navigation Bar - Simple */}
        <div className="bg-white border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                 <span className="text-primary font-bold text-xl tracking-tight">Pflegeplatz-Portal</span>
            </div>
            <div className="text-sm font-medium text-neutral-500 bg-neutral-100 px-3 py-1.5 rounded-md border">
              Stammdaten-Verwaltung für Kooperationspartner
            </div>
          </div>
        </div>

      <main className="p-4 md:p-8 flex items-start justify-center pt-8">
        <Card className="w-full max-w-2xl shadow-sm border border-neutral-200 rounded-lg">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl text-primary mb-2">{data.name}</CardTitle>
              <CardDescription>
                Aktualisieren Sie hier die Stammdaten Ihrer Einrichtung für das Pflegeplatz-Portal.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-1 items-end">
                {data.has_vollstationaer && <Badge variant="outline" className="border-primary text-primary">Stationär</Badge>}
                {data.has_kurzzeitpflege && <Badge className="bg-secondary text-secondary-foreground">Kurzzeitpflege</Badge>}
            </div>
          </div>
          <div className="text-sm text-neutral-500 mt-2">
            Zuletzt aktualisiert: {data.last_vacancy_update ? new Date(data.last_vacancy_update).toLocaleString('de-DE') : 'Bisher kein Update'}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">

          {data.ai_checked && (!data.fax_verified_at || !data.email_verified_at) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 text-blue-800">
              <span className="text-xl">🤖</span>
              <div className="text-sm">
                <p className="font-semibold">Automatisch recherchierte Daten</p>
                <p>
                  Einige der untenstehenden Kontaktdaten (wie Fax oder E-Mail) wurden automatisiert für Sie recherchiert. 
                  Bitte prüfen Sie diese sorgfältig und korrigieren Sie sie bei Bedarf. 
                  Mit dem Klick auf "Speichern" bestätigen Sie die Richtigkeit für unser Portal.
                </p>
              </div>
            </div>
          )}
          
          <div className="space-y-4 bg-white p-4 border rounded-lg">
             <h3 className="font-semibold text-neutral-900 border-b pb-2">Kontaktdaten für Überleitungen</h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon *</Label>
                  <Input 
                    id="phone" 
                    value={data.phone} 
                    onChange={(e) => setData({...data, phone: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fax">Sichere Faxnummer (TKG) *</Label>
                  <Input 
                    id="fax"
                    className="font-mono bg-accent/20"
                    value={data.fax} 
                    onChange={(e) => setData({...data, fax: e.target.value})} 
                  />
                  <p className="text-xs text-neutral-500">Für Krankenakten / Überleitungsbögen</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact">Ansprechpartner Überleitungsmgm.</Label>
                  <Input 
                    id="contact" 
                    placeholder="z.B. Frau Schmidt (PDL)"
                    value={data.contact_person || ''} 
                    onChange={(e) => setData({...data, contact_person: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Mögliche Rückfragen via E-Mail</Label>
                  <Input 
                    id="email" 
                    value={data.email} 
                    onChange={(e) => setData({...data, email: e.target.value})} 
                  />
                </div>
              </div>
          </div>

          {/* Besondere Pflegeangebote (Spezialisierungen) */}
          <div className="space-y-4 bg-white p-4 border rounded-lg">
             <h3 className="font-semibold text-neutral-900 border-b pb-2">Besondere Pflegeangebote & Schwerpunkte</h3>
             <p className="text-sm text-neutral-500">Geben Sie an, für welche Patientengruppen Ihre Einrichtung besonders ausgelegt ist:</p>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
               {[
                 { id: 'junge_pflege', label: 'Junge Pflege (U60)' },
                 { id: 'demenz', label: 'Demenz / Geschlossener Bereich' },
                 { id: 'beatmung', label: 'Beatmung / Wachkoma (Phase F)' },
                 { id: 'palliativ', label: 'Schwerstpflege / Palliativ' },
                 { id: 'bariatrisch', label: 'Bariatrisch / Adipositas' },
                 { id: 'sucht', label: 'Suchterkrankungen / Korsakow' },
                 { id: 'mrsa', label: 'MRSA / Isolations-Möglichkeit' },
                 { id: 'kultur', label: 'Kultursensible Pflege' },
                 { id: 'haustiere', label: 'Haustiere erlaubt' },
               ].map((specialty) => (
                 <label key={specialty.id} className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-neutral-50">
                    <input 
                      type="checkbox" 
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                      checked={!!data.specialties?.[specialty.id as keyof typeof data.specialties]}
                      onChange={(e) => {
                        setData({
                          ...data,
                          specialties: {
                            ...(data.specialties || {}),
                            [specialty.id]: e.target.checked
                          }
                        });
                      }}
                    />
                    <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {specialty.label}
                    </span>
                 </label>
               ))}
             </div>
          </div>

          <p className="text-sm text-primary-foreground text-center bg-primary/90 p-3 rounded-md shadow-sm">
            Ihre Änderungen sind sofort im Pflegeplatz-Portal sichtbar.
            Bitte speichern Sie den aktuellen Link zu dieser Seite gut ab.
          </p>

        </CardContent>
        <CardFooter className="bg-neutral-50 px-6 py-4 border-t flex justify-end">
             <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {saving ? 'Speichert...' : 'Änderungen speichern'}
             </Button>
        </CardFooter>
      </Card>
      </main>
    </div>
  );
}
