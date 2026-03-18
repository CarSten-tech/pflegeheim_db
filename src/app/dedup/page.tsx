'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Layers, Loader2, ArrowRightLeft, Info, CheckCircle2 } from "lucide-react";

export default function DedupDashboard() {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicateGroups, setDuplicateGroups] = useState<any[][]>([]);
  
  // Maps groupIdx -> keepToken
  const [selectedMerges, setSelectedMerges] = useState<Record<number, string>>({});
  const [isMergingBatch, setIsMergingBatch] = useState(false);

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

        // Auto-select the "best" entry for each group
        const initialSelections: Record<number, string> = {};
        (duplicates as any[][]).forEach((group, idx) => {
            let best = group[0];
            let maxScore = -1;
            group.forEach(f => {
                let score = (f.phone ? 1 : 0) + (f.fax ? 1 : 0) + (f.email ? 1 : 0);
                // Mild penalty if the name explicitly says Kurzzeitpflege, as we usually want the main building name
                if (f.name.toLowerCase().includes('kurzzeit')) score -= 0.5;
                if (score > maxScore) { maxScore = score; best = f; }
            });
            initialSelections[idx] = best.edit_token;
        });
        setSelectedMerges(initialSelections);

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

  const handleSelectKeep = (groupIdx: number, token: string) => {
    setSelectedMerges(prev => ({
      ...prev,
      [groupIdx]: token
    }));
  };

  const handleMergeAll = async () => {
    const mergeCount = Object.keys(selectedMerges).length;
    if (mergeCount === 0) return;

    if (!confirm(`Bist du sicher, dass du alle ${mergeCount} ausgewählten Duplikat-Heime auf einmal zusammenführen und den Rest löschen möchtest?`)) {
       return;
    }

    setIsMergingBatch(true);

    // Build the payload
    const mergesPayload = duplicateGroups.map((group, idx) => {
      const keepToken = selectedMerges[idx];
      const deleteTokens = group.filter(f => f.edit_token !== keepToken).map(f => f.edit_token);
      
      const hasKurzzeitpflegeAnywhere = group.some(f => 
        f.has_kurzzeitpflege || 
        (f.name && f.name.toLowerCase().includes('kurzzeit'))
      );

      return {
        keepToken,
        deleteTokens,
        applyKurzzeit: hasKurzzeitpflegeAnywhere
      };
    });

    try {
      const res = await fetch('/api/facilities/merge-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merges: mergesPayload })
      });

      if (res.ok) {
        toast.success(`${mergeCount} Gruppen erfolgreich in einem Rutsch zusammengeführt!`);
        loadData(); // Reload to get empty duplicate groups
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Fehler beim Zusammenführen der Gruppen");
      }
    } catch (err) {
      toast.error("Netzwerkfehler");
    } finally {
      setIsMergingBatch(false);
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
    <div className="min-h-screen bg-slate-50 pd-bottom-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="mx-auto max-w-5xl px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-primary font-bold text-xl tracking-tight">Deduplikation</span>
            <Badge variant="secondary" className="bg-blue-50 text-blue-700">
               {duplicateGroups.length} Gruppen gefunden
            </Badge>
          </div>
          {duplicateGroups.length > 0 && (
            <Button 
                onClick={handleMergeAll} 
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 shadow-md transition-all gap-2 w-full md:w-auto"
                disabled={isMergingBatch}
            >
              {isMergingBatch ? (
                  <><Loader2 className="h-5 w-5 animate-spin"/> Verarbeite {duplicateGroups.length} Gruppen...</>
              ) : (
                  <><Layers className="h-5 w-5" /> Alle {duplicateGroups.length} Gruppen bereinigen</>
              )}
            </Button>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-5xl p-4 md:p-8 space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 flex gap-4 text-blue-800 shadow-sm">
          <Info className="h-6 w-6 flex-shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-semibold text-base">Stapelverarbeitung (Batch-Modus)</p>
            <p>
              Hier werden alle Heime aufgelistet, die sich exakt die gleiche Straße und Stadt teilen. 
              Das System hat links (<span className="text-blue-600 font-bold">blau markiert</span>) bereits den Eintrag mit den meisten Daten für dich vorausgewählt.
            </p>
            <p className="pt-2 italic text-blue-700">
              Scrolle einfach kurz durch. Wenn du bei einem Paar lieber den anderen Namen behalten möchtest, klicke auf dessen Karte. Klicke am Ende ganz oben auf den roten Button!
            </p>
          </div>
        </div>

        {duplicateGroups.length === 0 ? (
          <div className="text-center py-24 text-neutral-500 bg-white rounded-lg border border-neutral-200 shadow-sm">
             <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-emerald-400" />
             <h3 className="text-xl font-medium text-neutral-900">Alles blitzblank!</h3>
             <p className="mt-2 text-neutral-500">Es wurden keine offensichtlichen Straßen-Duplikate in der Datenbank gefunden.</p>
          </div>
        ) : (
          <div className="space-y-8 pb-32">
            {duplicateGroups.map((group, groupIdx) => {
              const keepToken = selectedMerges[groupIdx];
              
              return (
                <Card key={groupIdx} className="shadow-sm border-neutral-300 overflow-hidden">
                  <div className="bg-neutral-100/80 px-4 py-3 border-b border-neutral-200 flex justify-between items-center">
                    <div className="font-medium text-sm text-neutral-600">
                      Gruppe {groupIdx + 1} — <span className="text-neutral-900 font-semibold">{group[0].street}, {group[0].city}</span>
                    </div>
                  </div>
                  <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-200">
                      {group.map((f, i) => {
                        const isSelected = keepToken === f.edit_token;
                        
                        return (
                          <div 
                            key={f.edit_token} 
                            onClick={() => handleSelectKeep(groupIdx, f.edit_token)}
                            className={`p-5 flex flex-col justify-between cursor-pointer transition-all border-4 relative ${
                              isSelected 
                                ? "bg-blue-50/70 border-blue-500 shadow-inner" 
                                : "bg-white border-transparent hover:bg-neutral-50 hover:border-neutral-200 opacity-70 hover:opacity-100"
                            }`}
                          >
                            {isSelected && (
                                <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                                    DIESEN BEHALTEN
                                </div>
                            )}

                            <div className="space-y-4">
                              <div>
                                <h4 className={`font-bold leading-tight mb-1 ${isSelected ? "text-blue-900" : "text-neutral-900"}`}>
                                    {f.name}
                                </h4>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {f.has_vollstationaer && <Badge variant="outline" className="border-primary/50 text-xs px-1.5 py-0.5">Vollstationär</Badge>}
                                  {(f.has_kurzzeitpflege || f.name.toLowerCase().includes('kurzzeit')) && <Badge variant="outline" className="border-secondary text-secondary-foreground text-xs px-1.5 py-0.5 bg-secondary/10">Kurzzeitpflege</Badge>}
                                </div>
                              </div>
                              
                              <div className="text-xs space-y-1 text-neutral-500 bg-white/50 p-2 rounded border border-neutral-100">
                                {f.phone && <p>Tel: <span className="text-neutral-700 font-medium">{f.phone}</span></p>}
                                {f.fax && <p>Fax: <span className="text-neutral-700 font-medium">{f.fax}</span></p>}
                                {f.email && <p>Mail: <span className="text-neutral-700 font-medium truncate">{f.email}</span></p>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
