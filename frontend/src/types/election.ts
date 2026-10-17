export interface CandidateResult {
  CandidateName: string;
  PoliticalPartyName: string;
  TotalVoteReceived: number;
  ElectedVoteReceived?: number;
  Margin?: number;
  Remarks: string;
  MetaDistId: number;
  MetaConstId: number;
  DistrictName?: string;
  StateName?: string;
  Qualification?: string;
  Gender?: string;
  Age?: number;
}

export interface PRResult {
  party_name: string;
  total_votes: number;
  constituencies_counted: number;
}

export interface PRByDistrict {
  dist_id: number;
  const_id: number;
  party_name: string;
  total_votes: number;
}

export interface OverallStats {
  [party: string]: {
    leads: number;
    won: number;
  };
}

export const Lang = {
  EN: 'en',
  NP: 'np',
  JP: 'jp',
} as const;
export type Lang = (typeof Lang)[keyof typeof Lang];

export const Theme = {
  DARK: 'dark',
  LIGHT: 'light',
} as const;
export type Theme = (typeof Theme)[keyof typeof Theme];

export const LiveStatus = {
  LIVE: 'live',
  POLLING: 'polling',
  CONNECTING: 'connecting',
} as const;
export type LiveStatus = (typeof LiveStatus)[keyof typeof LiveStatus];

export const MapMode = {
  FPTP: 'fptp',
  PR: 'pr',
} as const;
export type MapMode = (typeof MapMode)[keyof typeof MapMode];

export const ElectionRemarks = {
  ELECTED: 'Elected',
  ELECTED_NP: 'निर्वाचित',
  LEADING: 'Leading',
  LEADING_NP: 'अग्रता',
} as const;
export type ElectionRemarks = (typeof ElectionRemarks)[keyof typeof ElectionRemarks];

export const PartyNames = {
  INDEPENDENT: 'स्वतन्त्र',
  INDEPENDENT_EN: 'Independent',
} as const;
export type PartyNames = (typeof PartyNames)[keyof typeof PartyNames];

export const Gender = {
  FEMALE: 'Female',
  FEMALE_LOWER: 'female',
  FEMALE_NP: 'महिला',
  MALE: 'Male',
  MALE_NP: 'पुरुष',
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];
