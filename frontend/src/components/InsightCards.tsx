import type { CandidateResult } from './ElectionMap';

interface Props {
    allCandidates: CandidateResult[];
    leaders: CandidateResult[];           // one per constituency
    theme: 'dark' | 'light';
    lang: 'en' | 'np';
}

interface InsightItem {
    emoji: string;
    label: string;
    labelNp: string;
    value: string;
    sub: string;
    color: string;
}

export default function InsightCards({ allCandidates, leaders, theme, lang }: Props) {
    if (!leaders.length) return null;

    const card = (theme === 'dark')
        ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
        : 'bg-white border-gray-200 text-gray-900 shadow-sm';

    const subColor = theme === 'dark' ? 'text-zinc-500' : 'text-gray-500';

    // Build insights ───────────────────────────────────────────────────────────

    // 1. Closest race (smallest vote margin between #1 and #2)
    let closestRace: InsightItem | null = null;
    {
        let minMargin = Infinity;
        let closestConst = '';
        let closestSub = '';
        const constKeys = [...new Set(allCandidates.map(c => `${c.MetaDistId}-${c.MetaConstId}`))];
        constKeys.forEach(key => {
            const sorted = allCandidates
                .filter(c => `${c.MetaDistId}-${c.MetaConstId}` === key)
                .sort((a, b) => (b.TotalVoteReceived || 0) - (a.TotalVoteReceived || 0));
            if (sorted.length >= 2) {
                const margin = (sorted[0].TotalVoteReceived || 0) - (sorted[1].TotalVoteReceived || 0);
                if (margin < minMargin) {
                    minMargin = margin;
                    const [d, c] = key.split('-');
                    closestConst = `Dist ${d} • Const ${c}`;
                    closestSub = `${sorted[0].CandidateName} leads by ${margin.toLocaleString()} votes`;
                }
            }
        });
        closestRace = {
            emoji: '⚖️',
            label: 'Closest Race',
            labelNp: 'कडा प्रतिस्पर्धा',
            value: closestConst,
            sub: closestSub,
            color: '#f59e0b',
        };
    }

    // 2. Highest vote received
    const topVote = [...leaders].sort((a, b) => (b.TotalVoteReceived || 0) - (a.TotalVoteReceived || 0))[0];
    const highestVote: InsightItem = {
        emoji: '🗳️',
        label: 'Most Votes',
        labelNp: 'सर्वाधिक मत',
        value: (topVote?.TotalVoteReceived || 0).toLocaleString(),
        sub: `${topVote?.CandidateName || '—'} · ${topVote?.PoliticalPartyName || ''}`,
        color: '#10b981',
    };

    // 3. Youngest leading candidate
    const withAge = leaders.filter(c => c.Age && c.Age > 0).sort((a, b) => (a.Age || 99) - (b.Age || 99));
    const youngest = withAge[0];
    const youngestCard: InsightItem = youngest ? {
        emoji: '🧒',
        label: 'Youngest Leading',
        labelNp: 'कान्छो अग्रता',
        value: `${youngest.Age} yrs`,
        sub: `${youngest.CandidateName} · ${youngest.PoliticalPartyName}`,
        color: '#6366f1',
    } : {
        emoji: '🧒',
        label: 'Youngest Leading',
        labelNp: 'कान्छो अग्रता',
        value: 'N/A',
        sub: 'Age data not available',
        color: '#6366f1',
    };

    // 4. Oldest leading candidate
    const oldest = withAge.length ? withAge[withAge.length - 1] : null;
    const oldestCard: InsightItem = oldest ? {
        emoji: '👴',
        label: 'Oldest Leading',
        labelNp: 'जेष्ठ अग्रता',
        value: `${oldest.Age} yrs`,
        sub: `${oldest.CandidateName} · ${oldest.PoliticalPartyName}`,
        color: '#8b5cf6',
    } : {
        emoji: '👴',
        label: 'Oldest Leading',
        labelNp: 'जेष्ठ अग्रता',
        value: 'N/A',
        sub: 'Age data not available',
        color: '#8b5cf6',
    };

    // 5. Women in the lead
    const womenLeading = leaders.filter(c => c.Gender === 'महिला' || c.Gender === 'Female' || c.Gender === 'female');
    const womenCard: InsightItem = {
        emoji: '👩',
        label: 'Women Leading',
        labelNp: 'महिला अग्रता',
        value: womenLeading.length.toString(),
        sub: womenLeading.length ? womenLeading.slice(0, 2).map(w => w.CandidateName).join(', ') : 'No reported women leaders yet',
        color: '#ec4899',
    };

    // 6. Most contested: constituency with most candidates
    const countsBySeat: Record<string, number> = {};
    allCandidates.forEach(c => {
        const key = `${c.MetaDistId}-${c.MetaConstId}`;
        countsBySeat[key] = (countsBySeat[key] || 0) + 1;
    });
    const mostContested = Object.entries(countsBySeat).sort((a, b) => b[1] - a[1])[0];
    const mostContestedCard: InsightItem = mostContested ? {
        emoji: '🏟️',
        label: 'Most Contested',
        labelNp: 'सबैभन्दा भिडन्त',
        value: `${mostContested[1]} candidates`,
        sub: `Dist ${mostContested[0].split('-')[0]} • Const ${mostContested[0].split('-')[1]}`,
        color: '#f97316',
    } : {
        emoji: '🏟️',
        label: 'Most Contested',
        labelNp: 'सबैभन्दा भिडन्त',
        value: 'N/A',
        sub: 'No data',
        color: '#f97316',
    };

    // 7. Total Candidates
    const uniqueCandidateNames = new Set(allCandidates.map(c => `${c.MetaDistId}-${c.MetaConstId}-${c.CandidateName}`));
    const totalCandidatesCard: InsightItem = {
        emoji: '👥',
        label: 'Total Candidates',
        labelNp: 'जम्मा उम्मेदवार',
        value: uniqueCandidateNames.size.toLocaleString(),
        sub: 'Across all compiled districts',
        color: '#3b82f6',
    };

    const insights: InsightItem[] = [
        closestRace!,
        highestVote,
        youngestCard,
        oldestCard,
        womenCard,
        mostContestedCard,
        totalCandidatesCard,
    ];

    return (
        <div className="grid grid-cols-2 gap-3">
            {insights.map((item, i) => (
                <div
                    key={i}
                    className={`rounded-2xl border p-3.5 relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] ${card}`}
                >
                    {/* Accent glow on hover */}
                    <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl"
                        style={{ backgroundColor: item.color }}
                    />
                    <div className="text-xl mb-1">{item.emoji}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: item.color }}>
                        {lang === 'np' ? item.labelNp : item.label}
                    </div>
                    <div className={`font-black text-lg mt-0.5 leading-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {item.value}
                    </div>
                    <div className={`text-[10px] mt-1 leading-snug truncate ${subColor}`}>
                        {item.sub}
                    </div>
                    {/* Bottom accent bar */}
                    <div className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500 rounded-b-2xl" style={{ backgroundColor: item.color }} />
                </div>
            ))}
        </div>
    );
}
