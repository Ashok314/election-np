import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import type { Locale } from '../locales/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export interface PRPartyResult {
  party_name: string;
  total_votes: number;
  constituencies_counted?: number;
}

interface Props {
  prData: PRPartyResult[];
  t: Locale;
  getPartyColor: (party: string) => string;
}

const TOTAL_PR_SEATS = 110;

export default function PRResults({ prData, t, getPartyColor }: Props) {
  const cardClass = 'bg-surface-card border-border-default shadow-sm';
  const subTextClass = 'text-text-muted';

  if (!prData || prData.length === 0) {
    return (
      <div
        className={`rounded-2xl border p-8 flex flex-col items-center justify-center gap-3 text-center ${cardClass}`}
      >
        <span className="text-4xl">🗳️</span>
        <p className="font-bold text-text-main">{t.prLoading}</p>
        <p className={`text-xs ${subTextClass}`}>{t.awaitingData}</p>
      </div>
    );
  }

  const totalVotes = prData.reduce((s, p) => s + p.total_votes, 0) || 1;
  const top10 = prData.slice(0, 10);

  // Projected seats (simple proportional, no threshold filter for now)
  const projectedSeats = (votes: number) => Math.round((votes / totalVotes) * TOTAL_PR_SEATS);

  const barData = {
    labels: top10.map((p) =>
      p.party_name.length > 20 ? p.party_name.slice(0, 20) + '…' : p.party_name,
    ),
    datasets: [
      {
        data: top10.map((p) => p.total_votes),
        backgroundColor: top10.map((p) => getPartyColor(p.party_name)),
        borderRadius: 6,
        borderWidth: 0,
      },
    ],
  };

  const barOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: { raw: any }) => ` ${t.formatVotes(ctx.raw as number)} ${t.votesLabel}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: 'var(--text-muted)', font: { size: 10 } },
        grid: { color: 'var(--border-default)', opacity: 0.2 },
      },
      y: {
        ticks: { color: 'var(--text-muted)', font: { size: 10 } },
        grid: { display: false },
      },
    },
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Summary label */}
      <div className={`text-[10px] uppercase font-bold tracking-widest ${subTextClass}`}>
        {t.prVoteTotals(prData.length, t.formatVotes(totalVotes))}
      </div>

      {/* Horizontal Bar Chart */}
      <div className={`rounded-2xl border p-4 ${cardClass}`}>
        <div className="font-bold text-sm mb-3 flex items-center gap-2 text-text-main">
          <div className="w-1.5 h-5 bg-blue-500 rounded-full" />
          {t.prVoteShare} (Top 10)
        </div>
        <div style={{ height: Math.max(200, top10.length * 32) }}>
          <Bar data={barData} options={barOptions} />
        </div>
      </div>

      {/* Party Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {top10.map((party) => {
          const pct = ((party.total_votes / totalVotes) * 100).toFixed(1);
          const seats = projectedSeats(party.total_votes);
          const color = getPartyColor(party.party_name);
          return (
            <div
              key={party.party_name}
              className={`rounded-r-xl border border-l-4 p-3 relative overflow-hidden group ${cardClass}`}
              style={{ borderLeftColor: color }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                style={{ backgroundColor: color }}
              />

              {/* Vote share % on top */}
              <div className={`text-[10px] font-bold mb-1 uppercase`} style={{ color }}>
                {pct}
                {t.sharePct}
              </div>

              {/* Vote count big */}
              <div className="text-xl font-black leading-none" style={{ color }}>
                {t.formatVotes(party.total_votes)}
              </div>

              {/* Projected seats */}
              <div className="text-[10px] font-semibold mt-1 text-text-muted">
                ~{seats} {t.prFinished.split(' ')[0]}{' '}
                {/* Reuse part of label or just 'seats' if added to locale */}
              </div>

              {/* Party name */}
              <div className="text-[10px] font-bold mt-1.5 leading-tight break-words uppercase tracking-wide text-text-secondary opacity-60">
                {party.party_name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <p className={`text-[9px] ${subTextClass} text-center`}>{t.seatProjectionsDisclaimer}</p>
    </div>
  );
}
