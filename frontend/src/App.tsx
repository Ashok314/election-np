import { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Doughnut } from 'react-chartjs-2';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import 'leaflet/dist/leaflet.css';
import './index.css';
import districtsData from './data/districts.json';
import InsightCards from './components/InsightCards';
import PRHighlights from './components/PRHighlights';
import { mapRow } from './lib/supabase'; // { supabase, mapRow }

const ElectionMap = lazy(() => import('./components/ElectionMap'));

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

// Create a lookup for District ID -> Name & Nepali Name
const districtLookup: Record<number, string> = {};
const districtLookupNp: Record<number, string> = {};
districtsData.forEach((d: any) => {
  districtLookup[d.id] = d.name;
  districtLookupNp[d.id] = d.name_np || d.name;
});

// Define expected Types
export interface CandidateResult {
  MetaDistId: number;
  MetaConstId: number;
  CandidateName: string;
  PoliticalPartyName: string;
  TotalVoteReceived: number;
  Remarks: string;
  Gender?: string;
  Age?: number;
}

// Custom colors for popular parties (Nepali API names)
const PARTY_COLORS: Record<string, string> = {
  "Nepali Congress": "#10b981",
  "CPN (UML)": "#ef4444",
  "CPN (Maoist Center)": "#b91c1c",
  "Rastriya Swatantra Party": "#3b82f6",
  "Rastriya Prajatantra Party": "#eab308",
  "Janata Samajwadi Party": "#ec4899",
  "Independent": "#8b5cf6",
  "नेपाली काँग्रेस": "#10b981",
  "नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी)": "#ef4444",
  "नेपाल कम्युनिष्ट पार्टी (माओवादी केन्द्र)": "#b91c1c",
  "राष्ट्रिय स्वतन्त्र पार्टी": "#3b82f6",
  "राष्ट्रिय प्रजातन्त्र पार्टी": "#eab308",
  "जनता समाजवादी पार्टी, नेपाल": "#ec4899",
  "श्रम संस्कृति पार्टी": "#f97316",
  "स्वतन्त्र": "#8b5cf6",
};

const getPartyColor = (party: string) => PARTY_COLORS[party] || "#64748b";

