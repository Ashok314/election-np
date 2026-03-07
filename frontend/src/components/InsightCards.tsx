import type { CandidateResult } from './ElectionMap';

interface Props {
    allCandidates: CandidateResult[];
    leaders: CandidateResult[];           // one per constituency
    theme: 'dark' | 'light';
    lang: 'en' | 'np';
    districtLookup: Record<number, string>;
    districtLookupNp: Record<number, string>;
}

interface InsightItem {
    emoji: string;
    label: string;
    labelNp: string;
    value: string;
    sub: string;
    color: string;
}

export default function InsightCards({ allCandidates, leaders, theme, lang, districtLookup, districtLookupNp }: Props) {
    if (!leaders.length) return null;

    const card = (theme === 'dark')
        ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
        : 'bg-white border-gray-200 text-gray-900 shadow-sm';

    const subColor = theme === 'dark' ? 'text-zinc-500' : 'text-gray-500';

    // 1. Closest race
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
                    const distId = parseInt(d, 10);
                    const distName = (lang === 'np' ? districtLookupNp[distId] : districtLookup[distId]) || `District ${d}`;
                    closestConst = `${distName} • Area ${c}`;
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
    const topVoteDist = topVote ? (lang === 'en' ? districtLookup[topVote.MetaDistId] : districtLookupNp[topVote.MetaDistId]) : '';
    const highestVote: InsightItem = {
        emoji: '🗳️',
        label: 'Most Votes',
        labelNp: 'सर्वाधिक मत',
        value: (topVote?.TotalVoteReceived || 0).toLocaleString(),
        sub: topVote ? `${topVote.CandidateName} · ${topVote.PoliticalPartyName} · ${topVoteDist}` : '—',
        color: '#10b981',
    };

    // 3. Youngest leading
    const withAge = leaders.filter(c => c.Age && c.Age > 0).sort((a, b) => (a.Age || 99) - (b.Age || 99));
    const youngest = withAge[0];
    const youngestCard: InsightItem = {
        emoji: '🧒',
        label: 'Youngest Leading',
        labelNp: 'कान्छो अग्रता',
        value: youngest ? `${youngest.Age} yrs` : 'N/A',
        sub: youngest ? `${youngest.CandidateName} · ${youngest.PoliticalPartyName}` : 'No age data',
        color: '#6366f1',
    };

    // 4. Oldest leading
    const oldest = withAge.length ? withAge[withAge.length - 1] : null;
    const oldestCard: InsightItem = {
        emoji: '👴',
        label: 'Oldest Leading',
        labelNp: 'जेष्ठ अग्रता',
        value: oldest ? `${oldest.Age} yrs` : 'N/A',
        sub: oldest ? `${oldest.CandidateName} · ${oldest.PoliticalPartyName}` : 'No age data',
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

    // 6. Most contested
    const countsBySeat: Record<string, number> = {};
    allCandidates.forEach(c => {
        const key = `${c.MetaDistId}-${c.MetaConstId}`;
        countsBySeat[key] = (countsBySeat[key] || 0) + 1;
    });
    const mostContested = Object.entries(countsBySeat).sort((a, b) => b[1] - a[1])[0];
    const mostContestedCard: InsightItem = {
        emoji: '🏟️',
        label: 'Most Contested',
        labelNp: 'सबैभन्दा भिडन्त',
        value: mostContested ? `${mostContested[1]} candidates` : 'N/A',
        sub: mostContested ? `${lang === 'en' ? districtLookup[parseInt(mostContested[0].split('-')[0])] : districtLookupNp[parseInt(mostContested[0].split('-')[0])]} • Area ${mostContested[0].split('-')[1]}` : 'No data',
        color: '#f97316',
    };

    // 7. Landslide Win (Largest Vote Margin)
    let landslideWin: InsightItem | null = null;
    {
        let maxMargin = -1;
        let winner = '';
        let winnerSub = '';
        const constKeys = [...new Set(allCandidates.map(c => `${c.MetaDistId}-${c.MetaConstId}`))];
        constKeys.forEach(key => {
            const sorted = allCandidates
                .filter(c => `${c.MetaDistId}-${c.MetaConstId}` === key)
                .sort((a, b) => (b.TotalVoteReceived || 0) - (a.TotalVoteReceived || 0));
            if (sorted.length >= 2) {
                const margin = (sorted[0].TotalVoteReceived || 0) - (sorted[1].TotalVoteReceived || 0);
                if (margin > maxMargin) {
                    maxMargin = margin;
                    winner = sorted[0].CandidateName;
                    winnerSub = `${sorted[0].PoliticalPartyName} · ${margin.toLocaleString()} margin`;
                }
            }
        });
        landslideWin = {
            emoji: '🌊',
            label: 'Landslide Lead',
            labelNp: 'भारी मतान्तर',
            value: winner || '—',
            sub: winnerSub || 'Calculating margin...',
            color: '#06b6d4',
        };
    }

    // 8. Total Candidates
    const totalCandidatesCard: InsightItem = {
        emoji: '👥',
        label: 'Total Candidates',
        labelNp: 'जम्मा उम्मेदवार',
        value: new Set(allCandidates.map(c => `${c.MetaDistId}-${c.MetaConstId}-${c.CandidateName}`)).size.toLocaleString(),
        sub: 'Across all compiled seats',
        color: '#3b82f6',
    };

    // 9. Independent Force
    const independentLeaders = leaders.filter(c => c.PoliticalPartyName === 'स्वतन्त्र' || c.PoliticalPartyName === 'Independent');
    const independentCard: InsightItem = {
        emoji: '✊',
        label: 'Independent Force',
        labelNp: 'स्वतन्त्र शक्ति',
        value: independentLeaders.length.toString(),
        sub: independentLeaders.length ? `${independentLeaders.length} seats leading by independents` : 'No independents leading yet',
        color: '#8b5cf6',
    };

    // 10. Win Variety (Count of unique parties leading in seats)
    const uniqueWinningParties = new Set(leaders.map(c => c.PoliticalPartyName)).size;
    const winVarietyCard: InsightItem = {
        emoji: '🌈',
        label: 'Winning Parties',
        labelNp: 'प्रमुख विजयी दल',
        value: uniqueWinningParties.toString(),
        sub: `Different parties in the lead`,
        color: '#ec4899',
    };

    const insights: InsightItem[] = [
        closestRace!,
        highestVote,
        landslideWin!,
        youngestCard,
        oldestCard,
        womenCard,
        mostContestedCard,
        totalCandidatesCard,
        independentCard,
        winVarietyCard
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
