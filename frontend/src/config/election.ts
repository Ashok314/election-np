export type ElectionPhase = 'upcoming' | 'live' | 'archived';

export interface ElectionConfig {
  id: string;
  year: number | null;
  gregorianYear: number | null;
  phase: ElectionPhase;
  dataPath: string;
  referenceMapYear: number | null;
}

export const elections: ElectionConfig[] = [
  {
    id: '2026',
    year: 2082,
    gregorianYear: 2026,
    phase: 'archived',
    dataPath: 'data/elections/2082',
    referenceMapYear: null,
  },
  {
    id: 'next',
    year: null,
    gregorianYear: null,
    phase: 'upcoming',
    dataPath: 'data/elections/next',
    referenceMapYear: 2026,
  },
];

export const defaultElection =
  elections.find((item) => item.phase === 'live') ??
  elections.find((item) => item.phase === 'archived') ??
  elections[0];

export function getElection(id: string | null) {
  return elections.find((item) => item.id === id) ?? defaultElection;
}

export function getRefreshIntervals(phase: ElectionPhase) {
  return phase === 'live' ? { fptp: 5000, pr: 60000 } : null;
}
