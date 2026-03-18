'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Search, Save, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";

export default function NullReviewDashboard() {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  
  const [editValues, setEditValues] = useState<Record<string, { phone: string, fax: string, email: string }>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = () => {
    setLoading(true);
    fetch('/api/facilities/all-internal')
      .then(res => res.json())
      .then(data => {
        // Filter those containing exactly "null" or null or empty string in email
        const needsReview = data.filter((f: any) => 
          f.email === 'null' || f.email === null || String(f.email).trim() === ''
        );
        
        setFacilities(needsReview);
        
        // Initialize edit states
        const initialEdits: Record<string, any> = {};
        needsReview.forEach((f: any) => {
          initialEdits[f.edit_token] = {
            phone: f.phone === 'null' || f.phone === null ? '' : f.phone,
            fax: f.fax === 'null' || f.fax === null ? '' : f.fax,
            email: f.email === 'null' || f.email === null ? '' : f.email
          };
        });
        setEditValues(initialEdits);

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

  const handleEditChange = (token: string, field: 'phone' | 'fax' | 'email', value: string) => {
    setEditValues(prev => ({
      ...prev,
      [token]: { ...prev[token], [field]: value }
    }));
  };

  const handleSave = async (facility: any) => {
    const token = facility.edit_token;
    const edits = editValues[token];
    
    setSavingId(token);
    try {
      // Build exactly what we found. If it's still empty, we keep it as 'null' because they haven't fixed it
      // But actually, we only want to update fields they provided.
      const payload: any = { edit_token: token };
      
      let hasChanges = false;
      if (edits.phone.trim() !== '') { payload.phone = edits.phone; hasChanges = true; }
      if (edits.fax.trim() !== '') { payload.fax = edits.fax; hasChanges = true; }
      if (edits.email.trim() !== '') { payload.email = edits.email; hasChanges = true; }
      
      if (!hasChanges) {
        toast.error("Du musst mindestens ein Feld ausfüllen, um zu speichern.");
        setSavingId(null);
        return;
      }
      
      const res = await fetch('/api/facilities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(`${facility.name} aktualisiert`);
        // We do not reload data completely to save time, we just update the local state.
        // Wait, if we just remove it from the list? But maybe they only fixed ONE of the null fields, and others are still null?
        // Let's check if there are still null fields AFTER this change
        const isPhoneStillNull = !payload.phone && (facility.phone === 'null' || facility.phone === null);
        const isFaxStillNull = !payload.fax && (facility.fax === 'null' || facility.fax === null);
        const isEmailStillNull = !payload.email && (facility.email === 'null' || facility.email === null);
        
        if (!isEmailStillNull) {
             // Email null resolved, remove from list (since we only care about email now)
             setFacilities(prev => prev.filter(f => f.edit_token !== token));
        } else {
             // Some nulls still exist, just update the facility in the local array
             setFacilities(prev => prev.map(f => {
                if(f.edit_token === token) {
                   return { ...f, ...payload };
                }
                return f;
             }));
             // Also update edit state
             setEditValues(prev => ({
                ...prev,
                [token]: {
                    phone: isPhoneStillNull ? '' : (payload.phone || ''),
                    fax: isFaxStillNull ? '' : (payload.fax || ''),
                    email: isEmailStillNull ? '' : (payload.email || '')
                }
             }));
        }
        
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Fehler beim Speichern");
      }
    } catch (err) {
      toast.error("Netzwerkfehler");
    } finally {
      setSavingId(null);
    }
  };

  const openGoogleSearch = (name: string, city: string) => {
    const query = `"${name}" ${city} Pflegeheim Kontakt Email Fax Telefon`;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
  };

  const filteredFacilities = facilities.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (f.city && f.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-neutral-500">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
           <p>Suche nach fehlenden Null-Werten...</p>
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
            <span className="text-primary font-bold text-xl tracking-tight">Lückenkontrolle (Null-Werte)</span>
            <Badge variant="secondary" className="bg-orange-50 text-orange-700 border border-orange-200">
               {facilities.length} Heime zu prüfen
            </Badge>
          </div>
          <div className="relative w-full md:w-64">
             <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
             <Input 
                placeholder="Heim oder Stadt suchen..." 
                className="pl-9 bg-neutral-50 border-neutral-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
             />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl p-4 md:p-8 space-y-6">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-5 flex gap-4 text-orange-800 shadow-sm">
          <AlertCircle className="h-6 w-6 flex-shrink-0 mt-0.5" />
          <div className="text-sm space-y-2">
            <p className="font-bold text-base">Manuelle Nachprüfung erforderlich</p>
            <p>
              Hier werden nur Heime aufgelistet, bei denen noch <strong>keine E-Mail-Adresse</strong> hinterlegt ist (oder "null" drin steht). Andere fehlende Felder (wie Telefon oder Fax) werden hier ignoriert.
            </p>
            <p className="pt-2 text-orange-900 leading-relaxed font-medium">
              Nutze den "Google Search"-Button, um schnell selbst zu recherchieren. Trage den gefundenen Wert in das entsprechende leere Feld ein und klicke "Speichern".
            </p>
          </div>
        </div>

        {facilities.length === 0 ? (
          <div className="text-center py-24 text-neutral-500 bg-white rounded-lg border border-neutral-200 shadow-sm">
             <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-emerald-400" />
             <h3 className="text-xl font-medium text-neutral-900">Alles perfekt!</h3>
             <p className="mt-2 text-neutral-500">Es gibt keine Heime mehr mit unklaren Null-Werten.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-32">
            {filteredFacilities.map((f) => {
              const token = f.edit_token;
              const edits = editValues[token] || { phone: '', fax: '', email: '' };
              const isSaving = savingId === token;

              const isPhoneNull = f.phone === 'null' || f.phone === null;
              const isFaxNull = f.fax === 'null' || f.fax === null;
              const isEmailNull = f.email === 'null' || f.email === null;

              return (
                <Card key={token} className="shadow-sm border-neutral-300 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                  <div className="bg-neutral-100/80 px-4 py-3 border-b border-neutral-200 flex flex-col gap-1">
                    <h4 className="font-bold text-neutral-900 leading-tight truncate" title={f.name}>
                        {f.name}
                    </h4>
                    <span className="text-xs font-medium text-neutral-500">{f.street}, {f.zip} {f.city}</span>
                  </div>
                  <CardContent className="p-4 flex-grow flex flex-col space-y-4">
                    
                    <div className="space-y-4 flex-grow">
                      <div>
                        <Label className={`text-xs ${isPhoneNull ? 'text-orange-600 font-bold' : 'text-neutral-500 font-semibold'}`}>
                           Telefonnummer {isPhoneNull && '(Fehlt)'}
                        </Label>
                        <Input 
                           size={1}
                           className={`h-9 mt-1 transition-all ${isPhoneNull ? 'border-orange-300 bg-orange-50/50 shadow-inner placeholder:text-orange-300/50 text-neutral-900 focus-visible:ring-orange-400 focus-visible:border-orange-400' : 'bg-neutral-50 border-neutral-200 text-neutral-500 opacity-80'}`}
                           value={isPhoneNull ? edits.phone : f.phone}
                           onChange={(e) => handleEditChange(token, 'phone', e.target.value)}
                           readOnly={!isPhoneNull}
                           placeholder={isPhoneNull ? "z.B. 0211 123456" : ""}
                        />
                      </div>
                      
                      <div>
                        <Label className={`text-xs ${isFaxNull ? 'text-orange-600 font-bold' : 'text-neutral-500 font-semibold'}`}>
                           Faxnummer {isFaxNull && '(Fehlt)'}
                        </Label>
                        <Input 
                           size={1}
                           className={`h-9 mt-1 transition-all ${isFaxNull ? 'border-orange-300 bg-orange-50/50 shadow-inner placeholder:text-orange-300/50 text-neutral-900 focus-visible:ring-orange-400 focus-visible:border-orange-400' : 'bg-neutral-50 border-neutral-200 text-neutral-500 opacity-80'}`}
                           value={isFaxNull ? edits.fax : f.fax}
                           onChange={(e) => handleEditChange(token, 'fax', e.target.value)}
                           readOnly={!isFaxNull}
                           placeholder={isFaxNull ? "z.B. 0211 123456-9" : ""}
                        />
                      </div>

                      <div>
                        <Label className={`text-xs ${isEmailNull ? 'text-orange-600 font-bold' : 'text-neutral-500 font-semibold'}`}>
                           E-Mail-Adresse {isEmailNull && '(Fehlt)'}
                        </Label>
                        <Input 
                           size={1}
                           type="email"
                           className={`h-9 mt-1 transition-all ${isEmailNull ? 'border-orange-300 bg-orange-50/50 shadow-inner placeholder:text-orange-300/50 text-neutral-900 focus-visible:ring-orange-400 focus-visible:border-orange-400' : 'bg-neutral-50 border-neutral-200 text-neutral-500 opacity-80'}`}
                           value={isEmailNull ? edits.email : f.email}
                           onChange={(e) => handleEditChange(token, 'email', e.target.value)}
                           readOnly={!isEmailNull}
                           placeholder={isEmailNull ? "z.B. info@heim.de" : ""}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 mt-auto border-t border-neutral-100">
                      <Button 
                         variant="outline" 
                         size="sm" 
                         className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-300 shadow-sm"
                         onClick={() => openGoogleSearch(f.name, f.city)}
                      >
                         <ExternalLink className="w-4 h-4 mr-1.5" />
                         Google Search
                      </Button>
                      <Button 
                         size="sm" 
                         className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                         onClick={() => handleSave(f)}
                         disabled={isSaving || (isPhoneNull && !edits.phone && isFaxNull && !edits.fax && isEmailNull && !edits.email)}
                      >
                         {isSaving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />} 
                         {isSaving ? "Speichert..." : "Speichern"}
                      </Button>
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
