export interface Locale {
  // Identity & Header
  title: string;
  subTitle: string;
  lastUpdated: string;
  autoRefresh: string;
  totalDeclared: string;
  prFinished: string;
  live: string;
  polling: string;
  connect: string;

  // Search & Filters
  searchPlaceholder: string;
  search: string;
  allParties: string;
  all: string;
  province: string;
  district: string;
  area: string;
  votesSort: string;
  best: string;

  // Map & Dashboard Sections
  mapTitle: string;
  showMap: string;
  hideMap: string;
  insights: string;
  seatShare: string;
  prVoteShare: string;
  awaitingData: string;
  prLoading: string;

  // Tables
  tableTitle: string;
  colConst: string;
  colCand: string;
  colParty: string;
  colVotes: string;
  colStatus: string;
  colEdu: string;
  qualification: string;
  party: string;
  natVotes: string;
  bestDistrict: string;

  // Status Labels
  leads: string;
  won: string;
  statusElected: string;
  statusLeading: string;
  electedRaw: string;
  leadingRaw: string;

  // Insights
  totalPRLeader: string;
  closestBattle: string;
  totalParties: string;
  totalVotesLabel: string;
  closestRace: string;
  prVoteTotals: (partyCount: number, totalVotes: string) => string;
  seatProjectionsDisclaimer: string;
  sharePct: string;
  mostVotes: string;
  youngestLeading: string;
  oldestLeading: string;
  womenLeading: string;
  mostContested: string;
  landslideLead: string;
  totalCandidates: string;
  independentForce: string;
  winningParties: string;
  noData: string;
  yrs: string;
  candidates: string;
  diff: string;
  margin: string;

  // Sharing & Modal
  share: string;
  shareWinCard: string;
  downloadForTikTok: string;
  post: string;
  copyURL: string;
  copyText: string;
  textCopied: string;
  linkCopied: string;
  downloadFailed: string;
  runnersUp: string;
  votesReceived: string;

  // Global Labels
  fptp: string;
  pr: string;
  constituencies: string;
  votesLabel: string;
  footerText: string;
  shareThisDashboard: string;
  shareDashboardText: string;

  // Helper Functions
  getDistrictName: (id: number) => string;
  getProvinceName: (idOrName: number | string) => string;
  formatVotes: (v: number) => string;
  getShareText: (
    name: string,
    party: string,
    statusLabel: string,
    votes: string,
    dist: string,
    area: number,
    url: string,
  ) => string;
  getClosestMarginText: (name: string, margin: string) => string;
  getLandslideMarginText: (party: string, margin: string) => string;
}
