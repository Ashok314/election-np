import { useMemo } from 'react';

interface Props {
    prData: { party_name: string; total_votes: number }[];
    prByDistrict: { dist_id: number; const_id: number; party_name: string; total_votes: number }[];
    theme: 'dark' | 'light';
    lang: 'en' | 'np';
    districtLookup: Record<number, string>;
    districtLookupNp: Record<number, string>;
}

interface PRInsight {
    emoji: string;
    label: string;
    labelNp: string;
    value: string;
    sub: string;
    subNp: string;
    color: string;
}

export default function PRHighlights({ prData, prByDistrict, theme, lang, districtLookup, districtLookupNp }: Props) {
    const isDark = theme === 'dark';
    const cardClass = isDark
        ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
        : 'bg-white border-gray-200 text-gray-900 shadow-sm';
    const subTextClass = isDark ? 'text-zinc-500' : 'text-gray-500';

    const highlights: PRInsight[] = useMemo(() => {
        if (!prData.length || !prByDistrict.length) return [];

        const items: PRInsight[] = [];

        // 1. National Leader
        const natLeader = [...prData].sort((a, b) => b.total_votes - a.total_votes)[0];
        if (natLeader) {
            items.push({
                emoji: '👑',
                label: 'National PR Leader',
                labelNp: 'समानुपातिक अग्रणी',
                value: natLeader.party_name,
                sub: `${natLeader.total_votes.toLocaleString()} total votes`,
                subNp: `${natLeader.total_votes.toLocaleString()} कुल मत`,
                color: '#3b82f6'
            });
        }

        // 2. Closest PR Race (District level)
        const distIds = [...new Set(prByDistrict.map(d => d.dist_id))];
        let minMargin = Infinity;
        let matchDistId = -1;
        let matchDetails = '';
        let matchDetailsNp = '';

        distIds.forEach(id => {
            const districtRows = prByDistrict.filter(d => d.dist_id === id);
            const partyTotals = new Map<string, number>();
            districtRows.forEach(r => partyTotals.set(r.party_name, (partyTotals.get(r.party_name) || 0) + r.total_votes));
            const sorted = Array.from(partyTotals.entries()).sort((a, b) => b[1] - a[1]);
            if (sorted.length >= 2) {
                const margin = sorted[0][1] - sorted[1][1];
                if (margin > 0 && margin < minMargin) {
                    minMargin = margin;
                    matchDistId = id;
                    matchDetails = `${sorted[0][0]} vs ${sorted[1][0]} · ${margin.toLocaleString()} diff`;
                    matchDetailsNp = `${sorted[0][0]} vs ${sorted[1][0]} · ${margin.toLocaleString()} फरक`;
                }
            }
        });

        if (matchDistId > 0) {
            const dName = (lang === 'np' ? districtLookupNp[matchDistId] : districtLookup[matchDistId]) || `Dist ${matchDistId}`;
            items.push({
                emoji: '🤺',
                label: 'Closest PR Battle',
                labelNp: 'कडा प्रतिस्पर्धा',
                value: dName,
                sub: matchDetails,
                subNp: matchDetailsNp,
                color: '#ef4444'
            });
        }

        // 3. Party Diversity (Total unique parties)
        items.push({
            emoji: '🚩',
            label: 'Total PR Parties',
            labelNp: 'जम्मा सहभागी दल',
            value: prData.length.toString(),
            sub: 'Parties receiving valid PR votes',
            subNp: 'समानुपातिक मत पाउने दलहरू',
            color: '#10b981'
        });

        // 4. Total National PR Turnout
        const totalPrVotes = prData.reduce((acc, curr) => acc + curr.total_votes, 0);
        items.push({
            emoji: '📊',
            label: 'Total PR Votes',
            labelNp: 'जम्मा समानुपातिक मत',
            value: totalPrVotes.toLocaleString(),
            sub: 'Counted nationwide so far',
            subNp: 'हालसम्म गणना भएको मत',
            color: '#f59e0b'
        });

        return items.slice(0, 4);
    }, [prData, prByDistrict, lang, districtLookup, districtLookupNp]);

    if (!highlights.length) return null;

    return (
        <div className="grid grid-cols-2 gap-3 mt-4">
            {highlights.map((h, i) => (
                <div
                    key={i}
                    className={`rounded-2xl border p-3.5 relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] ${cardClass}`}
                >
                    {/* Accent glow on hover */}
                    <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl"
                        style={{ backgroundColor: h.color }}
                    />

                    <div className="text-xl mb-1">{h.emoji}</div>

                    <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: h.color }}>
                        {lang === 'np' ? h.labelNp : h.label}
                    </div>

                    <div className={`font-black text-lg mt-0.5 leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {h.value}
                    </div>

                    <div className={`text-[10px] mt-1 leading-snug truncate ${subTextClass}`}>
                        {lang === 'np' ? h.subNp : h.sub}
                    </div>

                    {/* Bottom accent bar */}
                    <div className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500 rounded-b-2xl" style={{ backgroundColor: h.color }} />
                </div>
            ))}
        </div>
    );
}

// Fixed a typo in PR Bastion logic (bestBestDist -> bestDist)
