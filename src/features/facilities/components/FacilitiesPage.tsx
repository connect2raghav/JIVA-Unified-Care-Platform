import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2, Clock3, Hospital, Mail, MapPin, Phone, RefreshCw, Search,
  ShieldCheck, Siren, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/useAuthStore';
import type { Facility } from '@/types';
import { facilitiesService } from '../services/facilitiesService';

const FACILITY_TYPES: Array<'All' | Facility['type']> = [
  'All', 'Hospital', 'Trauma Center', 'ICU', 'Blood Bank', 'Pharmacy', 'Diagnostic Lab',
];

const typeStyles: Record<Facility['type'], string> = {
  Hospital: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Trauma Center': 'bg-red-50 text-red-700 border-red-200',
  ICU: 'bg-amber-50 text-amber-700 border-amber-200',
  'Blood Bank': 'bg-rose-50 text-rose-700 border-rose-200',
  Pharmacy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Diagnostic Lab': 'bg-slate-100 text-slate-700 border-slate-200',
};

function matchesFacility(facility: Facility, query: string) {
  const searchable = [facility.name, facility.type, facility.address, facility.distance, ...(facility.specialties ?? [])]
    .join(' ').toLowerCase();
  return searchable.includes(query.trim().toLowerCase());
}

export function FacilitiesPage() {
  const { user } = useAuthStore();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<(typeof FACILITY_TYPES)[number]>('All');
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFacilities = useCallback(async () => {
    if (!user?.clinicId) {
      setFacilities([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setFacilities(await facilitiesService.listByClinic(user.clinicId));
    } catch (loadError) {
      console.error('Failed to load facilities', loadError);
      setError('Facilities could not be loaded right now.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.clinicId]);

  useEffect(() => { void loadFacilities(); }, [loadFacilities]);

  const filteredFacilities = useMemo(
    () => facilities.filter((facility) => {
      const typeMatches = selectedType === 'All' || facility.type === selectedType;
      return typeMatches && (!emergencyOnly || facility.emergencyCapable) && matchesFacility(facility, query);
    }),
    [emergencyOnly, facilities, query, selectedType],
  );
  const emergencyCount = facilities.filter((facility) => facility.emergencyCapable).length;
  const icuBeds = facilities.reduce((total, facility) => total + (facility.icuBedsAvailable ?? 0), 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Care network</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Facilities Directory</h1>
          <p className="mt-1 max-w-2xl text-sm font-medium text-slate-500">Find nearby hospitals, trauma centers, and support facilities for coordinated administrative handoffs.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadFacilities()} className="gap-2 self-start rounded-xl font-bold md:self-auto">
          <RefreshCw className="h-4 w-4" /> Refresh directory
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard icon={Building2} label="Listed facilities" value={facilities.length} tone="indigo" />
        <SummaryCard icon={Siren} label="Emergency capable" value={emergencyCount} tone="red" />
        <SummaryCard icon={Hospital} label="ICU beds listed" value={icuBeds} tone="emerald" />
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search facilities</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, area, or service" className="h-10 rounded-xl pl-9" />
            </label>
            <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700">
              <span className="sr-only">Filter by facility type</span>
              <select value={selectedType} onChange={(event) => setSelectedType(event.target.value as (typeof FACILITY_TYPES)[number])} className="h-full bg-transparent outline-none">
                {FACILITY_TYPES.map((type) => <option key={type} value={type}>{type === 'All' ? 'All facility types' : type}</option>)}
              </select>
            </label>
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={emergencyOnly} onChange={(event) => setEmergencyOnly(event.target.checked)} className="h-4 w-4 accent-emerald-600" />
              Emergency capable
            </label>
          </div>
          <p className="text-xs font-semibold text-slate-400">Showing {filteredFacilities.length} of {facilities.length} facilities</p>
        </CardContent>
      </Card>

      {isLoading && <DirectoryMessage title="Loading facilities" detail="Fetching the clinic's directory." />}
      {!isLoading && error && <DirectoryMessage title={error} detail="Check your connection and try again." action={<Button variant="outline" size="sm" onClick={() => void loadFacilities()}>Try again</Button>} />}
      {!isLoading && !error && filteredFacilities.length === 0 && <DirectoryMessage title={facilities.length === 0 ? 'No facilities listed yet' : 'No facilities match these filters'} detail={facilities.length === 0 ? 'Facilities added for this clinic will appear here.' : 'Adjust the search or filters to view more results.'} />}

      {!isLoading && !error && filteredFacilities.length > 0 && <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{filteredFacilities.map((facility) => <FacilityCard key={facility.id} facility={facility} />)}</div>}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: typeof Building2; label: string; value: number; tone: 'indigo' | 'red' | 'emerald' }) {
  const tones = { indigo: 'bg-indigo-50 text-indigo-700', red: 'bg-red-50 text-red-700', emerald: 'bg-emerald-50 text-emerald-700' };
  return <Card className="rounded-2xl border-slate-200 shadow-sm"><CardContent className="flex items-center gap-3 p-4"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></div><div><p className="text-2xl font-black text-slate-950">{value}</p><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p></div></CardContent></Card>;
}

function FacilityCard({ facility }: { facility: Facility }) {
  return <Card className="rounded-2xl border-slate-200 shadow-sm transition-shadow hover:shadow-md"><CardContent className="space-y-4 p-5"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Building2 className="h-5 w-5" /></div><div className="min-w-0"><h2 className="truncate text-base font-black text-slate-950">{facility.name}</h2><span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${typeStyles[facility.type]}`}>{facility.type}</span></div></div>{facility.emergencyCapable && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700"><ShieldCheck className="h-3.5 w-3.5" /> Emergency</span>}</div><div className="grid gap-2 text-sm font-medium text-slate-600"><p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{facility.address}{facility.distance ? ` · ${facility.distance}` : ''}</p>{facility.operatingHours && <p className="flex gap-2"><Clock3 className="h-4 w-4 shrink-0 text-slate-400" />{facility.operatingHours}</p>}{facility.icuBedsAvailable !== undefined && <p className="flex gap-2"><Users className="h-4 w-4 shrink-0 text-slate-400" />{facility.icuBedsAvailable} ICU beds listed</p>}</div>{facility.specialties && facility.specialties.length > 0 && <div className="flex flex-wrap gap-2">{facility.specialties.map((specialty) => <span key={specialty} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{specialty}</span>)}</div>}<div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">{facility.phone && <a href={`tel:${facility.phone}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Phone className="h-3.5 w-3.5" />Call</a>}{facility.email && <a href={`mailto:${facility.email}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Mail className="h-3.5 w-3.5" />Email</a>}</div></CardContent></Card>;
}

function DirectoryMessage({ title, detail, action }: { title: string; detail: string; action?: React.ReactNode }) {
  return <Card className="rounded-2xl border-dashed border-slate-300 shadow-none"><CardContent className="flex flex-col items-center justify-center gap-2 p-10 text-center"><Building2 className="h-8 w-8 text-slate-300" /><h2 className="text-base font-black text-slate-800">{title}</h2><p className="text-sm font-medium text-slate-500">{detail}</p>{action}</CardContent></Card>;
}