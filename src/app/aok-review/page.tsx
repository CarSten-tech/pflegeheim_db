"use client";

import { useEffect, useState } from "react";
import { Check, Edit2, Loader2, AlertCircle } from "lucide-react";

interface Conflict {
  name: string;
  zip: string;
  city: string;
  ourEmail: string;
  aokEmail: string;
  aiRecommendation?: string;
  aiReasoning?: string;
}

export default function AokReviewPage() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customEmail, setCustomEmail] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchConflicts();
  }, []);

  const fetchConflicts = async () => {
    try {
      const res = await fetch("/api/aok-conflicts");
      if (res.ok) {
        const data = await res.json();
        setConflicts(data);
      }
    } catch (err) {
      console.error("Failed to fetch conflicts", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (conflict: Conflict, chosenEmail: string) => {
    const id = `${conflict.zip}-${conflict.name}`;
    setSaving(id);
    try {
      const res = await fetch("/api/aok-conflicts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: conflict.name,
          zip: conflict.zip,
          chosenEmail,
        }),
      });

      if (res.ok) {
        setConflicts((prev) =>
          prev.filter((c) => c.name !== conflict.name || c.zip !== conflict.zip)
        );
        setEditingId(null);
      }
    } catch (err) {
      console.error("Failed to resolve conflict", err);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-amber-500" />
            AOK E-Mail Abgleich
          </h1>
          <p className="text-slate-600 mt-2">
            Entscheide für die folgenden {conflicts.length} Heime, welche E-Mail-Adresse in die Datenbank übernommen werden soll.
          </p>
        </div>

        {conflicts.length === 0 ? (
          <div className="bg-green-50 text-green-700 p-8 rounded-xl border border-green-200 text-center font-medium shadow-sm">
            🎉 Alle E-Mail-Konflikte wurden erfolgreich gelöst!
          </div>
        ) : (
          <div className="grid gap-4">
            {conflicts.map((conflict, index) => {
              const domId = `${conflict.zip}-${conflict.name}-${index}`;
              const isSaving = saving === domId;
              const isEditing = editingId === domId;

              return (
                <div
                  key={domId}
                  className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all hover:shadow-md"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">
                        {conflict.name}
                      </h3>
                      <p className="text-sm text-slate-500 font-medium">
                        {conflict.zip} {conflict.city}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 flex flex-col">
                      <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                        Unsere Datenbank
                      </div>
                      <div className="font-medium text-slate-800 break-all mb-4 flex-1">
                        {conflict.ourEmail || "—"}
                      </div>
                      <button
                        onClick={() => handleResolve(conflict, conflict.ourEmail)}
                        disabled={isSaving}
                        className="w-full mt-auto flex items-center justify-center gap-2 px-4 py-2 bg-white text-blue-700 font-medium rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors disabled:opacity-50"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Unsere behalten
                      </button>
                    </div>

                    <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-100 flex flex-col">
                      <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">
                        AOK System
                      </div>
                      <div className="font-medium text-slate-800 break-all mb-4 flex-1">
                        {conflict.aokEmail || "—"}
                      </div>
                      <button
                        onClick={() => handleResolve(conflict, conflict.aokEmail)}
                        disabled={isSaving}
                        className="w-full mt-auto flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 shadow-sm"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        AOK übernehmen
                      </button>
                    </div>
                  </div>

                  {conflict.aiRecommendation && (
                    <div className="bg-purple-50/50 p-4 rounded-lg border border-purple-200 flex flex-col mb-6">
                      <div className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                        ✨ KI Empfehlung
                      </div>
                      <div className="font-medium text-slate-800 break-all mb-1 text-lg">
                        {conflict.aiRecommendation}
                      </div>
                      <div className="text-sm text-purple-700/80 italic mb-4 flex-1">
                        Begründung: {conflict.aiReasoning}
                      </div>
                      <button
                        onClick={() => handleResolve(conflict, conflict.aiRecommendation!)}
                        disabled={isSaving}
                        className="w-full mt-auto flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "KI Empfehlung übernehmen"
                        )}
                      </button>
                    </div>
                  )}

                  {isEditing ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="email"
                        autoFocus
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        placeholder="E-Mail manuell eingeben..."
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                      <button
                        onClick={() => handleResolve(conflict, customEmail)}
                        disabled={isSaving || !customEmail}
                        className="px-6 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Speichern"
                        )}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-medium flex items-center justify-center"
                      >
                        Abbrechen
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setCustomEmail(conflict.ourEmail);
                        setEditingId(domId);
                      }}
                      className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-2 transition-colors ml-1"
                    >
                      <Edit2 className="w-4 h-4" />
                      Manuelle Eingabe verwenden
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
