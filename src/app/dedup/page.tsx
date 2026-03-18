'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Layers, Loader2, ArrowRightLeft, Info } from "lucide-react";

export default function DedupDashboard() {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicateGroups, setDuplicateGroups] = useState<any[][]>([]);
  const [mergingToken, setMergingToken] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    fetch('/api/facilities/all-internal')
      .then(res => res.json())
      .then(data => {
        setFacilities(data);
        
        // Find exact street + city duplicates
        const normalize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        
        const grouped = data.reduce((acc: any, f: any) => {
          const st = normalize(f.street);
          const ci = normalize(f.city);
          // Only group if street has at least 5 letters (prevents grouping missing streets)
          if (st.length > 5 && ci.length > 2) {
            const key = `${ci}|${st}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(f);
          }
          return acc;
        }, {});

        const duplicates = Object.values(grouped).filter((group: any) => group.length > 1);
        setDuplicateGroups(duplicates as any[][]);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Fehler beim Laden der Einrichtungen");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMerge = async (group: any[], keepToken: string) => {
    if (!confirm("Bist du sicher, dass du diese Einrichtungen zu einer zusammenführen möchtest? Die anderen Einträge in dieser Gruppe werden unwiderruflich gelöscht.")) {
       return;
    }

    setMergingToken(keepToken);
    const deleteTokens = group.filter(f => f.edit_token !== keepToken).map(f => f.edit_token);
    
    // Check if any of the items being deleted has "Kurzzeitpflege" or "Tagespflege" in name or flags
    const hasKurzzeitpflegeAnywhere = group.some(f => 
      f.has_kurzzeitpflege || 
      (f.name && f.name.toLowerCase().includes('kurzzeit'))
    );

    try {
      const res = await fetch('/api/facilities/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keepToken,
          deleteTokens,
          applyKurzzeit: hasKurzzeitpflegeAnywhere
        })
      });

      if (res.ok) {
        toast.success("Erfolgreich zusammengeführt und bereinigt!");
        loadData(); // Reload to get fresh duplicate groups without the deleted ones
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Fehler beim Zusammenführen");
      }
    } catch (err) {
      toast.error("Netzwerkfehler");
    } finally {
      setMergingToken(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-neutral-500">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
           <p>Analysiere Datenbank auf Duplikate...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-primary font-bold text-xl tracking-tight">Deduplikation</span>
          </div>
          <Badge variant="secondary" className="bg-blue-50 text-blue-700">
             {duplicateGroups.length} Gruppen gefunden
          </Badge>
        </div>
      </div>

      <main className="mx-auto max-w-5xl p-4 md:p-8 space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 flex gap-4 text-blue-800 shadow-sm">
          <Info className="h-6 w-6 flex-shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-semibold text-base">Zusammenführen von Duplikaten</p>
            <p>
              Hier werden alle Heime aufgelistet, die sich exakt die gleiche Straße und Stadt teilen (häufig der Fall bei getrennten Einträgen für Kurzzeit- und Langzeitpflege). 
            </p>
            <p className="pt-2 italic text-blue-700">
              Tipp: Klicke bei der Einrichtung, deren **Name besser oder vollständiger** ist, auf "Diesen behalten". Das System überträgt das Kurzzeitpflege-Häkchen automatisch von den gelöschten Duplikaten auf den behaltenen Haupteintrag.
            </p>
          </div>
        </div>

        {duplicateGroups.length === 0 ? (
          <div className="text-center py-24 text-neutral-500 bg-white rounded-lg border border-neutral-200 shadow-sm">
             <Layers className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
             <h3 className="text-lg font-medium text-neutral-900">Fantastisch!</h3>
             <p>Es wurden keine offensichtlichen Straßen-Duplikate in der Datenbank gefunden.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {duplicateGroups.map((group, groupIdx) => (
              <Card key={groupIdx} className="shadow-sm border-neutral-200 overflow-hidden">
                <div className="bg-neutral-100/50 px-4 py-3 border-b border-neutral-200 flex justify-between items-center">
                  <div className="font-medium text-sm text-neutral-600">
                    Gruppe {groupIdx + 1} — <span className="text-neutral-900 font-semibold">{group[0].street}, {group[0].city} ({group[0].zip})</span>
                  </div>
                  <Badge variant="outline" className="text-xs bg-white">{group.length} Einträge</Badge>
                </div>
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-200">
                    {group.map((f, i) => (
                      <div key={f.edit_token} className="p-5 flex flex-col justify-between hover:bg-neutral-50 transition-colors">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-bold text-neutral-900 leading-tight mb-1">{f.name}</h4>
                            <div className="flex flex-wrap gap-1">
                              {f.has_vollstationaer && <Badge variant="outline" className="border-primary/50 text-xs px-1.5 py-0.5">Vollstationär</Badge>}
                              {(f.has_kurzzeitpflege || f.name.toLowerCase().includes('kurzzeit')) && <Badge variant="outline" className="border-secondary text-secondary-foreground text-xs px-1.5 py-0.5 bg-secondary/10">Kurzzeitpflege</Badge>}
                            </div>
                          </div>
                          
                          <div className="text-xs space-y-1 text-neutral-500">
                            {f.phone && <p>Tel: <span className="text-neutral-700">{f.phone}</span></p>}
                            {f.fax && <p>Fax: <span className="text-neutral-700">{f.fax}</span></p>}
                            {f.email && <p>Mail: <span className="text-neutral-700 truncate">{f.email}</span></p>}
                          </div>
                        </div>

                        <div className="mt-6">
                            <Button 
                              onClick={() => handleMerge(group, f.edit_token)}
                              disabled={mergingToken !== null}
                              variant={i === 0 ? "default" : "outline"}
                              className={`w-full gap-2 transition-all ${i === 0 ? "bg-primary text-white" : ""}`}
                            >
                              {mergingToken === f.edit_token ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Führe zusammen...</>
                              ) : (
                                <><ArrowRightLeft className="h-4 w-4" /> Diesen behalten & Rest löschen</>
                              )}
                            </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
