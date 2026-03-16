'use client';

import { useState, useEffect, useRef } from 'react';
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Search, Mail, ExternalLink, CheckCircle2, AlertCircle, MapPin, HeartPulse,
  Sparkles, SlidersHorizontal, Copy, Globe, ChevronUp, ChevronDown,
  ArrowUp, X, Check, Filter, Building
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

// --- Constants ---
const SPECIALTY_OPTIONS = [
  { id: 'junge_pflege', label: 'Junge Pflege (U60)' },
  { id: 'demenz', label: 'Demenz / Geschlossen' },
  { id: 'beatmung', label: 'Beatmung / Phase F' },
  { id: 'palliativ', label: 'Schwerstpflege' },
  { id: 'bariatrisch', label: 'Bariatrisch' },
  { id: 'sucht', label: 'Sucht / Korsakow' },
  { id: 'mrsa', label: 'MRSA Isolierung' },
  { id: 'kultur', label: 'Kultursensibel' },
  { id: 'haustiere', label: 'Haustiere erlaubt' },
];
const SPECIALTY_LABELS: Record<string, string> = {
  junge_pflege: 'Junge Pflege', demenz: 'Demenz', beatmung: 'Beatmung',
  palliativ: 'Palliativ', bariatrisch: 'Bariatrisch', sucht: 'Sucht/Korsakow',
  mrsa: 'MRSA', kultur: 'Kultursensibel', haustiere: 'Haustiere',
};

function getRegion(city: string): string {
  if (!city) return 'Sonstige Regionen (NRW)';
  const c = city.toLowerCase();

  // Region Düsseldorf & Kreis Mettmann
  if (c.includes('düsseldorf') || c.includes('duesseldorf') || c.includes('ratingen') || c.includes('hilden') || c.includes('mettmann') || c.includes('langenfeld') || c.includes('monheim') || c.includes('erkrath') || c.includes('haan') || c.includes('velbert') || c.includes('heiligenhaus') || c.includes('wülfrath')) return 'Region Düsseldorf / Mettmann';

  // Rhein-Kreis Neuss
  if (c.includes('neuss') || c.includes('dormagen') || c.includes('grevenbroich') || c.includes('kaarst') || c.includes('meerbusch') || c.includes('rommerskirchen') || c.includes('jüchen') || c.includes('korschenbroich')) return 'Rhein-Kreis Neuss';

  // Mönchengladbach & Viersen
  if (c.includes('mönchengladbach') || c.includes('mg') || c.includes('viersen') || c.includes('willich') || c.includes('nettetal') || c.includes('kempen') || c.includes('schwalmtal') || c.includes('brüggen') || c.includes('grefrath') || c.includes('tönisvorst') || c.includes('niederkrüchten')) return 'Mönchengladbach / Viersen';

  // Region Köln / Bonn / Rhein-Sieg
  if (c.includes('köln') || c.includes('koeln') || c.includes('bonn') || c.includes('leverkusen') || c.includes('hürth') || c.includes('frechen') || c.includes('pulheim') || c.includes('brühl') || c.includes('wesseling') || c.includes('troisdorf') || c.includes('siegburg') || c.includes('sankt augustin') || c.includes('hennef') || c.includes('königswinter') || c.includes('bornheim') || c.includes('kerpen') || c.includes('erftstadt') || c.includes('bergheim') || c.includes('bedburg')) return 'Region Köln / Bonn / Erft';

  // Ruhrgebiet (West/Mitte/Ost)
  if (c.includes('duisburg') || c.includes('essen') || c.includes('oberhausen') || c.includes('mülheim') || c.includes('bottrop') || c.includes('moers') || c.includes('dinslaken')) return 'Ruhrgebiet (West)';
  if (c.includes('dortmund') || c.includes('bochum') || c.includes('gelsenkirchen') || c.includes('herne') || c.includes('hagen') || c.includes('hamm') || c.includes('unna') || c.includes('recklinghausen') || c.includes('marl') || c.includes('gladbeck') || c.includes('dorsten') || c.includes('castrop') || c.includes('herten')) return 'Ruhrgebiet (Ost/Mitte)';

  // Niederrhein
  if (c.includes('krefeld') || c.includes('wesel') || c.includes('kleve') || c.includes('geldern') || c.includes('goch') || c.includes('emmerich') || c.includes('kevelaer') || c.includes('kamp-lintfort') || c.includes('neukirchen-vluyn')) return 'Niederrhein';

  // Münsterland & OWL
  if (c.includes('münster') || c.includes('muenster') || c.includes('rheine') || c.includes('bocholt') || c.includes('ahlen') || c.includes('warendorf') || c.includes('borken') || c.includes('coesfeld') || c.includes('dülmen') || c.includes('gronau') || c.includes('ibbenbüren')) return 'Münsterland';
  if (c.includes('bielefeld') || c.includes('paderborn') || c.includes('gütersloh') || c.includes('herford') || c.includes('minden') || c.includes('detmold') || c.includes('bünde') || c.includes('bad oeynhausen')) return 'Ostwestfalen-Lippe (OWL)';

  // Aachen / Eifel / Heinsberg
  if (c.includes('aachen') || c.includes('würselen') || c.includes('stolberg') || c.includes('eschweiler') || c.includes('düren') || c.includes('heinsberg') || c.includes('jülich') || c.includes('erkelenz') || c.includes('hückelhoven') || c.includes('geilenkirchen') || c.includes('baesweiler') || c.includes('herzogenrath')) return 'Aachen / Eifel / Heinsberg';

  // Bergisches Land
  if (c.includes('wuppertal') || c.includes('solingen') || c.includes('remscheid') || c.includes('wermelskirchen') || c.includes('radevormwald') || c.includes('wipperfürth') || c.includes('gummersbach')) return 'Bergisches Land';

  // Südwestfalen / Sauerland
  if (c.includes('siegen') || c.includes('lüdenscheid') || c.includes('iserlohn') || c.includes('arnsberg') || c.includes('meschede') || c.includes('olpe') || c.includes('sundern') || c.includes('brilon') || c.includes('schmallenberg')) return 'Südwestfalen / Sauerland';

  return 'Sonstige Regionen (NRW)';
}

