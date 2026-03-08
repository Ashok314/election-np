import type { CandidateResult } from '../types/election';
import type { Locale } from '../locales/types';
import { COLORS } from '../constants/theme';

interface Props {
  allCandidates: CandidateResult[];
  leaders: CandidateResult[]; // one per constituency
  t: Locale;
}

interface InsightItem {
  emoji: string;
  label: string;
  value: string;
  sub: string;
  color: string;
}

export default function InsightCards({ allCandidates, leaders, t }: Props) {
  if (!leaders.length) return null;

  const cardClass = 'bg-surface-card border-border-default text-text-main';

  const subColorClass = 'text-text-muted';

  // 1. Closest race
  let closestRace: InsightItem | null = null;
  {
    let minMargin = Infinity;
    let closestConst = '';
    let closestSub = '';
    const constKeys = [...new Set(allCandidates.map((c) => `${c.MetaDistId}-${c.MetaConstId}`))];
    constKeys.forEach((key) => {
      const sorted = allCandidates
        .filter((c) => `${c.MetaDistId}-${c.MetaConstId}` === key)
        .sort((a, b) => (b.TotalVoteReceived || 0) - (a.TotalVoteReceived || 0));
      if (sorted.length >= 2) {
        const margin = (sorted[0].TotalVoteReceived || 0) - (sorted[1].TotalVoteReceived || 0);
        if (margin < minMargin) {
          minMargin = margin;
          const [d, c] = key.split('-');
          const distId = parseInt(d, 10);
          const distName = t.getDistrictName(distId);
          closestConst = `${distName} • ${t.area} ${c}`;
          closestSub = t.getClosestMarginText(sorted[0].CandidateName, t.formatVotes(margin));
        }
      }
    });
    closestRace = {
      emoji: '⚖️',
      label: t.closestRace,
      value: closestConst,
      sub: closestSub,
      color: COLORS.amber,
    };
  }

  // 2. Highest vote received
  const topVote = [...leaders].sort(
    (a, b) => (b.TotalVoteReceived || 0) - (a.TotalVoteReceived || 0),
  )[0];
  const highestVote: InsightItem = {
    emoji: '🗳️',
    label: t.mostVotes,
    value: t.formatVotes(topVote?.TotalVoteReceived || 0),
    sub: topVote
      ? `${topVote.CandidateName} · ${topVote.PoliticalPartyName} · ${t.getDistrictName(topVote.MetaDistId)}`
      : '—',
    color: COLORS.emerald,
  };

  // 3. Youngest leading
  const withAge = leaders
    .filter((c) => c.Age && c.Age > 0)
    .sort((a, b) => (a.Age || 99) - (b.Age || 99));
  const youngest = withAge[0];
  const youngestCard: InsightItem = {
    emoji: '🧒',
    label: t.youngestLeading,
    value: youngest ? `${youngest.Age} ${t.yrs}` : 'N/A',
    sub: youngest ? `${youngest.CandidateName} · ${youngest.PoliticalPartyName}` : t.noData,
    color: COLORS.indigo,
  };

  // 4. Oldest leading
  const oldest = withAge.length ? withAge[withAge.length - 1] : null;
  const oldestCard: InsightItem = {
    emoji: '👴',
    label: t.oldestLeading,
    value: oldest ? `${oldest.Age} ${t.yrs}` : 'N/A',
    sub: oldest ? `${oldest.CandidateName} · ${oldest.PoliticalPartyName}` : t.noData,
    color: COLORS.violet,
  };

  // 5. Women in the lead
  const womenLeading = leaders.filter(
    (c) => c.Gender === 'महिला' || c.Gender === 'Female' || c.Gender === 'female',
  );
  const womenCard: InsightItem = {
    emoji: '👩',
    label: t.womenLeading,
    value: t.formatVotes(womenLeading.length),
    sub: womenLeading.length
      ? womenLeading
          .slice(0, 2)
          .map((w) => w.CandidateName)
          .join(', ')
      : t.noData,
    color: COLORS.pink,
  };

  // 6. Most contested
  const countsBySeat: Record<string, number> = {};
  allCandidates.forEach((c) => {
    const key = `${c.MetaDistId}-${c.MetaConstId}`;
    countsBySeat[key] = (countsBySeat[key] || 0) + 1;
  });
  const mostContested = Object.entries(countsBySeat).sort((a, b) => b[1] - a[1])[0];
  const mostContestedCard: InsightItem = {
    emoji: '🏟️',
    label: t.mostContested,
    value: mostContested ? `${t.formatVotes(mostContested[1])} ${t.candidates}` : 'N/A',
    sub: mostContested
      ? `${t.getDistrictName(parseInt(mostContested[0].split('-')[0]))} • ${t.area} ${mostContested[0].split('-')[1]}`
      : t.noData,
    color: COLORS.amber, // standardizing orange-ish to amber
  };

  // 7. Landslide Win (Largest Vote Margin)
  let landslideWin: InsightItem | null = null;
  {
    let maxMargin = -1;
    let winner = '';
    let winnerSub = '';
    const constKeys = [...new Set(allCandidates.map((c) => `${c.MetaDistId}-${c.MetaConstId}`))];
    constKeys.forEach((key) => {
      const sorted = allCandidates
        .filter((c) => `${c.MetaDistId}-${c.MetaConstId}` === key)
        .sort((a, b) => (b.TotalVoteReceived || 0) - (a.TotalVoteReceived || 0));
      if (sorted.length >= 2) {
        const margin = (sorted[0].TotalVoteReceived || 0) - (sorted[1].TotalVoteReceived || 0);
        if (margin > maxMargin) {
          maxMargin = margin;
          winner = sorted[0].CandidateName;
          winnerSub = t.getLandslideMarginText(sorted[0].PoliticalPartyName, t.formatVotes(margin));
        }
      }
    });
    landslideWin = {
      emoji: '🌊',
      label: t.landslideLead,
      value: winner || '—',
      sub: winnerSub || t.awaitingData,
      color: COLORS.blue, // standardizing cyan to blue
    };
  }

  // 8. Total Candidates
  const totalCandidatesCard: InsightItem = {
    emoji: '👥',
    label: t.totalCandidates,
    value: t.formatVotes(
      new Set(allCandidates.map((c) => `${c.MetaDistId}-${c.MetaConstId}-${c.CandidateName}`)).size,
    ),
    sub: t.footerText.split('।')[0].split('.')[0], // Generic sub
    color: COLORS.blue,
  };

  // 9. Independent Force
  const independentLeaders = leaders.filter(
    (c) => c.PoliticalPartyName === 'स्वतन्त्र' || c.PoliticalPartyName === 'Independent',
  );
  const independentCard: InsightItem = {
    emoji: '✊',
    label: t.independentForce,
    value: t.formatVotes(independentLeaders.length),
    sub: independentLeaders.length
      ? `${t.formatVotes(independentLeaders.length)} ${t.constituencies} ${t.leads}`
      : t.noData,
    color: COLORS.violet,
  };

  // 10. Win Variety (Count of unique parties leading in seats)
  const uniqueWinningParties = new Set(leaders.map((c) => c.PoliticalPartyName)).size;
  const winVarietyCard: InsightItem = {
    emoji: '🌈',
    label: t.winningParties,
    value: t.formatVotes(uniqueWinningParties),
    sub: t.subTitle,
    color: COLORS.pink,
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
    winVarietyCard,
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {insights.map((item, i) => (
        <div
          key={i}
          className={`rounded-2xl border p-3.5 relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] ${cardClass}`}
        >
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl"
            style={{ backgroundColor: item.color }}
          />
          <div className="text-xl mb-1">{item.emoji}</div>
          <div
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: item.color }}
          >
            {item.label}
          </div>
          <div className={`font-black text-lg mt-0.5 leading-tight text-text-main`}>
            {item.value}
          </div>
          <div className={`text-[10px] mt-1 leading-snug truncate ${subColorClass}`}>
            {item.sub}
          </div>
          <div
            className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500 rounded-b-2xl"
            style={{ backgroundColor: item.color }}
          />
        </div>
      ))}
    </div>
  );
}