function App() {
  const [lastUpdated, setLastUpdated] = useState<string>('—');
  const [overallStats, setOverallStats] = useState<Record<string, { leads: number, won: number }>>({});
  const [leaders, setLeaders] = useState<CandidateResult[]>([]);
  const [allCandidates, setAllCandidates] = useState<CandidateResult[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [lang, setLang] = useState<'np' | 'en'>('np');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [liveStatus, setLiveStatus] = useState<'connecting' | 'live' | 'polling'>('connecting');
  const [prByDistrict, setPRByDistrict] = useState<{ dist_id: number; const_id: number; party_name: string; total_votes: number }[]>([]);
  const [prData, setPRData] = useState<{ party_name: string; total_votes: number }[]>([]);
  const [mapMode, setMapMode] = useState<'fptp' | 'pr'>('fptp');
  const [prSearchTerm, setPrSearchTerm] = useState('');
  const [prSortBy, setPrSortBy] = useState<'name' | 'votes' | 'best-district'>('votes');
  const { width, height } = useWindowSize();
  // const channelRef = useRef<any>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Process raw rows into leaders + stats
  function processData(data: CandidateResult[]) {
    if (!data.length) return;
    setAllCandidates(data);
    // Explicitly lock the timezone logic to Nepal (NPT) regardless of the host server location (e.g. JST)
    const nptTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kathmandu',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(new Date());
    setLastUpdated(`${nptTime} NPT`);

    const leaderMap: Record<string, CandidateResult> = {};
    data.forEach(c => {
      const key = `${c.MetaDistId} -${c.MetaConstId} `;
      const cur = leaderMap[key];
      if (!cur || (c.TotalVoteReceived || 0) > (cur.TotalVoteReceived || 0)) leaderMap[key] = c;
    });
    const leaderList = Object.values(leaderMap).sort(
      (a, b) => (b.TotalVoteReceived || 0) - (a.TotalVoteReceived || 0)
    );
    setLeaders(leaderList);

    const statsObj: Record<string, { leads: number, won: number }> = {};
    leaderList.forEach(c => {
      const p = c.PoliticalPartyName || 'Independent/Others';
      if (!statsObj[p]) statsObj[p] = { leads: 0, won: 0 };
      if (c.Remarks === 'Elected' || c.Remarks === 'निर्वाचित') statsObj[p].won += 1;
      else statsObj[p].leads += 1;
    });
    setOverallStats(statsObj);
  }

  // Initial load from Supabase or local backend
  async function loadData() {
    // Option 1: Supabase (COMMENTED OUT FOR HOTFIX)
    /*
    if (supabase) {
      const { data, error } = await supabase
        .from('election_results')
        .select('dist_id,const_id,candidate_name,party_name,votes,remarks,gender,age')
        .order('votes', { ascending: false });
      if (!error && data && data.length > 0) {
        processData((data as any[]).map(mapRow));
        return;
      }
    }
    */

    // Option 2: Local backend fallback (dev)
    try {
      setLiveStatus('connecting');
      // HOTFIX: Read data directly from GitHub's raw server on the hotfix branch to decouple data updates from UI builds
      const url = `https://raw.githubusercontent.com/Ashok314/election-np/hotfix-local-scrape/frontend/public/data/all-results.json`;
      const res = await fetch(url + `?t=${new Date().getTime()}`); // Cache-bust
      const raw: any[] = await res.json();
      if (raw.length > 0) {
        // Run the scraped json through the exact same mapping function Supabase used
        processData(raw.map(mapRow));
        setLiveStatus('live');
        return;
      }
    } catch { /* ignore */ }

    // Demo fallback
    processData([
      { MetaDistId: 27, MetaConstId: 1, CandidateName: 'Prakash Man Singh', PoliticalPartyName: 'नेपाली काँग्रेस', TotalVoteReceived: 7143, Remarks: 'Elected', Age: 62, Gender: 'पुरुष' },
      { MetaDistId: 35, MetaConstId: 2, CandidateName: 'Rabi Lamichhane', PoliticalPartyName: 'राष्ट्रिय स्वतन्त्र पार्टी', TotalVoteReceived: 49264, Remarks: 'Elected', Age: 43, Gender: 'पुरुष' },
      { MetaDistId: 4, MetaConstId: 5, CandidateName: 'KP Sharma Oli', PoliticalPartyName: 'नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी)', TotalVoteReceived: 52319, Remarks: 'Elected', Age: 72, Gender: 'पुरुष' },
    ]);
  }

  // HOTFIX: Disable Supabase Realtime Subscriptions
  /* function subscribeRealtime() {
    // By-pass realtime and rely purely on the polling interval
    setLiveStatus('polling');
  } */

  useEffect(() => {
    loadData();
    // 5-second interval polling for FPTP data
    const fptpInterval = setInterval(loadData, 5_000);

    // PR data: fetch once on load, then every 60s (doesn't need to be as frequent)
    async function loadPRData() {
      try {
        const t = `?t=${new Date().getTime()}`;
        // Try local dev server first (public/ folder), fall back to GitHub
        const tryFetch = async (filename: string) => {
          try {
            const local = await fetch(`/data/${filename}${t}`);
            const data = await local.json();
            if (Array.isArray(data) && data.length > 0) return data;
          } catch { /* try GitHub */ }
          const ghBase = `https://raw.githubusercontent.com/Ashok314/election-np/hotfix-local-scrape/frontend/public/data`;
          const res = await fetch(`${ghBase}/${filename}${t}`);
          return res.json();
        };
        const [prNat, prDist] = await Promise.all([
          tryFetch('pr-results.json'),
          tryFetch('pr-by-district.json'),
        ]);
        if (Array.isArray(prNat) && prNat.length > 0) setPRData(prNat);
        if (Array.isArray(prDist) && prDist.length > 0) setPRByDistrict(prDist);
      } catch { /* ignore, PR data may not exist yet */ }
    }
    loadPRData();
    const prInterval = setInterval(loadPRData, 60_000);

    return () => { clearInterval(fptpInterval); clearInterval(prInterval); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [sortBy, setSortBy] = useState<'votes' | 'district' | 'party'>('votes');
  const [filterParty, setFilterParty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredLeaders = leaders
    .filter(r => {
      const q = searchTerm.toLowerCase();
      const distName = (districtLookup[r.MetaDistId] || '').toLowerCase();
      const matches =
        !q ||
        distName.includes(q) ||
        (r.CandidateName || '').toLowerCase().includes(q) ||
        (r.PoliticalPartyName || '').toLowerCase().includes(q);
      const isElected = r.Remarks === 'Elected' || r.Remarks === 'निर्वाचित';
      const partyOk = filterParty === 'all' || r.PoliticalPartyName === filterParty;
      const statusOk = filterStatus === 'all' || (filterStatus === 'elected' ? isElected : !isElected);
      return matches && partyOk && statusOk;
    })
    .sort((a, b) => {
      if (sortBy === 'votes') return (b.TotalVoteReceived || 0) - (a.TotalVoteReceived || 0);
      if (sortBy === 'district') return a.MetaDistId - b.MetaDistId || a.MetaConstId - b.MetaConstId;
      if (sortBy === 'party') return (a.PoliticalPartyName || '').localeCompare(b.PoliticalPartyName || '');
      return 0;
    });

  // Top 5 parties by total seats
  const topParties = Object.entries(overallStats)
    .sort((a, b) => (b[1].leads + b[1].won) - (a[1].leads + a[1].won))
    .slice(0, 5);

  const totalElected = leaders.filter(r => r.Remarks === 'Elected' || r.Remarks === 'निर्वाचित').length;
  const totalPRDistrictsFinished = new Set(prByDistrict.map(d => d.dist_id)).size;
  // Convert pr-by-district data to CandidateResult shape for the map
  // Deduplicate: pick only the top party per constituency for coloring
  const prMapData: CandidateResult[] = useMemo(() => {
    const leaderMap = new Map<string, typeof prByDistrict[0]>();
    for (const d of prByDistrict) {
      const key = `${d.dist_id}-${d.const_id}`;
      if (!leaderMap.has(key) || d.total_votes > leaderMap.get(key)!.total_votes) {
        leaderMap.set(key, d);
      }
    }
    return Array.from(leaderMap.values()).map(d => ({
      MetaDistId: d.dist_id,
      MetaConstId: d.const_id,
      CandidateName: d.party_name,
      PoliticalPartyName: d.party_name,
      TotalVoteReceived: d.total_votes,
      Remarks: '',
    }));
  }, [prByDistrict]);
  // Filter and sort for PR Table
  const filteredPRData = useMemo(() => {
    // 1. Calculate best district for each party
    const partyStats = prData.map(p => {
      const partyRows = prByDistrict.filter(d => d.party_name === p.party_name);
      const distMap = new Map<number, number>();
      partyRows.forEach(d => {
        distMap.set(d.dist_id, (distMap.get(d.dist_id) || 0) + d.total_votes);
      });
      let bestDistId = -1;
      let bestDistVotes = 0;
      for (const [dId, votes] of distMap.entries()) {
        if (votes > bestDistVotes) {
          bestDistVotes = votes;
          bestDistId = dId;
        }
      }
      return {
        ...p,
        bestDistId,
        bestDistVotes,
        bestDistName: bestDistId > 0 ? (districtLookup[bestDistId] || `Dist ${bestDistId}`) : '—'
      };
    });

    // 2. Filter
    const q = prSearchTerm.toLowerCase();
    const filtered = partyStats.filter(p => {
      return !q ||
        p.party_name.toLowerCase().includes(q) ||
        p.bestDistName.toLowerCase().includes(q);
    });

    // 3. Sort
    return filtered.sort((a, b) => {
      if (prSortBy === 'votes') return b.total_votes - a.total_votes;
      if (prSortBy === 'best-district') return b.bestDistVotes - a.bestDistVotes;
      return a.party_name.localeCompare(b.party_name);
    });
  }, [prData, prByDistrict, prSearchTerm, prSortBy]);

  // Full flat list for hover tooltips in PR mode
  const prAllCandidates: CandidateResult[] = prByDistrict.map(d => ({
    MetaDistId: d.dist_id,
    MetaConstId: d.const_id,
    CandidateName: d.party_name,
    PoliticalPartyName: d.party_name,
    TotalVoteReceived: d.total_votes,
    Remarks: '',
  }));

  // ── Strings ──────────────────────────────────────────────────────────────
  const t = {
    title: lang === 'en' ? 'NEPAL 2082' : 'नेपाल २०८२',
    subTitle: lang === 'en' ? 'Pratinidhi Sabha • Live Counting' : 'प्रतिनिधि सभा • प्रत्यक्ष मतगणना',
    lastUpdated: lang === 'en' ? 'Updated:' : 'अपडेट:',
    autoRefresh: lang === 'en' ? 'LIVE' : 'प्रत्यक्ष',
    searchPlaceholder: lang === 'en' ? 'Search candidate or constituency...' : 'उम्मेदवार वा सिट खोज्नुहोस्...',
    leads: lang === 'en' ? 'Leads' : 'अग्रता',
    won: lang === 'en' ? 'Won' : 'विजयि',
    insights: lang === 'en' ? 'Data Insights' : 'डेटा अन्तर्दृष्टि',
    mapTitle: lang === 'en' ? 'Constituency Map' : 'निर्वाचन नक्सा',
    tableTitle: lang === 'en' ? 'Leading Candidates' : 'अग्रणी उम्मेदवारहरू',
    colConst: lang === 'en' ? 'Constituency' : 'क्षेत्र',
    colCand: lang === 'en' ? 'Candidate' : 'उम्मेदवार',
    colParty: lang === 'en' ? 'Party' : 'दल',
    colVotes: lang === 'en' ? 'Votes' : 'मत',
    colStatus: lang === 'en' ? 'Status' : 'अवस्था',
    statusElected: lang === 'en' ? 'Elected' : 'निर्वाचित',
    statusLeading: lang === 'en' ? 'Leading' : 'अग्रता',
    totalDeclared: lang === 'en' ? 'DECLARATIONS' : 'विजयी',
    prFinished: lang === 'en' ? 'PR DISTRICTS' : 'समानुपातिक जिल्ला',
  };

  const isDark = theme === 'dark';
  const bg = isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-100 text-gray-900';
  const card = isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm';
  const subText = isDark ? 'text-zinc-400' : 'text-slate-500';
  const headerBg = isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white/90 border-slate-200';

  return (
    <div className={`min-h-screen transition-colors duration-300 flex flex-col ${bg}`}>
      {totalElected >= 165 && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />}

      {/* ── Maintenance Banner ──
      <div className="w-full bg-amber-500 text-amber-950 px-4 py-2.5 text-center text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm z-[100]">
        <span className="text-lg leading-none">⚠️</span>
        <div>
          {lang === 'en'
            ? 'Dashboard is currently UNDER MAINTENANCE due to unexpectedly high traffic exhausting our database limits! We will be back running steadily in a few hours.'
            : 'अत्यधिक ट्राफिकका कारण हाम्रो डाटाबेसको सिमा नाघेकोले ड्यासबोर्ड हाल मर्मतसम्भार (UNDER MAINTENANCE) मा छ! हामी केही घण्टामा पुनः नियमित रूपमा सञ्चालनमा आउनेछौं।'}
          <a href="https://github.com/Ashok314/election-np" target="_blank" rel="noopener noreferrer" className="ml-2 underline font-bold hover:text-amber-800">
            {lang === 'en' ? 'For Developers: Clone & run locally in 2 minutes 🚀' : 'विकासकर्ताहरूका लागि: क्लोन गर्नुहोस् र २ मिनेटमा स्थानीय रूपमा चलाउनुहोस् 🚀'}
          </a>
        </div>
      </div>
      */}

      {/* ── Header ── */}
      <header className={`lg:sticky relative top-0 z-[9999] border-b backdrop-blur-md px-6 py-3 flex items-center justify-between ${headerBg}`}>
        <div>
          <h1 className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">
            {t.title}
          </h1>
          <p className={`text-xs font-medium ${subText}`}>{t.subTitle}</p>
          {/* Mobile-only Metric */}
          <div className="flex lg:hidden items-center gap-3 mt-1 text-[9px] font-black tracking-wide">
            <div className={`flex items-center gap-1 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
              🏆 {totalElected} / 165
            </div>
            <div className={`w-px h-2 ${theme === 'dark' ? 'bg-zinc-800' : 'bg-slate-200'}`} />
            <div className={`flex items-center gap-1 ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`}>
              🗳️ {totalPRDistrictsFinished} / 77
            </div>
          </div>
        </div>

        {/* Stats Section with Metrics */}
        <div className="hidden lg:flex items-center gap-4 flex-1 mx-8 justify-center">
          {/* FPTP Pill */}
          <div className={`flex items-center gap-3 px-5 py-2 rounded-xl backdrop-blur-md shadow-sm border ${theme === 'dark' ? 'bg-zinc-800/40 border-zinc-800' : 'bg-slate-100/50 border-slate-200'}`}>
            <div className="flex flex-col items-end leading-none translate-y-[2px]">
              <span className={`text-[9px] uppercase font-black tracking-[0.2em] ${theme === 'dark' ? 'text-zinc-500' : 'text-slate-400'}`}>{t.totalDeclared}</span>
              <span className="text-xl font-black mt-1 bg-clip-text text-transparent bg-gradient-to-br from-emerald-400 to-teal-600">
                {totalElected} <span className={`text-sm tracking-tight ${theme === 'dark' ? 'text-zinc-600' : 'text-slate-400'}`}>/ 165</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500/20 flex items-center justify-center to-teal-500/10 border border-emerald-500/20">
              <span className="text-xl">🏆</span>
            </div>
          </div>

          {/* PR Pill */}
          <div className={`flex items-center gap-3 px-5 py-2 rounded-xl backdrop-blur-md shadow-sm border ${theme === 'dark' ? 'bg-zinc-800/40 border-zinc-800' : 'bg-slate-100/50 border-slate-200'}`}>
            <div className="flex flex-col items-end leading-none translate-y-[2px]">
              <span className={`text-[9px] uppercase font-black tracking-[0.2em] ${theme === 'dark' ? 'text-zinc-500' : 'text-slate-400'}`}>{t.prFinished}</span>
              <span className="text-xl font-black mt-1 bg-clip-text text-transparent bg-gradient-to-br from-violet-400 to-indigo-600">
                {totalPRDistrictsFinished} <span className={`text-sm tracking-tight ${theme === 'dark' ? 'text-zinc-600' : 'text-slate-400'}`}>/ 77</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-500/20 flex items-center justify-center to-indigo-500/10 border border-violet-500/20">
              <span className="text-xl">🗳️</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Live status badge */}
          <div className={`flex items-center justify-center gap-1.5 w-28 text-[10px] font-bold tracking-wider px-2 py-1 rounded-full border ${liveStatus === 'live' ? (isDark ? 'border-emerald-700 text-emerald-400' : 'border-emerald-300 text-emerald-600') :
            liveStatus === 'polling' ? (isDark ? 'border-zinc-700 text-zinc-400' : 'border-gray-300 text-gray-500') :
              (isDark ? 'border-zinc-700 text-zinc-500' : 'border-gray-200 text-gray-400')
            }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${liveStatus === 'live' ? 'bg-emerald-400 live' :
              liveStatus === 'polling' ? 'bg-amber-400' : 'bg-zinc-600'
              }`} />
            {liveStatus === 'live' ? 'LIVE' : liveStatus === 'polling' ? 'POLLING' : 'CONNECT'}
          </div>
          <span className={`text-xs ${subText}`}>{t.lastUpdated} {lastUpdated}</span>
          <div className={`w-px h-4 ${isDark ? 'bg-zinc-700' : 'bg-gray-300'}`} />
          <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            className={`text-xs px-2 py-1 rounded border ${isDark ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}>
            {isDark ? '☀️' : '🌙'}
          </button>
          <button onClick={() => setLang(l => l === 'en' ? 'np' : 'en')}
            className={`text-xs px-2 py-1 rounded border ${isDark ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}>
            {lang === 'en' ? 'ने' : 'EN'}
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      < div className="flex flex-col lg:flex-row min-h-[calc(100vh-57px)]" >

        {/* LEFT: Map */}
        < div className="lg:w-[58%] p-4 flex flex-col gap-4" >
          <div className={`rounded-2xl border overflow-hidden ${card}`} style={{ height: 'calc(100vh - 100px)', minHeight: 480 }}>
            <div className={`px-4 py-3 border-b flex items-center gap-2 flex-wrap ${isDark ? 'border-zinc-800' : 'border-gray-100'}`}>
              <div className="w-1.5 h-5 bg-emerald-500 rounded-full" />
              <span className={`font-bold text-sm ${isDark ? 'text-zinc-200' : 'text-gray-700'}`}>{t.mapTitle}</span>
              <span className={`text-xs ${subText}`}>{leaders.length} constituencies</span>
              {/* Map Mode Toggle */}
              <div className={`ml-auto flex items-center rounded-lg overflow-hidden border text-[10px] font-bold tracking-wider ${isDark ? 'border-zinc-700' : 'border-gray-200'}`}>
                <button
                  onClick={() => setMapMode('fptp')}
                  className={`px-3 py-1.5 transition-colors ${mapMode === 'fptp'
                    ? (isDark ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-white')
                    : (isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-gray-500 hover:bg-gray-50')
                    }`}
                >
                  {lang === 'en' ? 'FPTP' : 'प्रत्यक्ष'}
                </button>
                <button
                  onClick={() => setMapMode('pr')}
                  className={`px-3 py-1.5 transition-colors ${mapMode === 'pr'
                    ? (isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                    : (isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-gray-500 hover:bg-gray-50')
                    }`}
                >
                  {lang === 'en' ? 'PR' : 'समानुपातिक'}
                </button>
              </div>
            </div>
            <div className="h-[calc(100%-45px)]">
              <Suspense fallback={
                <div className={`flex items-center justify-center h-full ${subText}`}>
                  Loading map…
                </div>
              }>
                <ElectionMap
                  resultsData={mapMode === 'pr' ? prMapData : leaders}
                  allCandidates={mapMode === 'pr' ? prAllCandidates : allCandidates}
                  partyColors={PARTY_COLORS}
                  theme={theme}
                  lang={lang}
                />
              </Suspense>
            </div>
          </div>

          <PRHighlights
            prData={prData}
            prByDistrict={prByDistrict}
            theme={theme}
            lang={lang}
            districtLookup={districtLookup}
            districtLookupNp={districtLookupNp}
          />
        </div>

        {/* RIGHT: Stats + Insights + Table */}
        <div className="lg:w-[42%] p-4 flex flex-col gap-4 overflow-y-auto">

          {/* Party Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {
              topParties.map(([party, counts]) => (
                <div key={party} className={`rounded-r-xl border p-3 border-l-4 relative overflow-hidden group ${card}`} style={{ borderLeftColor: getPartyColor(party) }}>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300" style={{ backgroundColor: getPartyColor(party) }} />

                  {/* Smaller stats on top */}
                  <div className={`flex gap-2 mb-1.5 text-[10px] font-bold uppercase`}>
                    <span style={{ color: '#60a5fa' }}>{counts.leads} {t.leads}</span>
                    <span style={{ color: '#34d399' }}>{counts.won} {t.won}</span>
                  </div>

                  {/* Massive Total */}
                  <div className="text-3xl font-black leading-none" style={{ color: getPartyColor(party) }}>
                    {counts.leads + counts.won}
                  </div>

                  {/* Title */}
                  <div className={`text-[10px] font-bold mt-1.5 leading-tight break-words uppercase tracking-wide ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    {party}
                  </div>
                </div>
              ))
            }
          </div>

          {/* Charts: FPTP Seat Share + PR Vote Share side-by-side */}
          <div className={`rounded-2xl border p-4 ${card}`}>
            <div className="flex gap-4">
              {/* FPTP Seat Share */}
              <div className="flex-1 min-w-0">
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1 ${subText}`}>
                  <div className="w-1.5 h-3 bg-emerald-500 rounded-full" />
                  {lang === 'en' ? 'Seat Share' : 'सिट विभाजन'}
                </div>
                <div className="h-36">
                  <Doughnut
                    data={{
                      labels: topParties.map(([p]) => p),
                      datasets: [{ data: topParties.map(([, c]) => c.leads + c.won), backgroundColor: topParties.map(([p]) => getPartyColor(p)), borderWidth: 0, hoverOffset: 4 }]
                    }}
                    options={{ responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { display: false }, datalabels: { display: true, color: '#fff', font: { weight: 'bold', size: 11 }, formatter: (v: number) => v > 0 ? v : '' } } }}
                  />
                </div>
              </div>
              {/* Divider */}
              <div className={`w-px self-stretch ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`} />
              {/* PR Vote Share */}
              <div className="flex-1 min-w-0">
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1 ${subText}`}>
                  <div className="w-1.5 h-3 bg-blue-500 rounded-full" />
                  {lang === 'en' ? 'PR Vote Share' : 'समानुपातिक मत'}
                </div>
                <div className="h-36">
                  {prData.length > 0 ? (
                    <Doughnut
                      data={{
                        labels: prData.slice(0, 8).map(p => p.party_name),
                        datasets: [{ data: prData.slice(0, 8).map(p => p.total_votes), backgroundColor: prData.slice(0, 8).map(p => getPartyColor(p.party_name)), borderWidth: 0, hoverOffset: 4 }]
                      }}
                      options={{ responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { display: false }, datalabels: { display: true, color: '#fff', font: { weight: 'bold', size: 10 }, formatter: (v: number, ctx: any) => { const total = (ctx.dataset.data as number[]).reduce((a: number, b: number) => a + b, 0); const pct = ((v / total) * 100).toFixed(0); return Number(pct) > 4 ? `${pct}%` : ''; } } } }}
                    />
                  ) : (
                    <div className={`flex items-center justify-center h-full text-[10px] italic ${subText}`}>
                      {lang === 'en' ? 'Awaiting PR data…' : 'PR तथ्यांक लोड हुँदैछ…'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Insight Cards */}
          < div className={`rounded-2xl border p-4 ${card}`}>
            <div className={`font-bold text-sm mb-3 flex items-center gap-2 ${isDark ? 'text-zinc-200' : 'text-gray-700'}`}>
              <div className="w-1.5 h-5 bg-amber-500 rounded-full" />
              {t.insights}
            </div>
            <InsightCards
              allCandidates={allCandidates}
              leaders={leaders}
              theme={theme}
              lang={lang}
              districtLookup={districtLookup}
              districtLookupNp={districtLookupNp}
            />
          </div >

          <div className={`text-center text-[10px] pb-2 ${isDark ? 'text-zinc-700' : 'text-gray-400'}`}>
            Official ECN data · Nepal Election 2082 · Built for Nepalis
          </div>
        </div >
      </div >

      {/* ── Tables: Pratakshya + Samanupatik side-by-side ── */}
      <div className="px-4 pb-8 flex flex-col lg:flex-row gap-4">

        {/* ── प्रत्यक्ष (FPTP) Table ── */}
        <div className={`flex-1 min-w-0 rounded-2xl border overflow-hidden ${card}`}>
          <div className={`px-5 py-3 border-b flex flex-wrap items-center gap-3 ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
            <div className={`font-bold text-sm flex items-center gap-2 ${isDark ? 'text-zinc-200' : 'text-gray-700'}`}>
              <div className="w-1.5 h-5 bg-emerald-500 rounded-full" />
              {lang === 'en' ? 'Pratakshya (FPTP)' : 'प्रत्यक्ष'}
              <span className={`text-xs font-normal ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{filteredLeaders.length}/{leaders.length}</span>
            </div>
            <div className="flex flex-wrap gap-2 ml-auto items-center">
              <input placeholder={t.searchPlaceholder} value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className={`text-xs rounded-xl pl-3 pr-3 py-1.5 w-40 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${isDark ? 'bg-zinc-800 border border-zinc-700 text-zinc-200 placeholder-zinc-500' : 'bg-slate-50 border border-slate-200 text-gray-700 placeholder-gray-400'}`} />
              <select value={filterParty} onChange={e => setFilterParty(e.target.value)}
                className={`text-xs rounded-xl px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${isDark ? 'bg-zinc-800 border border-zinc-700 text-zinc-200' : 'bg-slate-50 border border-slate-200 text-gray-700'}`}>
                <option value="all">{lang === 'en' ? 'All Parties' : 'सबै दल'}</option>
                {Object.keys(overallStats).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className={`text-xs rounded-xl px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${isDark ? 'bg-zinc-800 border border-zinc-700 text-zinc-200' : 'bg-slate-50 border border-slate-200 text-gray-700'}`}>
                <option value="all">{lang === 'en' ? 'All' : 'सबै'}</option>
                <option value="elected">{lang === 'en' ? 'Elected' : 'निर्वाचित'}</option>
                <option value="leading">{lang === 'en' ? 'Leading' : 'अग्रता'}</option>
              </select>
              <div className={`flex rounded-xl overflow-hidden border text-xs ${isDark ? 'border-zinc-700' : 'border-slate-200'}`}>
                {(['votes', 'district', 'party'] as const).map(opt => (
                  <button key={opt} onClick={() => setSortBy(opt)}
                    className={`px-2.5 py-1.5 transition-colors ${sortBy === opt ? 'bg-emerald-500 text-white' : isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-white text-gray-500 hover:bg-slate-50'}`}>
                    {opt === 'votes' ? (lang === 'en' ? 'Votes ↓' : 'मत ↓') : opt === 'district' ? (lang === 'en' ? 'District' : 'जिल्ला') : (lang === 'en' ? 'Party' : 'दल')}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto" style={{ maxHeight: 480 }}>
            <table className="w-full text-xs text-left">
              <thead className={`sticky top-0 z-10 uppercase font-semibold tracking-wide ${isDark ? 'bg-zinc-950 text-zinc-500' : 'bg-slate-100 text-slate-400'}`}>
                <tr>
                  <th className="px-4 py-2.5">{t.colConst}</th>
                  <th className="px-4 py-2.5">{t.colCand}</th>
                  <th className="px-4 py-2.5">{lang === 'en' ? 'Party' : 'दल'}</th>
                  <th className="px-4 py-2.5 text-right">{t.colVotes}</th>
                  <th className="px-4 py-2.5 text-center">{t.colStatus}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-zinc-800/60' : 'divide-slate-100'}`}>
                {filteredLeaders.map((row, idx) => {
                  const distName = districtLookup[row.MetaDistId] || `Dist ${row.MetaDistId}`;
                  const isElected = row.Remarks === 'Elected' || row.Remarks === 'निर्वाचित';
                  const partyColor = getPartyColor(row.PoliticalPartyName);
                  return (
                    <tr key={idx} className={`transition-colors group ${isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-slate-50'}`}>
                      <td className={`px-4 py-2.5 font-medium whitespace-nowrap ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                        {distName}<span className={`ml-1 text-[10px] ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>· {row.MetaConstId}</span>
                      </td>
                      <td className={`px-4 py-2.5 font-semibold ${isDark ? 'text-zinc-100 group-hover:text-emerald-400' : 'text-gray-900 group-hover:text-emerald-600'} transition-colors`}>
                        {row.CandidateName || '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: partyColor }} />
                          <span className={`text-xs truncate max-w-[140px] ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>{row.PoliticalPartyName}</span>
                        </div>
                      </td>
                      <td className={`px-4 py-2.5 text-right font-mono font-bold ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>
                        {(row.TotalVoteReceived || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${isElected ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                          {isElected ? t.statusElected : t.statusLeading}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredLeaders.length === 0 && (
                  <tr><td colSpan={5} className={`px-5 py-10 text-center text-xs italic ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>
                    {lang === 'en' ? 'No results found' : 'कुनै नतिजा भेटिएन'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── समानुपातिक (PR) Table ── */}
        <div className={`lg:w-[420px] rounded-2xl border overflow-hidden flex-shrink-0 ${card}`}>
          <div className={`px-5 py-3 border-b flex flex-col sm:flex-row sm:items-center gap-3 ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
            <div className={`font-bold text-sm flex items-center gap-2 ${isDark ? 'text-zinc-200' : 'text-gray-700'}`}>
              <div className="w-1.5 h-5 bg-blue-500 rounded-full" />
              {lang === 'en' ? 'Samanupatik (PR)' : 'समानुपातिक'}
            </div>

            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <input
                type="text"
                placeholder={lang === 'en' ? 'Search...' : 'खोज्नुहोस्...'}
                value={prSearchTerm}
                onChange={(e) => setPrSearchTerm(e.target.value)}
                className={`text-[10px] rounded-xl px-3 py-1.5 w-28 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500' : 'bg-slate-50 border-slate-200 text-gray-700 placeholder-gray-400'}`}
              />

              <div className={`flex rounded-xl overflow-hidden border text-[10px] font-bold ${isDark ? 'border-zinc-700' : 'border-slate-200'}`}>
                {(['votes', 'name', 'best-district'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setPrSortBy(opt)}
                    className={`px-2 py-1.5 transition-all ${prSortBy === opt
                      ? 'bg-blue-600 text-white'
                      : isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-white text-gray-500 hover:bg-slate-50'
                      }`}
                  >
                    {opt === 'votes' ? (lang === 'en' ? 'Votes' : 'मत') :
                      opt === 'name' ? (lang === 'en' ? 'A-Z' : 'दल') :
                        (lang === 'en' ? 'Best' : 'उत्कृष्ट')}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
            {prData.length > 0 ? (
              <table className="w-full text-xs text-left">
                <thead className={`sticky top-0 z-10 uppercase font-semibold tracking-wide ${isDark ? 'bg-zinc-950 text-zinc-500' : 'bg-slate-100 text-slate-400'}`}>
                  <tr>
                    <th className="px-4 py-2.5">#</th>
                    <th className="px-4 py-2.5">{lang === 'en' ? 'Party' : 'दल'}</th>
                    <th className="px-4 py-2.5 text-right">{lang === 'en' ? 'Best District' : 'उत्कृष्ट जिल्ला'}</th>
                    <th className="px-4 py-2.5 text-right">{lang === 'en' ? 'Nat. Votes' : 'कुल मत'}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-zinc-800/60' : 'divide-slate-100'}`}>
                  {filteredPRData.map((p, idx) => {
                    const color = getPartyColor(p.party_name);
                    const totalPRVotes = prData.reduce((s, x) => s + x.total_votes, 0);
                    const pct = totalPRVotes > 0 ? ((p.total_votes / totalPRVotes) * 100).toFixed(1) : '0.0';

                    // Find best district for this party
                    const partyDistricts = prByDistrict.filter(d => d.party_name === p.party_name);
                    const distVotes = new Map<number, number>();
                    partyDistricts.forEach(d => {
                      distVotes.set(d.dist_id, (distVotes.get(d.dist_id) || 0) + d.total_votes);
                    });

                    let bestDistId = -1;
                    let bestDistVotes = 0;
                    for (const [d, v] of distVotes.entries()) {
                      if (v > bestDistVotes) { bestDistVotes = v; bestDistId = d; }
                    }
                    const bestDistName = bestDistId > 0 ? (districtLookup[bestDistId] || `Dist ${bestDistId}`) : '—';

                    return (
                      <tr key={p.party_name} className={`transition-colors ${isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-slate-50'}`}>
                        <td className={`px-4 py-2.5 font-mono text-[10px] ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>{idx + 1}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                            <span className={`font-medium truncate max-w-[150px] ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>{p.party_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {bestDistId > 0 ? (
                            <>
                              <div className={`font-medium ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>{bestDistName}</div>
                              <div className={`text-[9px] font-mono ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>{bestDistVotes.toLocaleString()} votes</div>
                            </>
                          ) : (
                            <span className={isDark ? 'text-zinc-600' : 'text-slate-400'}>—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className={`font-mono font-bold text-[11px] ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>{p.total_votes.toLocaleString()}</div>
                          <div className={`text-[9px] ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>{pct}%</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className={`px-5 py-12 text-center text-xs italic ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>
                {lang === 'en' ? 'Awaiting PR data…' : 'PR तथ्यांक लोड हुँदैछ…'}
              </div>
            )}



          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className={`mt-4 py-8 text-center text-xs font-medium border-t flex flex-col items-center justify-center gap-2 ${isDark ? 'border-zinc-800 text-zinc-500' : 'border-gray-200 text-gray-500'}`}>
        <div>
          Vibe Coded with antigravity by{' '}
          <a
            href="https://github.com/Ashok314"
            target="_blank"
            rel="noopener noreferrer"
            className={`font-semibold hover:underline transition-colors ${isDark ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-500'}`}
          >
            @Ashok314
          </a>
        </div>
        <a
          href="https://buymeacoffee.com/ashok314"
          target="_blank"
          rel="noopener noreferrer"
          className={`px-3 py-1.5 rounded-full border transition-all hover:scale-105 flex items-center gap-2 ${isDark ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
        >
          ☕ Buy me a coffee
        </a>
      </footer >
    </div >
  );
}

export default App;