// --- Sub-Components ---
function MissingField() {
  return <span className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" />Fehlt</span>;
}

function SortIcon({ field, active, dir }: { field: string; active: string; dir: string }) {
  if (active !== field) return <ChevronUp className="h-3 w-3 text-neutral-300" />;
  return dir === 'asc' ? <ChevronUp className="h-3 w-3 text-primary" /> : <ChevronDown className="h-3 w-3 text-primary" />;
}

// --- Main Dashboard ---
export default function Dashboard() {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [regionFilter, setRegionFilter] = useState<string[]>([]);
  const [offerFilter, setOfferFilter] = useState({ vollstationaer: false, kurzzeit: false });
  const [specialtiesFilter, setSpecialtiesFilter] = useState<Record<string, boolean>>({});
  const [cityFilters, setCityFilters] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState('');
  const [showAllRegions, setShowAllRegions] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  // UI States
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [copiedFax, setCopiedFax] = useState<string | null>(null);

  // Selection & Sort
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'name' | 'city' | 'status'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---
  useEffect(() => {
    fetch('/api/facilities/all-internal')
      .then(res => res.json())
      .then(data => {
        const enriched = data.map((f: any) => ({ ...f, region: getRegion(f.city) }));
        setFacilities(enriched);
        setLoading(false);
      });
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, regionFilter, offerFilter, specialtiesFilter, sortField, sortDir, cityFilters]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // --- Computed ---
  const normalizeStr = (str: string) => str.toLowerCase().replace(/-/g, ' ');

  const filteredFacilities = facilities.filter(f => {
    const matchesSearch = normalizeStr(`${f.name} ${f.city} ${f.zip}`).includes(normalizeStr(searchTerm));
    const isVerified = f.fax_verified_at !== null && f.fax_verified_at !== undefined;
    let matchesStatus = true;
    if (statusFilter === 'verified') matchesStatus = isVerified;
    if (statusFilter === 'unverified') matchesStatus = !isVerified;
    const hasRegionFilter = regionFilter.length > 0;
    const hasCityFilter = cityFilters.length > 0;
    let matchesLocation = true;
    
    if (hasRegionFilter || hasCityFilter) {
      const inRegion = hasRegionFilter && regionFilter.includes(f.region);
      const inCity = hasCityFilter && cityFilters.some(c => (f.city || '').toLowerCase().includes(c.toLowerCase()));
      matchesLocation = inRegion || inCity;
    }

    let matchesOffer = true;
    if (offerFilter.vollstationaer && !f.has_vollstationaer) matchesOffer = false;
    if (offerFilter.kurzzeit && !f.has_kurzzeitpflege) matchesOffer = false;
    const activeSpecs = Object.entries(specialtiesFilter).filter(([_, v]) => v).map(([k]) => k);
    const matchesSpecs = activeSpecs.length === 0 || activeSpecs.every(sp => f.specialties?.[sp]);
    return matchesSearch && matchesStatus && matchesLocation && matchesOffer && matchesSpecs;
  });

  const sortedFacilities = [...filteredFacilities].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'name') cmp = (a.name || '').localeCompare(b.name || '');
    else if (sortField === 'city') cmp = (a.city || '').localeCompare(b.city || '');
    else cmp = (a.fax_verified_at ? 1 : 0) - (b.fax_verified_at ? 1 : 0);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const regionCounts = facilities.reduce((acc, f) => { acc[f.region] = (acc[f.region] || 0) + 1; return acc; }, {} as Record<string, number>);
  const offerCounts = { vollstationaer: facilities.filter(f => f.has_vollstationaer).length, kurzzeit: facilities.filter(f => f.has_kurzzeitpflege).length };
  const specialtyCounts = SPECIALTY_OPTIONS.reduce((acc, s) => { acc[s.id] = facilities.filter(f => f.specialties?.[s.id]).length; return acc; }, {} as Record<string, number>);
  const availableRegions = Array.from(new Set(facilities.map(f => f.region))).sort((a, b) => {
    if (a === 'Andere Region') return 1;
    if (b === 'Andere Region') return -1;
    return a.localeCompare(b);
  });

  const activeSpecialtiesList = Object.entries(specialtiesFilter).filter(([_, v]) => v).map(([k]) => k);
  const hasActiveFilters = regionFilter.length > 0 || cityFilters.length > 0 || offerFilter.vollstationaer || offerFilter.kurzzeit || activeSpecialtiesList.length > 0 || statusFilter !== 'all' || searchTerm !== '';

  const totalPages = Math.ceil(sortedFacilities.length / ITEMS_PER_PAGE);
  const paginatedFacilities = sortedFacilities.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const faxCopySource = selectedIds.size > 0 ? sortedFacilities.filter(f => selectedIds.has(f.edit_token)) : sortedFacilities;
  const faxCopyCount = faxCopySource.filter(f => f.fax && f.fax !== '—' && f.fax.trim() !== '').length;

  // --- Handlers ---
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleCopyFax = () => {
    const numbers = faxCopySource.map(f => f.fax).filter((f: string) => f && f !== '—' && f.trim() !== '');
    const cleaned = numbers.map((n: string) => `${n.replace(/[^0-9]/g, '')}@fax`);
    if (cleaned.length > 0) {
      navigator.clipboard.writeText(cleaned.join('; '))
        .then(() => alert(`${cleaned.length} Faxnummer(n) kopiert!\n\nMuster: ${cleaned[0]}`))
        .catch(err => console.error('Failed to copy', err));
    } else alert('Keine Faxnummern in der Auswahl gefunden.');
  };

  const handleCopySingleFax = (fax: string, token: string) => {
    if (!fax || fax === '—') return;
    navigator.clipboard.writeText(`${fax.replace(/[^0-9]/g, '')}@fax`);
    setCopiedFax(token);
    setTimeout(() => setCopiedFax(null), 1500);
  };

  const toggleSelect = (token: string) => {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(token)) n.delete(token); else n.add(token); return n; });
  };
  const toggleSelectAll = () => {
    setSelectedIds(prev => prev.size === sortedFacilities.length ? new Set() : new Set(sortedFacilities.map(f => f.edit_token)));
  };
  const clearAllFilters = () => {
    setSearchTerm(''); setStatusFilter('all'); setRegionFilter([]); setCityFilters([]);
    setOfferFilter({ vollstationaer: false, kurzzeit: false }); setSpecialtiesFilter({});
  };

  // --- Reusable Filter Sidebar ---
  const renderFilterSidebar = () => {
    
    const primaryRegions = [
      'Rhein-Kreis Neuss',
      'Mönchengladbach / Viersen',
      'Region Düsseldorf / Mettmann'
    ];
    
    const sortedAvailableRegions = [...availableRegions].sort((a, b) => {
      const aIsPrimary = primaryRegions.includes(a);
      const bIsPrimary = primaryRegions.includes(b);
      if (aIsPrimary && !bIsPrimary) return -1;
      if (!aIsPrimary && bIsPrimary) return 1;
      if (a === 'Sonstige Regionen (NRW)') return 1;
      if (b === 'Sonstige Regionen (NRW)') return -1;
      return a.localeCompare(b);
    });

    const visibleRegions = showAllRegions 
      ? sortedAvailableRegions 
      : sortedAvailableRegions.filter(r => primaryRegions.includes(r) || regionFilter.includes(r));

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-neutral-900">Filter</h2>
          </div>
          {hasActiveFilters && (
            <button onClick={clearAllFilters} className="text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer">Alle zurücksetzen</button>
          )}
        </div>

        {/* Region */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-neutral-700"><MapPin className="h-4 w-4" /> Such-Region</h3>
          <div className="space-y-1">
            {visibleRegions.map(region => (
              <label key={region} className="flex items-center justify-between text-sm text-neutral-600 cursor-pointer p-1.5 hover:bg-neutral-100 rounded-md transition-colors">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded border-gray-300 accent-primary cursor-pointer"
                    checked={regionFilter.includes(region)}
                    onChange={e => e.target.checked ? setRegionFilter(p => [...p, region]) : setRegionFilter(p => p.filter(r => r !== region))} />
                  <span>{region}</span>
                </div>
                <span className="text-xs text-neutral-400 tabular-nums">({regionCounts[region] || 0})</span>
              </label>
            ))}

            {sortedAvailableRegions.length > visibleRegions.length && !showAllRegions && (
              <button 
                onClick={() => setShowAllRegions(true)}
                className="mt-2 text-xs font-medium text-primary hover:text-blue-700 flex items-center w-full justify-center py-1.5 rounded bg-blue-50/50 hover:bg-blue-50 cursor-pointer transition-colors"
                type="button"
              >
                + {sortedAvailableRegions.length - visibleRegions.length} weitere Regionen anzeigen
              </button>
            )}
            
            {showAllRegions && sortedAvailableRegions.length > primaryRegions.length && (
              <button 
                onClick={() => setShowAllRegions(false)}
                className="mt-2 text-xs font-medium text-neutral-500 hover:text-neutral-700 flex items-center w-full justify-center py-1.5 cursor-pointer transition-colors"
                type="button"
              >
                Weniger anzeigen <ChevronUp className="h-3 w-3 ml-1" />
              </button>
            )}
          </div>
      </div>
      <hr className="border-neutral-200" />

      {/* Specific City */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-neutral-700"><Building className="h-4 w-4" /> Gezielte Städte</h3>
        <div className="space-y-2 relative">
          <div className="flex gap-2">
            <Input 
              placeholder="Stadtname (Enter)" 
              value={cityInput}
              onChange={e => {
                setCityInput(e.target.value);
                setShowCitySuggestions(true);
              }}
              onFocus={() => setShowCitySuggestions(true)}
              onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
              onKeyDown={e => {
                if (e.key === 'Enter' && cityInput.trim()) {
                  e.preventDefault();
                  if (!cityFilters.includes(cityInput.trim())) setCityFilters(p => [...p, cityInput.trim()]);
                  setCityInput('');
                  setShowCitySuggestions(false);
                }
              }}
              className="h-8 text-sm placeholder:text-neutral-400"
            />
            <Button size="sm" variant="secondary" className="h-8 cursor-pointer px-2 text-xs" onClick={() => {
              if (cityInput.trim() && !cityFilters.includes(cityInput.trim())) {
                setCityFilters(p => [...p, cityInput.trim()]);
                setCityInput('');
                setShowCitySuggestions(false);
              }
            }}>Hinzufügen</Button>
          </div>
          {showCitySuggestions && cityInput.trim().length > 0 && (
            <div className="absolute top-9 left-0 right-20 bg-white border border-neutral-200 shadow-xl rounded-md max-h-48 overflow-y-auto z-[60]">
              {Array.from(new Set(facilities.map(f => f.city)))
                .filter((c: any) => c && c.toLowerCase().includes(cityInput.toLowerCase()))
                .filter((c: any) => !cityFilters.includes(c))
                .sort()
                .slice(0, 10).map((c: any) => (
                <div 
                  key={c} 
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-neutral-100 transition-colors"
                  onMouseDown={(e) => {
                    e.preventDefault(); 
                    if (!cityFilters.includes(c)) setCityFilters(p => [...p, c]);
                    setCityInput('');
                    setShowCitySuggestions(false);
                  }}
                >
                  {c}
                </div>
              ))}
            </div>
          )}
          {cityFilters.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {cityFilters.map(c => (
                <Badge key={c} variant="secondary" className="bg-purple-50 text-purple-700 font-normal border-purple-200 gap-1 pr-1 cursor-pointer hover:bg-purple-100">
                  {c} <button onClick={() => setCityFilters(p => p.filter(x => x !== c))} className="ml-0.5 p-0.5 hover:bg-purple-200 rounded cursor-pointer"><X className="h-3 w-3 cursor-pointer" /></button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      <hr className="border-neutral-200" />

      {/* Pflegeart */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-neutral-700"><HeartPulse className="h-4 w-4" /> Pflegeart</h3>
        <div className="space-y-1">
          {[
            { key: 'vollstationaer' as const, label: 'Vollstationäre Pflege', count: offerCounts.vollstationaer },
            { key: 'kurzzeit' as const, label: 'Kurzzeitpflege-Plätze', count: offerCounts.kurzzeit },
          ].map(o => (
            <label key={o.key} className="flex items-center justify-between text-sm text-neutral-600 cursor-pointer p-1.5 hover:bg-neutral-100 rounded-md transition-colors">
              <div className="flex items-center space-x-2">
                <input type="checkbox" className="rounded border-gray-300 accent-primary cursor-pointer"
                  checked={offerFilter[o.key]} onChange={e => setOfferFilter(p => ({ ...p, [o.key]: e.target.checked }))} />
                <span>{o.label}</span>
              </div>
              <span className="text-xs text-neutral-400 tabular-nums">({o.count})</span>
            </label>
          ))}
        </div>
      </div>
      <hr className="border-neutral-200" />

      {/* Schwerpunkte */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-neutral-700"><Sparkles className="h-4 w-4" /> Schwerpunkte</h3>
        <div className="space-y-1">
          {SPECIALTY_OPTIONS.map(spec => {
            const count = specialtyCounts[spec.id] || 0;
            return (
              <label key={spec.id} className={`flex items-center justify-between text-sm cursor-pointer p-1.5 hover:bg-neutral-100 rounded-md transition-colors ${count === 0 ? 'text-neutral-400' : 'text-neutral-600'}`}>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded border-gray-300 accent-primary cursor-pointer" disabled={count === 0}
                    checked={!!specialtiesFilter[spec.id]} onChange={e => setSpecialtiesFilter(p => ({ ...p, [spec.id]: e.target.checked }))} />
                  <span>{spec.label}</span>
                </div>
                <span className="text-xs text-neutral-400 tabular-nums">({count})</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
    );
  };

  // --- Fax Display (click-to-copy) ---
  const formatPhoneNumber = (num: string) => {
    if (!num || num === '—') return num;
    // Remove all non-digit characters except + 
    let cleaned = num.replace(/[^\d+]/g, '');
    
    // Convert +49 or 0049 to 0
    if (cleaned.startsWith('+49')) {
      cleaned = '0' + cleaned.substring(3);
    } else if (cleaned.startsWith('0049')) {
      cleaned = '0' + cleaned.substring(4);
    }

    // German formatting: 0XXXX / XXXXXX
    // Match a typical 4- or 5-digit area code starting with 0
    const match = cleaned.match(/^(0\d{3,4})(\d+)$/);
    if (match) {
      return `${match[1]} / ${match[2]}`;
    }
    return num; // fallback if regex doesn't match
  };

  const FaxDisplay = ({ fax, token }: { fax: string; token: string }) => {
    if (!fax || fax === '—' || fax.trim() === '') return <MissingField />;
    const isCopied = copiedFax === token;
    const formattedFax = formatPhoneNumber(fax);
    return (
      <button onClick={() => handleCopySingleFax(fax, token)} title="Klicken zum Kopieren"
        className={`font-mono text-sm px-2 py-0.5 rounded border transition-all inline-flex items-center gap-1.5 cursor-pointer ${
          isCopied ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-blue-50 hover:border-blue-200'
        }`}>
        {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3 opacity-40" />}
        {formattedFax}
      </button>
    );
  };

  // --- Status Badge ---
  const StatusBadge = ({ facility }: { facility: any }) => {
    const isVerified = facility.fax_verified_at !== null && facility.fax_verified_at !== undefined;
    return (
      <div className="flex flex-col items-start gap-1">
        {isVerified ? (
          <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-1 rounded w-max text-xs font-medium border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" /><span>Aktuell</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2 py-1 rounded w-max text-xs font-medium border border-amber-200">
            <AlertCircle className="h-3.5 w-3.5" /><span>Ungeprüft</span>
          </div>
        )}
        {isVerified && <span className="text-[11px] text-neutral-400 font-medium ml-1 mt-0.5">{new Date(facility.fax_verified_at).toLocaleDateString('de-DE')}</span>}
      </div>
    );
  };

  // --- Active Filter Chips ---
  const FilterChips = () => {
    if (!hasActiveFilters) return null;
    return (
      <div className="flex flex-wrap gap-2 items-center bg-white px-4 py-3 rounded-lg border border-neutral-200 shadow-sm">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mr-1">Aktive Filter:</span>
        {regionFilter.map(r => (
          <Badge key={r} variant="secondary" className="bg-blue-50 text-blue-700 border border-blue-200 gap-1 pr-1 cursor-pointer hover:bg-blue-100">
            <MapPin className="h-3 w-3" />{r}
            <button onClick={() => setRegionFilter(p => p.filter(x => x !== r))} className="ml-0.5 p-0.5 hover:bg-blue-200 rounded cursor-pointer"><X className="h-3 w-3 cursor-pointer" /></button>
          </Badge>
        ))}
        {cityFilters.map(c => (
          <Badge key={c} variant="secondary" className="bg-purple-50 text-purple-700 border border-purple-200 gap-1 pr-1 cursor-pointer hover:bg-purple-100">
            <Building className="h-3 w-3" />Stadt: {c}
            <button onClick={() => setCityFilters(p => p.filter(x => x !== c))} className="ml-0.5 p-0.5 hover:bg-purple-200 rounded cursor-pointer"><X className="h-3 w-3 cursor-pointer" /></button>
          </Badge>
        ))}
        {offerFilter.vollstationaer && (
          <Badge variant="secondary" className="bg-purple-50 text-purple-700 border border-purple-200 gap-1 pr-1 cursor-pointer hover:bg-purple-100">
            Vollstationär<button onClick={() => setOfferFilter(p => ({ ...p, vollstationaer: false }))} className="ml-0.5 p-0.5 hover:bg-purple-200 rounded"><X className="h-3 w-3" /></button>
          </Badge>
        )}
        {offerFilter.kurzzeit && (
          <Badge variant="secondary" className="bg-purple-50 text-purple-700 border border-purple-200 gap-1 pr-1 cursor-pointer hover:bg-purple-100">
            Kurzzeitpflege<button onClick={() => setOfferFilter(p => ({ ...p, kurzzeit: false }))} className="ml-0.5 p-0.5 hover:bg-purple-200 rounded"><X className="h-3 w-3" /></button>
          </Badge>
        )}
        {activeSpecialtiesList.map(sp => (
          <Badge key={sp} variant="secondary" className="bg-amber-50 text-amber-700 border border-amber-200 gap-1 pr-1 cursor-pointer hover:bg-amber-100">
            {SPECIALTY_LABELS[sp] || sp}<button onClick={() => setSpecialtiesFilter(p => ({ ...p, [sp]: false }))} className="ml-0.5 p-0.5 hover:bg-amber-200 rounded"><X className="h-3 w-3" /></button>
          </Badge>
        ))}
        {statusFilter !== 'all' && (
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-200 gap-1 pr-1 cursor-pointer hover:bg-emerald-100">
            {statusFilter === 'verified' ? 'Nur Aktuelle' : 'Nur Ungeprüfte'}<button onClick={() => setStatusFilter('all')} className="ml-0.5 p-0.5 hover:bg-emerald-200 rounded"><X className="h-3 w-3" /></button>
          </Badge>
        )}
        {searchTerm && (
          <Badge variant="secondary" className="bg-neutral-100 text-neutral-700 border border-neutral-300 gap-1 pr-1 cursor-pointer hover:bg-neutral-200">
            Suche: &quot;{searchTerm}&quot;<button onClick={() => setSearchTerm('')} className="ml-0.5 p-0.5 hover:bg-neutral-300 rounded cursor-pointer"><X className="h-3 w-3 cursor-pointer" /></button>
          </Badge>
        )}
        <button onClick={clearAllFilters} className="text-xs text-red-600 hover:text-red-700 font-medium ml-2 hover:underline cursor-pointer">Alle zurücksetzen</button>
      </div>
    );
  };

  // --- Empty State ---
  const EmptyState = ({ colSpan }: { colSpan?: number }) => (
    <div className="flex flex-col items-center gap-3 text-neutral-500 py-12">
      <Search className="h-8 w-8 text-neutral-300" />
      <div className="text-center">
        <p className="font-medium">Keine Einrichtungen gefunden</p>
        <p className="text-sm mt-1">Versuche andere Filter oder Suchbegriffe.</p>
      </div>
      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-2 gap-1"><X className="h-3 w-3" />Filter zurücksetzen</Button>
      )}
    </div>
  );

  // ======================== RENDER ========================
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-primary font-bold text-xl tracking-tight">Pflegeplatz-Portal</span>
          <div className="text-sm font-medium text-neutral-500 bg-neutral-100 px-3 py-1.5 rounded-md border">Einrichtungs-Dashboard</div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {isMobileFilterOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 xl:hidden" onClick={() => setIsMobileFilterOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white z-50 p-5 overflow-y-auto shadow-xl xl:hidden animate-slide-in-left">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-lg">Filter</span>
              <button onClick={() => setIsMobileFilterOpen(false)} className="p-1 hover:bg-neutral-100 rounded cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            {renderFilterSidebar()}
          </div>
        </>
      )}

      <main className="p-4 md:p-8 flex flex-col xl:flex-row gap-6 items-start">
        {/* Desktop Filter Sidebar */}
        <div className={`transition-all duration-300 ease-in-out flex-shrink-0 hidden xl:block ${isFilterOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
          <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm sticky top-6 w-64">
            {renderFilterSidebar()}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 w-full min-w-0 space-y-4">
          {/* Top Bar */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-lg border border-neutral-200 shadow-sm">
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-primary">Pflegeplatz Suche</h2>
              <p className="text-sm text-neutral-500">
                {selectedIds.size > 0
                  ? `${selectedIds.size} ausgewählt von ${sortedFacilities.length} Einrichtungen`
                  : `${sortedFacilities.length} ${sortedFacilities.length === 1 ? 'Einrichtung' : 'Einrichtungen'}${regionFilter.length > 0 ? ` in ${regionFilter.length} Regionen` : ''}`}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto items-center">
              <Button onClick={() => setIsMobileFilterOpen(true)} variant="outline" className="xl:hidden w-full sm:w-auto gap-2 cursor-pointer">
                <Filter className="h-4 w-4" />Filter
                {hasActiveFilters && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{regionFilter.length + (offerFilter.vollstationaer ? 1 : 0) + (offerFilter.kurzzeit ? 1 : 0) + activeSpecialtiesList.length}</Badge>}
              </Button>
              <Button onClick={() => setIsFilterOpen(!isFilterOpen)} variant="outline" className="hidden xl:flex w-full sm:w-auto gap-2 text-neutral-700 cursor-pointer">
                <SlidersHorizontal className="h-4 w-4" />{isFilterOpen ? 'Filter ausblenden' : 'Filter einblenden'}
              </Button>
              <Button onClick={handleCopyFax} variant="default" className="w-full sm:w-auto gap-2 bg-primary text-white cursor-pointer">
                <Copy className="h-4 w-4" />{faxCopyCount} Faxnummern kopieren
              </Button>
              <div className="w-full sm:w-64 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                <Input ref={searchInputRef} placeholder='Name, Ort suchen... ( / )' className="pl-9 bg-neutral-50" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex bg-neutral-100 p-1 rounded-md text-sm border border-neutral-200 flex-shrink-0 cursor-pointer">
                <button className={`px-3 py-1.5 rounded transition-all cursor-pointer ${statusFilter === 'all' ? 'bg-white shadow-sm font-medium text-primary' : 'text-neutral-500 hover:text-neutral-700'}`} onClick={() => setStatusFilter('all')}>Alle</button>
                <button className={`px-3 py-1.5 rounded flex items-center gap-1 transition-all cursor-pointer ${statusFilter === 'verified' ? 'bg-white shadow-sm font-medium text-emerald-700' : 'text-neutral-500 hover:text-neutral-700'}`} onClick={() => setStatusFilter('verified')}>
                  <CheckCircle2 className="h-3 w-3" />Aktuell
                </button>
              </div>
            </div>
          </div>

          {/* Filter Chips */}
          <FilterChips />

          {/* ===== DESKTOP TABLE ===== */}
          <Card className="shadow-sm border border-neutral-200 rounded-lg hidden xl:block">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
              ) : (
                <div className="max-h-[75vh] overflow-y-auto">
                  <Table className="w-full table-fixed">
                    <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_theme(colors.neutral.200)]">
                      <TableRow>
                        <TableHead className="w-12 pl-4">
                          <input type="checkbox" className="rounded border-gray-300 accent-primary cursor-pointer" checked={selectedIds.size === sortedFacilities.length && sortedFacilities.length > 0} onChange={toggleSelectAll} title="Alle auswählen" />
                        </TableHead>
                        <TableHead className="w-[35%] text-neutral-500 font-medium cursor-pointer select-none hover:text-primary" onClick={() => handleSort('name')}>
                          <div className="flex items-center gap-1">Einrichtung & Standort <SortIcon field="name" active={sortField} dir={sortDir} /></div>
                        </TableHead>
                        <TableHead className="w-[30%] text-neutral-500 font-medium">Kontakt</TableHead>
                        <TableHead className="w-[15%] text-neutral-500 font-medium">Kategorien</TableHead>
                        <TableHead className="w-[15%] text-neutral-500 font-medium cursor-pointer select-none hover:text-primary" onClick={() => handleSort('status')}>
                          <div className="flex items-center gap-1">Aktualität <SortIcon field="status" active={sortField} dir={sortDir} /></div>
                        </TableHead>
                        <TableHead className="w-10 pr-4"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedFacilities.map((f: any) => {
                        const isSelected = selectedIds.has(f.edit_token);
                        return (
                          <TableRow key={f.edit_token} className={`transition-colors ${isSelected ? 'bg-blue-50/70' : 'hover:bg-blue-50/30 even:bg-neutral-50/70'}`}>
                            <TableCell className="align-top pl-4 py-4" onClick={() => toggleSelect(f.edit_token)}>
                              <input type="checkbox" className="rounded border-gray-300 accent-primary cursor-pointer" checked={isSelected} onChange={() => {}} onClick={(e) => e.stopPropagation()} />
                            </TableCell>
                            <TableCell className="align-top py-4">
                              <div className="font-semibold text-neutral-900 text-base leading-tight break-words pr-4">{f.name}</div>
                              <div className="text-neutral-500 text-sm mt-1">{f.zip} {f.city}</div>
                              {f.street && <div className="text-neutral-400 text-xs mt-0.5">{f.street}</div>}
                            </TableCell>
                            <TableCell className="align-top py-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 w-8">Fax:</span>
                                  <FaxDisplay fax={f.fax} token={f.edit_token} />
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 w-8">Tel:</span>
                                  {f.phone ? <span className="text-neutral-700">{formatPhoneNumber(f.phone)}</span> : <MissingField />}
                                </div>
                                {f.email && (
                                  <div className="flex gap-2 text-sm mt-1">
                                    <Mail className="h-3.5 w-3.5 text-neutral-400 mt-[3px] flex-shrink-0" />
                                    <a href={`mailto:${f.email}`} className="text-primary hover:underline text-sm truncate max-w-[180px]" title={f.email}>{f.email}</a>
                                  </div>
                                )}
                                {f.website && f.website !== '—' && f.website.trim() !== '' && (
                                  <div className="flex gap-2 text-sm mt-1">
                                    <Globe className="h-3.5 w-3.5 text-neutral-400 mt-[3px] flex-shrink-0" />
                                    <a href={f.website.startsWith('http') ? f.website : `https://${f.website}`} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm truncate max-w-[180px]">Website</a>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="align-top py-4">
                              <div className="flex flex-col gap-1.5 items-start">
                                {f.has_vollstationaer && <Badge variant="outline" className="border-primary text-primary font-medium">Stationär</Badge>}
                                {f.has_kurzzeitpflege && <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-none font-medium">Kurzzeitpflege</Badge>}
                                {f.specialties && Object.entries(f.specialties).filter(([_, v]) => v).length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {Object.entries(f.specialties).filter(([_, v]) => v).map(([k]) => (
                                      <Badge key={k} variant="secondary" className="bg-neutral-100 text-neutral-600 font-normal text-[10px] px-1.5 py-0 border border-neutral-200">{SPECIALTY_LABELS[k] || k}</Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="align-top py-4"><StatusBadge facility={f} /></TableCell>
                            <TableCell className="text-right align-top pr-4 py-4">
                              <a href={`/edit/${f.edit_token}`} target="_blank" rel="noreferrer" title="Profil öffnen">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-primary hover:bg-primary/5"><ExternalLink className="h-4 w-4" /></Button>
                              </a>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {sortedFacilities.length === 0 && !loading && (
                        <TableRow><TableCell colSpan={6}><EmptyState /></TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {totalPages > 1 && (
                    <div className="flex justify-between items-center py-4 px-6 border-t border-neutral-200 bg-neutral-50/50">
                      <div className="text-sm text-neutral-500">
                        Zeige {((currentPage - 1) * ITEMS_PER_PAGE) + 1} bis {Math.min(currentPage * ITEMS_PER_PAGE, sortedFacilities.length)} von {sortedFacilities.length} Einträgen
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === 1}>Zurück</Button>
                        <div className="flex items-center px-2 text-sm font-medium text-neutral-700">Seite {currentPage} von {totalPages}</div>
                        <Button variant="outline" size="sm" onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === totalPages}>Weiter</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ===== MOBILE CARD LAYOUT ===== */}
          <div className="xl:hidden space-y-3">
            {loading ? (
              <div className="space-y-3"><Skeleton className="h-32 w-full rounded-lg" /><Skeleton className="h-32 w-full rounded-lg" /><Skeleton className="h-32 w-full rounded-lg" /></div>
            ) : sortedFacilities.length === 0 ? (
              <Card><CardContent className="p-6"><EmptyState /></CardContent></Card>
            ) : (
              <>
              {paginatedFacilities.map((f: any) => {
                const isSelected = selectedIds.has(f.edit_token);
                return (
                  <Card key={f.edit_token} className={`shadow-sm border transition-colors cursor-pointer ${isSelected ? 'border-blue-300 bg-blue-50/50' : 'border-neutral-200 hover:border-blue-300 hover:bg-blue-50/30'}`} onClick={() => toggleSelect(f.edit_token)}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" className="rounded border-gray-300 accent-primary mt-1 cursor-pointer" checked={isSelected} onChange={() => {}} onClick={(e) => e.stopPropagation()} />
                        <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <h3 className="font-semibold text-neutral-900 leading-tight">{f.name}</h3>
                              <p className="text-sm text-neutral-500 mt-0.5">{f.street && `${f.street}, `}{f.zip} {f.city}</p>
                            </div>
                            <StatusBadge facility={f} />
                          </div>

                          <div className="mt-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-neutral-400 w-8">FAX:</span>
                              <FaxDisplay fax={f.fax} token={f.edit_token} />
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-xs font-semibold text-neutral-400 w-8">TEL:</span>
                              {f.phone ? <span className="text-neutral-700">{formatPhoneNumber(f.phone)}</span> : <MissingField />}
                            </div>
                            {f.email && (
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" />
                                <a href={`mailto:${f.email}`} className="text-primary hover:underline truncate">{f.email}</a>
                              </div>
                            )}
                          </div>

                          {(f.has_vollstationaer || f.has_kurzzeitpflege) && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {f.has_vollstationaer && <Badge variant="outline" className="border-primary text-primary text-xs">Stationär</Badge>}
                              {f.has_kurzzeitpflege && <Badge className="bg-secondary text-secondary-foreground text-xs shadow-none">Kurzzeitpflege</Badge>}
                            </div>
                          )}

                          <div className="mt-3 pt-2 border-t border-neutral-100 flex justify-end">
                            <a href={`/edit/${f.edit_token}`} target="_blank" rel="noreferrer">
                              <Button variant="ghost" size="sm" className="text-xs text-neutral-500 hover:text-primary gap-1">
                                Profil <ExternalLink className="h-3 w-3" />
                              </Button>
                            </a>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {totalPages > 1 && (
                <div className="flex justify-between items-center py-4 px-2">
                  <Button variant="outline" size="sm" onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === 1}>Zurück</Button>
                  <div className="text-sm font-medium text-neutral-700">Seite {currentPage} von {totalPages}</div>
                  <Button variant="outline" size="sm" onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === totalPages}>Weiter</Button>
                </div>
              )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Scroll-to-Top */}
      {showScrollTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-30 bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary/90 transition-all animate-fade-in-up">
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
