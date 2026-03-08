import React, { useState, useMemo, lazy, Suspense, useCallback } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { MapMode, ElectionRemarks, LiveStatus } from '../types/election';
import type { CandidateResult, PRResult, PRByDistrict, OverallStats } from '../types/election';
import type { Locale } from '../locales/types';
import { getPartyColor, PARTY_COLORS, TOTAL_FPTP_SEATS } from '../constants/electionData';
import InsightCards from '../components/InsightCards';
import PRHighlights from '../components/PRHighlights';
import CandidateShareModal from '../components/CandidateShareModal';
import HoverCard from '../components/HoverCard';
import type { HoverInfo } from '../components/HoverCard';
import { useIsMobile } from '../hooks/useIsMobile.ts';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

const ElectionMap = lazy(() => import('../components/ElectionMap'));

interface DashboardPageProps {
  lastUpdated: string;
  overallStats: OverallStats;
  leaders: CandidateResult[];
  allCandidates: CandidateResult[];
  liveStatus: LiveStatus;
  prData: PRResult[];
  prByDistrict: PRByDistrict[];
  t: Locale;
}

const DashboardPage: React.FC<DashboardPageProps> = ({
  overallStats,
  leaders,
  allCandidates,
  prData,
  prByDistrict,
  t,
}) => {
  const { width, height } = useWindowSize();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterParty, setFilterParty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterState, setFilterState] = useState('all');
  const [filterDistrict, setFilterDistrict] = useState('all');
  const [filterArea, setFilterArea] = useState('all');
  const [sortBy, setSortBy] = useState<'votes' | 'district' | 'party'>('votes');
  const [mapMode, setMapMode] = useState<MapMode>(MapMode.FPTP);
  const [prSearchTerm, setPrSearchTerm] = useState('');
  const [prSortBy, setPrSortBy] = useState<'name' | 'votes' | 'best-district'>('votes');
  const [shareCandidate, setShareCandidate] = useState<CandidateResult | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const isMobile = useIsMobile();

  const cardClass = 'bg-surface-card border-border-default shadow-sm';
  const subTextClass = 'text-text-muted';

  const filteredLeaders = useMemo(() => {
    return leaders
      .filter((r) => {
        const q = searchTerm.toLowerCase();
        const distNameEn = t.getDistrictName(r.MetaDistId).toLowerCase();
        const matches =
          !q ||
          distNameEn.includes(q) ||
          (r.CandidateName || '').toLowerCase().includes(q) ||
          (r.PoliticalPartyName || '').toLowerCase().includes(q);
        const isElected =
          r.Remarks === ElectionRemarks.ELECTED || r.Remarks === ElectionRemarks.ELECTED_NP;
        const partyOk = filterParty === 'all' || r.PoliticalPartyName === filterParty;
        const statusOk =
          filterStatus === 'all' || (filterStatus === 'elected' ? isElected : !isElected);
        const stateOk = filterState === 'all' || r.StateName === filterState;
        const distOk = filterDistrict === 'all' || r.DistrictName === filterDistrict;
        const areaOk = filterArea === 'all' || r.MetaConstId === parseInt(filterArea);

        return matches && partyOk && statusOk && stateOk && distOk && areaOk;
      })
      .sort((a, b) => {
        if (sortBy === 'votes') return (b.TotalVoteReceived || 0) - (a.TotalVoteReceived || 0);
        if (sortBy === 'district')
          return a.MetaDistId - b.MetaDistId || a.MetaConstId - b.MetaConstId;
        if (sortBy === 'party')
          return (a.PoliticalPartyName || '').localeCompare(b.PoliticalPartyName || '');
        return 0;
      });
  }, [
    leaders,
    searchTerm,
    filterParty,
    filterStatus,
    filterState,
    filterDistrict,
    filterArea,
    sortBy,
    t,
  ]);

  const topParties = useMemo(() => {
    return Object.entries(overallStats)
      .sort((a, b) => b[1].leads + b[1].won - (a[1].leads + a[1].won))
      .slice(0, 5);
  }, [overallStats]);

  const prMapData = useMemo(() => {
    const leaderMap = new Map<string, PRByDistrict>();
    for (const d of prByDistrict) {
      const key = `${d.dist_id}-${d.const_id}`;
      if (!leaderMap.has(key) || d.total_votes > leaderMap.get(key)!.total_votes) {
        leaderMap.set(key, d);
      }
    }
    return Array.from(leaderMap.values()).map(
      (d) =>
        ({
          MetaDistId: d.dist_id,
          MetaConstId: d.const_id,
          CandidateName: d.party_name,
          PoliticalPartyName: d.party_name,
          TotalVoteReceived: d.total_votes,
          Remarks: '',
        }) as CandidateResult,
    );
  }, [prByDistrict]);

  const filteredPRData = useMemo(() => {
    const partyStats = prData.map((p) => {
      const partyRows = prByDistrict.filter((d) => d.party_name === p.party_name);
      const distMap = new Map<number, number>();
      partyRows.forEach((d) => {
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
        bestDistName: bestDistId > 0 ? t.getDistrictName(bestDistId) : '—',
      };
    });

    return partyStats
      .filter((p) => p.party_name.toLowerCase().includes(prSearchTerm.toLowerCase()))
      .sort((a, b) => {
        if (prSortBy === 'votes') return b.total_votes - a.total_votes;
        if (prSortBy === 'name') return a.party_name.localeCompare(b.party_name);
        if (prSortBy === 'best-district') return b.bestDistVotes - a.bestDistVotes;
        return 0;
      });
  }, [prData, prByDistrict, prSearchTerm, prSortBy, t]);

  const totalElected = leaders.filter(
    (r) => r.Remarks === ElectionRemarks.ELECTED || r.Remarks === ElectionRemarks.ELECTED_NP,
  ).length;

  const getHoverData = useCallback(
    (distId: number, constId: number, x: number, y: number): HoverInfo | null => {
      const distName = t.getDistrictName(distId);
      let candidates: CandidateResult[] = [];
      let hoverTitle = '';

      if (mapMode === MapMode.PR) {
        const distData = allCandidates.filter((r) => r.MetaDistId === distId);
        const partyMap = new Map<string, number>();
        distData.forEach((r) => {
          partyMap.set(
            r.PoliticalPartyName,
            (partyMap.get(r.PoliticalPartyName) || 0) + (r.TotalVoteReceived || 0),
          );
        });
        candidates = Array.from(partyMap.entries())
          .map(([party, votes]) => ({
            MetaDistId: distId,
            MetaConstId: 0,
            CandidateName: party,
            PoliticalPartyName: party,
            TotalVoteReceived: votes,
            Remarks: '',
          }))
          .sort((a, b) => (b.TotalVoteReceived || 0) - (a.TotalVoteReceived || 0))
          .slice(0, 5) as CandidateResult[];
        hoverTitle = `${distName} (${t.pr})`;
      } else {
        candidates = allCandidates
          .filter((c) => c.MetaDistId === distId && c.MetaConstId === constId)
          .sort((a, b) => (b.TotalVoteReceived || 0) - (a.TotalVoteReceived || 0))
          .slice(0, 5);
        hoverTitle = `${distName} • ${t.area} ${constId}`;
      }

      const distParties: Record<string, number> = {};
      leaders
        .filter((r) => r.MetaDistId === distId)
        .forEach((r) => {
          const p = r.PoliticalPartyName || 'Other';
          distParties[p] = (distParties[p] || 0) + 1;
        });

      return {
        level: mapMode === MapMode.PR ? 'district' : 'constituency',
        title: hoverTitle,
        distId,
        constId,
        parties: distParties,
        candidates,
        mouseX: x,
        mouseY: y,
      };
    },
    [allCandidates, leaders, mapMode, t],
  );

  return (
    <main className="flex-grow">
      {totalElected >= TOTAL_FPTP_SEATS - 1 && (
        <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />
      )}

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-57px)]">
        {/* LEFT: Map */}
        <div className="lg:w-[58%] p-4 flex flex-col gap-4">
          <div
            className={`rounded-2xl border overflow-hidden flex flex-col lg:h-[calc(100vh-80px)] ${cardClass}`}
          >
            <div
              className={`px-4 py-3 border-b flex items-center gap-2 flex-wrap flex-shrink-0 border-border-default`}
            >
              <div className="w-1.5 h-5 bg-brand-main rounded-full" />
              <span className={`font-bold text-sm text-text-main`}>{t.mapTitle}</span>
              <span className={`text-xs ${subTextClass}`}>
                {leaders.length} {t.constituencies}
              </span>
              <div
                className={`ml-auto flex items-center rounded-lg overflow-hidden border text-[10px] font-bold tracking-wider border-border-default`}
              >
                <button
                  onClick={() => setMapMode(MapMode.FPTP)}
                  className={`px-3 py-1.5 transition-colors ${mapMode === MapMode.FPTP ? 'bg-brand-main text-white' : 'text-text-muted hover:bg-surface-main'}`}
                >
                  {t.fptp}
                </button>
                <button
                  onClick={() => setMapMode(MapMode.PR)}
                  className={`px-3 py-1.5 transition-colors ${mapMode === MapMode.PR ? 'bg-accent-blue text-white' : 'text-text-muted hover:bg-surface-main'}`}
                >
                  {t.pr}
                </button>
              </div>
            </div>
            <div className="flex-grow min-h-0">
              <Suspense
                fallback={
                  <div className={`flex items-center justify-center h-full ${subTextClass}`}>
                    Loading map…
                  </div>
                }
              >
                <ElectionMap
                  resultsData={mapMode === MapMode.PR ? prMapData : leaders}
                  partyColors={PARTY_COLORS}
                  t={t}
                  onShare={(c) => {
                    setShareCandidate(c);
                    setIsShareModalOpen(true);
                  }}
                  onHover={(info) => {
                    if (!info) {
                      setHoverInfo(null);
                      return;
                    }
                    const hoverData = getHoverData(info.distId, info.constId, info.x, info.y);
                    setHoverInfo(hoverData);
                  }}
                />
              </Suspense>
            </div>
          </div>
          <PRHighlights prData={prData} prByDistrict={prByDistrict} t={t} />
        </div>

        {/* RIGHT: Stats + Insights */}
        <div className="lg:w-[42%] p-4 flex flex-col gap-4 overflow-y-auto">
          {/* Party Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {topParties.map(([party, counts]) => (
              <div
                key={party}
                className={`rounded-r-xl border p-3 border-l-4 relative overflow-hidden group ${cardClass}`}
                style={{ borderLeftColor: getPartyColor(party) }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                  style={{ backgroundColor: getPartyColor(party) }}
                />
                <div className={`flex gap-2 mb-1.5 text-[10px] font-bold uppercase`}>
                  <span className="text-accent-blue">
                    {counts.leads} {t.leads}
                  </span>
                  <span className="text-brand-main">
                    {counts.won} {t.won}
                  </span>
                </div>
                <div
                  className="text-3xl font-black leading-none"
                  style={{ color: getPartyColor(party) }}
                >
                  {counts.leads + counts.won}
                </div>
                <div
                  className={`text-[10px] font-bold mt-1.5 leading-tight break-words uppercase tracking-wide text-text-muted`}
                >
                  {party}
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className={`rounded-2xl border p-4 ${cardClass}`}>
            <div className="flex gap-4">
              <div className="flex-1 min-w-0">
                <div
                  className={`text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1 text-text-muted`}
                >
                  <div className="w-1.5 h-3 bg-brand-main rounded-full" />
                  {t.seatShare}
                </div>
                <div className="h-36">
                  <Doughnut
                    data={{
                      labels: topParties.map(([p]) => p),
                      datasets: [
                        {
                          data: topParties.map(([, c]) => c.leads + c.won),
                          backgroundColor: topParties.map(([p]) => getPartyColor(p)),
                          borderWidth: 0,
                          hoverOffset: 4,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '62%',
                      plugins: {
                        legend: { display: false },
                        datalabels: {
                          display: true,
                          color: '#fff',
                          font: { weight: 'bold', size: 11 },
                          formatter: (v: number) => (v > 0 ? v : ''),
                        },
                      },
                    }}
                  />
                </div>
              </div>
              <div className="w-px self-stretch bg-border-default" />
              <div className="flex-1 min-w-0">
                <div
                  className={`text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1 text-text-muted`}
                >
                  <div className="w-1.5 h-3 bg-accent-blue rounded-full" />
                  {t.prVoteShare}
                </div>
                <div className="h-36">
                  {prData.length > 0 ? (
                    <Doughnut
                      data={{
                        labels: prData.slice(0, 8).map((p) => p.party_name),
                        datasets: [
                          {
                            data: prData.slice(0, 8).map((p) => p.total_votes),
                            backgroundColor: prData
                              .slice(0, 8)
                              .map((p) => getPartyColor(p.party_name)),
                            borderWidth: 0,
                            hoverOffset: 4,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '62%',
                        plugins: {
                          legend: { display: false },
                          datalabels: {
                            display: true,
                            color: '#fff',
                            font: { weight: 'bold', size: 10 },
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            formatter: (v: any, ctx: any) => {
                              const total = (ctx.dataset.data as number[]).reduce(
                                (a: number, b: number) => a + b,
                                0,
                              );
                              const pct = ((Number(v) / total) * 100).toFixed(0);
                              return Number(pct) > 4 ? `${pct}%` : '';
                            },
                          },
                        },
                      }}
                    />
                  ) : (
                    <div
                      className={`flex items-center justify-center h-full text-[10px] italic ${subTextClass}`}
                    >
                      {t.awaitingData}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Insight Cards */}
          <div className={`rounded-2xl border p-4 ${cardClass}`}>
            <div className="font-bold text-sm mb-3 flex items-center gap-2 text-text-main">
              <div className="w-1.5 h-5 bg-accent-amber rounded-full" />
              {t.insights}
            </div>
            <InsightCards allCandidates={allCandidates} leaders={leaders} t={t} />
          </div>

          <div className="text-center text-[10px] pb-2 text-text-muted opacity-50">
            Official ECN data · Nepal Election 2082 · Built for Nepalis
          </div>
        </div>
      </div>

      {/* Tables Area */}
      <div className="px-4 pb-8 flex flex-col lg:flex-row gap-4 relative">
        {/* FPTP Table */}
        <div className={`flex-1 min-w-0 rounded-2xl border overflow-hidden ${cardClass}`}>
          <div
            className={`px-5 py-3 border-b flex flex-wrap items-center gap-3 border-border-default`}
          >
            <div className={`font-bold text-sm flex items-center gap-2 text-text-main`}>
              <div className="w-1.5 h-5 bg-brand-main rounded-full" />
              {t.fptp}
              <span className={`text-xs font-normal text-text-muted`}>
                {filteredLeaders.length}/{leaders.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 ml-auto items-center">
              <input
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`text-xs rounded-xl pl-3 pr-3 py-1.5 w-40 focus:outline-none focus:ring-1 focus:ring-brand-main bg-surface-main border border-border-default text-text-main placeholder-text-muted`}
              />
              <select
                value={filterParty}
                onChange={(e) => setFilterParty(e.target.value)}
                className={`text-xs rounded-xl px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-main bg-surface-main border border-border-default text-text-main`}
              >
                <option value="all">{t.allParties}</option>
                {Object.keys(overallStats).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`text-xs rounded-xl px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-main bg-surface-main border border-border-default text-text-main`}
              >
                <option value="all">{t.all}</option>
                <option value="elected">{t.statusElected}</option>
                <option value="leading">{t.statusLeading}</option>
              </select>
              <select
                value={filterState}
                onChange={(e) => {
                  setFilterState(e.target.value);
                  setFilterDistrict('all');
                  setFilterArea('all');
                }}
                className={`text-xs rounded-xl px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-main bg-surface-main border border-border-default text-text-main`}
              >
                <option value="all">{t.province}</option>
                {Array.from(
                  new Set(
                    allCandidates
                      .map((c) => c.StateName || t.getProvinceName(c.MetaDistId))
                      .filter(Boolean),
                  ),
                )
                  .sort()
                  .map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
              </select>
              <select
                value={filterDistrict}
                onChange={(e) => {
                  setFilterDistrict(e.target.value);
                  setFilterArea('all');
                }}
                className={`text-xs rounded-xl px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-main bg-surface-main border border-border-default text-text-main`}
              >
                <option value="all">{t.district}</option>
                {Array.from(
                  new Set(
                    allCandidates
                      .filter(
                        (c) =>
                          filterState === 'all' ||
                          (c.StateName || t.getProvinceName(c.MetaDistId)) === filterState,
                      )
                      .map((c) => t.getDistrictName(c.MetaDistId))
                      .filter(Boolean),
                  ),
                )
                  .sort()
                  .map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
              </select>
              <select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value)}
                className={`text-xs rounded-xl px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-main bg-surface-main border border-border-default text-text-main`}
              >
                <option value="all">{t.area}</option>
                {Array.from(
                  new Set(
                    leaders
                      .filter(
                        (l) =>
                          (filterState === 'all' || l.StateName === filterState) &&
                          (filterDistrict === 'all' ||
                            t.getDistrictName(l.MetaDistId) === filterDistrict),
                      )
                      .map((l) => l.MetaConstId),
                  ),
                )
                  .sort((a, b) => a - b)
                  .map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </select>
              <div
                className={`flex rounded-xl overflow-hidden border text-xs border-border-default`}
              >
                {(['votes', 'district', 'party'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSortBy(opt)}
                    className={`px-2.5 py-1.5 transition-colors ${sortBy === opt ? 'bg-brand-main text-white' : 'bg-surface-main text-text-muted hover:bg-surface-card'}`}
                  >
                    {opt === 'votes' ? t.votesSort : opt === 'district' ? t.district : t.party}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto" style={{ maxHeight: 480 }}>
            <table className="w-full text-xs text-left text-zinc-100 group">
              <thead className="sticky top-0 z-10 bg-surface-main text-text-muted uppercase font-semibold tracking-wide">
                <tr>
                  <th className="px-4 py-2.5">{t.colConst}</th>
                  <th className="px-4 py-2.5">
                    {t.colCand} ({t.qualification})
                  </th>
                  <th className="px-4 py-2.5">{t.party}</th>
                  <th className="px-4 py-2.5 text-right">{t.colVotes}</th>
                  <th className="px-4 py-2.5 text-center">{t.colStatus}</th>
                  <th className="px-4 py-2.5 text-center">{t.share}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default/50">
                {filteredLeaders.map((row, idx) => {
                  const distName = t.getDistrictName(row.MetaDistId);
                  const isElected =
                    row.Remarks === ElectionRemarks.ELECTED ||
                    row.Remarks === ElectionRemarks.ELECTED_NP;
                  const partyColor = getPartyColor(row.PoliticalPartyName);
                  return (
                    <tr
                      key={idx}
                      className={`transition-colors group cursor-crosshair hover:bg-surface-main/40`}
                      onMouseEnter={(e) => {
                        const hoverData = getHoverData(
                          row.MetaDistId,
                          row.MetaConstId,
                          e.clientX,
                          e.clientY,
                        );
                        setHoverInfo(hoverData);
                      }}
                      onMouseMove={(e) => {
                        setHoverInfo((prev) =>
                          prev ? { ...prev, mouseX: e.clientX, mouseY: e.clientY } : null,
                        );
                      }}
                      onMouseLeave={() => {
                        // Don't auto-dismiss for table rows to allow clicking the close/share buttons on the card
                      }}
                    >
                      <td className="px-4 py-2.5 font-medium whitespace-nowrap text-text-muted">
                        <div className="flex flex-col">
                          <span className="text-[10px] opacity-70 font-bold tracking-tight uppercase">
                            {row.StateName} · {distName}
                          </span>
                          <span className="text-sm text-text-main">
                            {distName}
                            <span className="ml-1 text-[10px] opacity-40">· {row.MetaConstId}</span>
                          </span>
                        </div>
                      </td>
                      <td
                        className={`px-4 py-2.5 font-semibold text-text-main group-hover:text-brand-main transition-colors`}
                      >
                        {row.CandidateName || '—'}
                        <span className={`px-4 py-2.5 opacity-40 italic truncate max-w-[40px]`}>
                          ({row.Qualification || '—'})
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: partyColor }}
                          />
                          <span className="text-xs truncate max-w-[140px] text-text-muted">
                            {row.PoliticalPartyName}
                          </span>
                        </div>
                      </td>
                      <td className={`px-4 py-2.5 text-right font-mono font-bold text-text-main`}>
                        {t.formatVotes(row.TotalVoteReceived || 0)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${isElected ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}
                        >
                          {isElected ? t.statusElected : t.statusLeading}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => {
                            setShareCandidate(row);
                            setIsShareModalOpen(true);
                          }}
                          className={`group/share flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-xl transition-all font-bold text-[10px] uppercase tracking-wider border bg-surface-main border-border-default text-brand-main hover:bg-brand-main hover:text-white hover:border-brand-main`}
                        >
                          <span className="transition-transform group-hover/share:-translate-y-0.5 group-hover/share:translate-x-0.5">
                            📤
                          </span>
                          <span className="hidden sm:inline-block">{t.share}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* PR Table */}
        <div
          className={`lg:w-[420px] rounded-2xl border overflow-hidden flex-shrink-0 ${cardClass}`}
        >
          <div
            className={`px-5 py-3 border-b flex flex-col sm:flex-row sm:items-center gap-3 border-border-default`}
          >
            <div className={`font-bold text-sm flex items-center gap-2 text-text-main`}>
              <div className="w-1.5 h-5 bg-accent-blue rounded-full" />
              {t.pr}
            </div>
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <input
                type="text"
                placeholder={t.search}
                value={prSearchTerm}
                onChange={(e) => setPrSearchTerm(e.target.value)}
                className={`text-[10px] rounded-xl px-3 py-1.5 w-28 focus:outline-none focus:ring-2 focus:ring-accent-blue/20 transition-all bg-surface-main border border-border-default text-text-main placeholder-text-muted`}
              />
              <div
                className={`flex rounded-xl overflow-hidden border text-[10px] font-bold border-border-default`}
              >
                {(['votes', 'name', 'best-district'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setPrSortBy(opt)}
                    className={`px-2 py-1.5 transition-all ${prSortBy === opt ? 'bg-accent-blue text-white' : 'bg-surface-main text-text-muted hover:bg-surface-card'}`}
                  >
                    {opt === 'votes' ? t.colVotes : opt === 'name' ? t.party : t.best}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 z-10 bg-surface-main text-text-muted uppercase font-semibold tracking-wide">
                <tr>
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">{t.party}</th>
                  <th className="px-4 py-2.5 text-right">{t.bestDistrict}</th>
                  <th className="px-4 py-2.5 text-right">{t.natVotes}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default/50">
                {filteredPRData.map((p, idx) => {
                  const color = getPartyColor(p.party_name);
                  const totalPRVotes = prData.reduce((s, x) => s + x.total_votes, 0);
                  const pct =
                    totalPRVotes > 0 ? ((p.total_votes / totalPRVotes) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={p.party_name} className={`transition-colors hover:bg-surface-main/40`}>
                      <td
                        className={`px-4 py-2.5 font-mono text-[10px] text-text-muted opacity-60`}
                      >
                        {idx + 1}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className={`font-medium truncate max-w-[150px] text-text-main`}>
                            {p.party_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className={`font-medium text-text-main`}>{p.bestDistName}</div>
                        <div className={`text-[9px] font-mono opacity-50 text-text-muted`}>
                          {t.formatVotes(p.bestDistVotes)} {t.votesLabel}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className={`font-mono font-bold text-[11px] text-text-main`}>
                          {t.formatVotes(p.total_votes)}
                        </div>
                        <div className={`text-[9px] opacity-50 text-text-muted`}>{pct}%</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {hoverInfo && (
        <HoverCard
          hoverInfo={hoverInfo}
          t={t}
          getPartyColor={getPartyColor}
          isMobile={isMobile}
          onClose={() => setHoverInfo(null)}
          onShare={(c) => {
            setShareCandidate(c);
            setIsShareModalOpen(true);
          }}
        />
      )}

      {shareCandidate && (
        <CandidateShareModal
          candidate={shareCandidate}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          getPartyColor={getPartyColor}
          t={t}
          districtName={t.getDistrictName(shareCandidate.MetaDistId)}
          others={allCandidates
            .filter(
              (c) =>
                c.MetaDistId === shareCandidate.MetaDistId &&
                c.MetaConstId === shareCandidate.MetaConstId &&
                c.CandidateName !== shareCandidate.CandidateName,
            )
            .sort((a, b) => (b.TotalVoteReceived || 0) - (a.TotalVoteReceived || 0))
            .slice(0, 3)}
        />
      )}
    </main>
  );
};

export default DashboardPage;
