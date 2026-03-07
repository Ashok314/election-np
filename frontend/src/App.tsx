import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Doughnut } from 'react-chartjs-2';
import districtsData from './data/districts.json';
import InsightCards from './components/InsightCards';
import { supabase, mapRow } from './lib/supabase';

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
  const [lang, setLang] = useState<'np' | 'en'>('en');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [liveStatus, setLiveStatus] = useState<'connecting' | 'live' | 'polling'>('connecting');
  const channelRef = useRef<any>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Process raw rows into leaders + stats
  function processData(data: CandidateResult[]) {
    if (!data.length) return;
    setAllCandidates(data);
    setLastUpdated(new Date().toLocaleTimeString('en-US') + ' NPT');

    const leaderMap: Record<string, CandidateResult> = {};
    data.forEach(c => {
      const key = `${c.MetaDistId}-${c.MetaConstId}`;
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
  function subscribeRealtime() {
    // By-pass realtime and rely purely on the polling interval
    setLiveStatus('polling');
  }

  useEffect(() => {
    loadData();
    // 5-second interval polling for local hotfix
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
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

  const totalSeats = topParties.reduce((s, [, c]) => s + c.leads + c.won, 0) || 1;

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
  };

  const isDark = theme === 'dark';
  const bg = isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-100 text-gray-900';
  const card = isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm';
  const subText = isDark ? 'text-zinc-400' : 'text-slate-500';
  const headerBg = isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white/90 border-slate-200';

  return (
    <div className={`min-h-screen transition-colors duration-300 flex flex-col ${bg}`}>

      {/* ── Maintenance Banner ── */}
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

      {/* ── Header ── */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-md px-6 py-3 flex items-center justify-between ${headerBg}`}>
        <div>
          <h1 className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">
            {t.title}
          </h1>
          <p className={`text-xs font-medium ${subText}`}>{t.subTitle}</p>
        </div>

        {/* Seat race bar */}
        <div className="hidden lg:flex items-center gap-4 flex-1 mx-8">
          <div className="flex h-3 w-full rounded-full overflow-hidden gap-0.5">
            {topParties.map(([party, counts]) => {
              const total = counts.leads + counts.won;
              const pct = (total / totalSeats) * 100;
              return (
                <div
                  key={party}
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: getPartyColor(party) }}
                  title={`${party}: ${total} seats`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {topParties.slice(0, 3).map(([party, counts]) => (
              <div key={party} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getPartyColor(party) }} />
                <span className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-gray-600'}`}>
                  {counts.leads + counts.won}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Live status badge */}
          <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${liveStatus === 'live' ? (isDark ? 'border-emerald-700 text-emerald-400' : 'border-emerald-300 text-emerald-600') :
            liveStatus === 'polling' ? (isDark ? 'border-zinc-700 text-zinc-400' : 'border-gray-300 text-gray-500') :
              (isDark ? 'border-zinc-700 text-zinc-500' : 'border-gray-200 text-gray-400')
            }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${liveStatus === 'live' ? 'bg-emerald-400 live' :
              liveStatus === 'polling' ? 'bg-amber-400' : 'bg-zinc-600'
              }`} />
            {liveStatus === 'live' ? 'LIVE' : liveStatus === 'polling' ? 'POLLING' : 'CONNECTING'}
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

      {/* ── Body: Split Layout ── */}
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-57px)]">

        {/* LEFT: Map */}
        <div className="lg:w-[58%] p-4 flex flex-col gap-4">
          <div className={`rounded-2xl border overflow-hidden ${card}`} style={{ height: 'calc(100vh - 100px)', minHeight: 480 }}>
            <div className={`px-4 py-3 border-b flex items-center gap-2 ${isDark ? 'border-zinc-800' : 'border-gray-100'}`}>
              <div className="w-1.5 h-5 bg-emerald-500 rounded-full" />
              <span className={`font-bold text-sm ${isDark ? 'text-zinc-200' : 'text-gray-700'}`}>{t.mapTitle}</span>
              <span className={`text-xs ml-auto ${subText}`}>{leaders.length} constituencies</span>
            </div>
            <div className="h-[calc(100%-45px)]">
              <Suspense fallback={
                <div className={`flex items-center justify-center h-full ${subText}`}>
                  Loading map…
                </div>
              }>
                <ElectionMap
                  resultsData={leaders}
                  allCandidates={allCandidates}
                  partyColors={PARTY_COLORS}
                  theme={theme}
                  lang={lang}
                />
              </Suspense>
            </div>
          </div>
        </div>

        {/* RIGHT: Stats + Insights + Table */}
        <div className="lg:w-[42%] p-4 flex flex-col gap-4 overflow-y-auto">

          {/* Party Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {topParties.map(([party, counts]) => (
              <div key={party} className={`rounded-2xl border p-3 relative overflow-hidden group ${card}`}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl" style={{ backgroundColor: getPartyColor(party) }} />
                <div className="w-3 h-1 rounded-full mb-2" style={{ backgroundColor: getPartyColor(party) }} />
                <div className="text-3xl font-black" style={{ color: getPartyColor(party) }}>
                  {counts.leads + counts.won}
                </div>
                <div className={`text-[10px] font-medium mt-1 leading-tight break-words ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                  {party}
                </div>
                <div className={`flex gap-2 mt-2 text-[10px] font-bold uppercase`}>
                  <span style={{ color: '#60a5fa' }}>{counts.leads} {t.leads}</span>
                  <span style={{ color: '#34d399' }}>{counts.won} {t.won}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Donut Chart */}
          <div className={`rounded-2xl border p-4 ${card}`}>
            <div className={`font-bold text-sm mb-3 flex items-center gap-2 ${isDark ? 'text-zinc-200' : 'text-gray-700'}`}>
              <div className="w-1.5 h-5 bg-emerald-500 rounded-full" />
              {lang === 'en' ? 'Vote Share' : 'मत विभाजन'}
            </div>
            <div className="h-44">
              <Doughnut
                data={{
                  labels: topParties.map(([p]) => p),
                  datasets: [{
                    data: topParties.map(([, c]) => c.leads + c.won),
                    backgroundColor: topParties.map(([p]) => getPartyColor(p)),
                    borderWidth: 0,
                    hoverOffset: 4,
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '60%',
                  plugins: {
                    legend: { position: 'right', labels: { color: isDark ? '#a1a1aa' : '#4b5563', padding: 12, font: { size: 11 } } },
                    datalabels: { display: true, color: '#fff', font: { weight: 'bold', size: 12 }, formatter: (v: number) => v > 0 ? v : '' }
                  }
                }}
              />
            </div>
          </div>

          {/* Insight Cards */}
          <div className={`rounded-2xl border p-4 ${card}`}>
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
          </div>

          <div className={`text-center text-[10px] pb-2 ${isDark ? 'text-zinc-700' : 'text-gray-400'}`}>
            Official ECN data · Nepal Election 2082 · Built for Nepalis
          </div>
        </div>
      </div>

      {/* ── Full-Width Candidates Table ── */}
      <div className="px-4 pb-8">
        <div className={`rounded-2xl border overflow-hidden ${card}`}>
          {/* Table header + controls */}
          <div className={`px-5 py-3 border-b flex flex-wrap items-center gap-3 ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
            <div className={`font-bold text-sm flex items-center gap-2 ${isDark ? 'text-zinc-200' : 'text-gray-700'}`}>
              <div className="w-1.5 h-5 bg-purple-500 rounded-full" />
              {t.tableTitle}
              <span className={`text-xs font-normal ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                {filteredLeaders.length}/{leaders.length}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 ml-auto items-center">
              {/* Search */}
              <input
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`text-xs rounded-xl pl-3 pr-3 py-1.5 w-52 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${isDark ? 'bg-zinc-800 border border-zinc-700 text-zinc-200 placeholder-zinc-500' : 'bg-slate-50 border border-slate-200 text-gray-700 placeholder-gray-400'
                  }`}
              />

              {/* Party filter */}
              <select
                value={filterParty}
                onChange={e => setFilterParty(e.target.value)}
                className={`text-xs rounded-xl px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${isDark ? 'bg-zinc-800 border border-zinc-700 text-zinc-200' : 'bg-slate-50 border border-slate-200 text-gray-700'
                  }`}
              >
                <option value="all">{lang === 'en' ? 'All Parties' : 'सबै दल'}</option>
                {Object.keys(overallStats).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className={`text-xs rounded-xl px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${isDark ? 'bg-zinc-800 border border-zinc-700 text-zinc-200' : 'bg-slate-50 border border-slate-200 text-gray-700'
                  }`}
              >
                <option value="all">{lang === 'en' ? 'All Status' : 'सबै अवस्था'}</option>
                <option value="elected">{lang === 'en' ? 'Elected' : 'निर्वाचित'}</option>
                <option value="leading">{lang === 'en' ? 'Leading' : 'अग्रता'}</option>
              </select>

              {/* Sort */}
              <div className={`flex rounded-xl overflow-hidden border text-xs ${isDark ? 'border-zinc-700' : 'border-slate-200'}`}>
                {(['votes', 'district', 'party'] as const).map(opt => (
                  <button
                    key={opt}
                    onClick={() => setSortBy(opt)}
                    className={`px-2.5 py-1.5 transition-colors ${sortBy === opt
                      ? 'bg-emerald-500 text-white'
                      : isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-white text-gray-500 hover:bg-slate-50'
                      }`}
                  >
                    {opt === 'votes' ? (lang === 'en' ? 'Votes ↓' : 'मत ↓') :
                      opt === 'district' ? (lang === 'en' ? 'District' : 'जिल्ला') :
                        (lang === 'en' ? 'Party' : 'दल')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto" style={{ maxHeight: 480 }}>
            <table className="w-full text-xs text-left">
              <thead className={`sticky top-0 z-10 uppercase font-semibold tracking-wide ${isDark ? 'bg-zinc-950 text-zinc-500' : 'bg-slate-100 text-slate-400'
                }`}>
                <tr>
                  <th className="px-5 py-2.5">{t.colConst}</th>
                  <th className="px-5 py-2.5">{t.colCand}</th>
                  <th className="px-5 py-2.5">{lang === 'en' ? 'Party' : 'दल'}</th>
                  <th className="px-5 py-2.5 text-right">{t.colVotes}</th>
                  <th className="px-5 py-2.5 text-center">{t.colStatus}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-zinc-800/60' : 'divide-slate-100'
                }`}>
                {filteredLeaders.map((row, idx) => {
                  const distName = districtLookup[row.MetaDistId] || `Dist ${row.MetaDistId}`;
                  const isElected = row.Remarks === 'Elected' || row.Remarks === 'निर्वाचित';
                  const partyColor = getPartyColor(row.PoliticalPartyName);
                  return (
                    <tr key={idx} className={`transition-colors group ${isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-slate-50'
                      }`}>
                      <td className={`px-5 py-3 font-medium whitespace-nowrap ${isDark ? 'text-zinc-400' : 'text-slate-500'
                        }`}>
                        {distName}
                        <span className={`ml-1 text-[10px] ${isDark ? 'text-zinc-600' : 'text-slate-400'
                          }`}>· {row.MetaConstId}</span>
                      </td>
                      <td className={`px-5 py-3 font-semibold ${isDark ? 'text-zinc-100 group-hover:text-emerald-400' : 'text-gray-900 group-hover:text-emerald-600'
                        } transition-colors`}>
                        {row.CandidateName || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: partyColor }} />
                          <span className={`text-xs truncate max-w-[180px] ${isDark ? 'text-zinc-400' : 'text-slate-600'
                            }`}>{row.PoliticalPartyName}</span>
                        </div>
                      </td>
                      <td className={`px-5 py-3 text-right font-mono font-bold ${isDark ? 'text-zinc-200' : 'text-gray-800'
                        }`}>
                        {(row.TotalVoteReceived || 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${isElected
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                          : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                          }`}>
                          {isElected ? t.statusElected : t.statusLeading}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredLeaders.length === 0 && (
                  <tr>
                    <td colSpan={5} className={`px-5 py-10 text-center text-xs italic ${isDark ? 'text-zinc-600' : 'text-slate-400'
                      }`}>
                      {lang === 'en' ? 'No results found' : 'कुनै नतिजा भेटिएन'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
      </footer>
    </div>
  );
}

export default App;
