import { useMemo } from 'react';
import type { Locale } from '../locales/types';
import { COLORS } from '../constants/theme';

interface Props {
  prData: { party_name: string; total_votes: number }[];
  prByDistrict: { dist_id: number; const_id: number; party_name: string; total_votes: number }[];
  t: Locale;
}

interface PRInsight {
  emoji: string;
  label: string;
  value: string;
  sub: string;
  color: string;
}

export default function PRHighlights({ prData, prByDistrict, t }: Props) {
  const subTextClass = 'text-text-muted';

  const highlights: PRInsight[] = useMemo(() => {
    if (!prData.length || !prByDistrict.length) return [];

    const items: PRInsight[] = [];

    // 1. National Leader
    const natLeader = [...prData].sort((a, b) => b.total_votes - a.total_votes)[0];
    if (natLeader) {
      items.push({
        emoji: '👑',
        label: t.totalPRLeader,
        value: natLeader.party_name,
        sub: `${t.formatVotes(natLeader.total_votes)} ${t.natVotes}`,
        color: COLORS.blue,
      });
    }

    // 2. Closest PR Race (District level)
    const distIds = [...new Set(prByDistrict.map((d) => d.dist_id))];
    let minMargin = Infinity;
    let matchDistId = -1;
    let matchDetails = '';

    distIds.forEach((id) => {
      const districtRows = prByDistrict.filter((d) => d.dist_id === id);
      const partyTotals = new Map<string, number>();
      districtRows.forEach((r) =>
        partyTotals.set(r.party_name, (partyTotals.get(r.party_name) || 0) + r.total_votes),
      );
      const sorted = Array.from(partyTotals.entries()).sort((a, b) => b[1] - a[1]);
      if (sorted.length >= 2) {
        const margin = sorted[0][1] - sorted[1][1];
        if (margin > 0 && margin < minMargin) {
          minMargin = margin;
          matchDistId = id;
          matchDetails = `${sorted[0][0]} vs ${sorted[1][0]} · ${t.formatVotes(margin)} ${t.diff}`;
        }
      }
    });

    if (matchDistId > 0) {
      const dName = t.getDistrictName(matchDistId);
      items.push({
        emoji: '🤺',
        label: t.closestBattle,
        value: dName,
        sub: matchDetails,
        color: COLORS.red,
      });
    }

    // 3. Party Diversity (Total unique parties)
    items.push({
      emoji: '🚩',
      label: t.totalParties,
      value: t.formatVotes(prData.length),
      sub: t.prVoteShare,
      color: COLORS.emerald,
    });

    // 4. Total National PR Turnout
    const totalPrVotes = prData.reduce((acc, curr) => acc + curr.total_votes, 0);
    items.push({
      emoji: '📊',
      label: t.totalVotesLabel,
      value: t.formatVotes(totalPrVotes),
      sub: t.colVotes,
      color: COLORS.amber,
    });

    return items.slice(0, 4);
  }, [prData, prByDistrict, t]);

  if (!highlights.length) return null;

  return (
    <div className="grid grid-cols-2 gap-3 mt-4">
      {highlights.map((h, i) => (
        <div
          key={i}
          className="rounded-2xl border p-3.5 relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] bg-surface-card border-border-default text-text-main"
        >
          {/* Accent glow on hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl"
            style={{ backgroundColor: h.color }}
          />

          <div className="text-xl mb-1">{h.emoji}</div>

          <div
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: h.color }}
          >
            {h.label}
          </div>

          <div className={`font-black text-lg mt-0.5 leading-tight text-text-main`}>{h.value}</div>

          <div className={`text-[10px] mt-1 leading-snug truncate ${subTextClass}`}>{h.sub}</div>

          {/* Bottom accent bar */}
          <div
            className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500 rounded-b-2xl"
            style={{ backgroundColor: h.color }}
          />
        </div>
      ))}
    </div>
  );
}
