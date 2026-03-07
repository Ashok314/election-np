import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export interface PRPartyResult {
    party_name: string;
    total_votes: number;
    constituencies_counted?: number;
}

interface Props {
    prData: PRPartyResult[];
    theme: 'dark' | 'light';
    lang: 'en' | 'np';
    getPartyColor: (party: string) => string;
}

const TOTAL_PR_SEATS = 110;

export default function PRResults({ prData, theme, lang, getPartyColor }: Props) {
    const isDark = theme === 'dark';
    const card = isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100';
    const subText = isDark ? 'text-zinc-400' : 'text-gray-500';

    if (!prData || prData.length === 0) {
        return (
            <div className={`rounded-2xl border p-8 flex flex-col items-center justify-center gap-3 text-center ${card}`}>
                <span className="text-4xl">🗳️</span>
                <p className={`font-bold ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                    {lang === 'en' ? 'PR data loading…' : 'समानुपातिक तथ्यांक लोड हुँदैछ…'}
                </p>
                <p className={`text-xs ${subText}`}>
                    {lang === 'en'
                        ? 'Run pr-scraper.js to populate this section'
                        : 'यो खण्ड भर्न pr-scraper.js चलाउनुहोस्'}
                </p>
            </div>
        );
    }

    const totalVotes = prData.reduce((s, p) => s + p.total_votes, 0) || 1;
    const top10 = prData.slice(0, 10);

    // Projected seats (simple proportional, no threshold filter for now)
    const projectedSeats = (votes: number) =>
        Math.round((votes / totalVotes) * TOTAL_PR_SEATS);

    const barData = {
        labels: top10.map(p => p.party_name.length > 20 ? p.party_name.slice(0, 20) + '…' : p.party_name),
        datasets: [{
            data: top10.map(p => p.total_votes),
            backgroundColor: top10.map(p => getPartyColor(p.party_name)),
            borderRadius: 6,
            borderWidth: 0,
        }],
    };

    const barOptions = {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (ctx: any) => ` ${ctx.raw.toLocaleString()} votes`,
                },
            },
        },
        scales: {
            x: {
                ticks: { color: isDark ? '#71717a' : '#6b7280', font: { size: 10 } },
                grid: { color: isDark ? '#27272a' : '#f3f4f6' },
            },
            y: {
                ticks: { color: isDark ? '#a1a1aa' : '#374151', font: { size: 10 } },
                grid: { display: false },
            },
        },
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Summary label */}
            <div className={`text-[10px] uppercase font-bold tracking-widest ${subText}`}>
                {lang === 'en'
                    ? `Showing national PR vote totals · ${prData.length} parties · ${totalVotes.toLocaleString()} total votes`
                    : `राष्ट्रिय समानुपातिक मत · ${prData.length} दलहरू · ${totalVotes.toLocaleString()} कुल मत`}
            </div>

            {/* Horizontal Bar Chart */}
            <div className={`rounded-2xl border p-4 ${card}`}>
                <div className={`font-bold text-sm mb-3 flex items-center gap-2 ${isDark ? 'text-zinc-200' : 'text-gray-700'}`}>
                    <div className="w-1.5 h-5 bg-blue-500 rounded-full" />
                    {lang === 'en' ? 'PR Vote Share (Top 10)' : 'समानुपातिक मत (शीर्ष १०)'}
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
                            className={`rounded-r-xl border border-l-4 p-3 relative overflow-hidden group ${card}`}
                            style={{ borderLeftColor: color }}
                        >
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300" style={{ backgroundColor: color }} />

                            {/* Vote share % on top */}
                            <div className={`text-[10px] font-bold mb-1 uppercase`} style={{ color }}>
                                {pct}% share
                            </div>

                            {/* Vote count big */}
                            <div className="text-xl font-black leading-none" style={{ color }}>
                                {party.total_votes.toLocaleString()}
                            </div>

                            {/* Projected seats */}
                            <div className={`text-[10px] font-semibold mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                                ~{seats} {lang === 'en' ? 'seats' : 'सिट'}
                            </div>

                            {/* Party name */}
                            <div className={`text-[10px] font-bold mt-1.5 leading-tight break-words uppercase tracking-wide ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                                {party.party_name}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Disclaimer */}
            <p className={`text-[9px] ${subText} text-center`}>
                {lang === 'en'
                    ? '* Seat projections are proportional estimates only. Official allocation uses d\'Hondt method with threshold.'
                    : '* सिट अनुमान प्रायोगिक मात्र हो। आधिकारिक बाँडफाँट डी\'हन्ट विधिमा आधारित हुन्छ।'}
            </p>
        </div>
    );
}
