import type { Locale } from './types';
import { districtLookupNp, provinceLookup } from '../constants/electionData';

export const np: Locale = {
  title: 'नेपाल २०८२',
  subTitle: 'प्रतिनिधि सभा • प्रत्यक्ष मतगणना',
  lastUpdated: 'अपडेट:',
  autoRefresh: 'प्रत्यक्ष',
  totalDeclared: 'विजयी',
  prFinished: 'समानुपातिक जिल्ला',
  live: 'लाइभ',
  polling: 'मतदान',
  connect: 'सञ्जाल',

  searchPlaceholder: 'उम्मेदवार वा सिट खोज्नुहोस्...',
  search: 'खोज्नुहोस्...',
  allParties: 'सबै दल',
  all: 'सबै',
  province: 'प्रदेश',
  district: 'जिल्ला',
  area: 'क्षेत्र',
  votesSort: 'मत ↓',
  best: 'उत्कृष्ट',

  mapTitle: 'निर्वाचन नक्सा',
  showMap: '🔽 नक्सा देखाउनुहोस्',
  hideMap: '🔼 नक्सा लुकाउनुहोस्',
  insights: 'डेटा अन्तर्दृष्टि',
  seatShare: 'सिट विभाजन',
  prVoteShare: 'समानुपातिक मत',
  awaitingData: 'तथ्यांक लोड हुँदैछ...',
  prLoading: 'समानुपातिक तथ्यांक लोड हुँदैछ…',

  tableTitle: 'अग्रणी उम्मेदवारहरू',
  colConst: 'क्षेत्र',
  colCand: 'उम्मेदवार',
  colParty: 'दल',
  colVotes: 'मत',
  colStatus: 'अवस्था',
  colEdu: 'शिक्षा',
  qualification: 'शैक्षिक योग्यता',
  party: 'दल',
  natVotes: 'कुल मत',
  bestDistrict: 'उत्कृष्ट जिल्ला',

  leads: 'अग्रता',
  won: 'विजयि',
  statusElected: 'निर्वाचित',
  statusLeading: 'अग्रता',
  electedRaw: 'निर्वाचित',
  leadingRaw: 'अग्रता',

  totalPRLeader: 'समानुपातिक अग्रणी',
  closestBattle: 'कडा प्रतिस्पर्धा',
  totalParties: 'जम्मा सहभागी दल',
  totalVotesLabel: 'जम्मा समानुपातिक मत',
  closestRace: 'कडा प्रतिस्पर्धा',
  prVoteTotals: (count, total) => `राष्ट्रिय समानुपातिक मत · ${count} दलहरू · ${total} कुल मत`,
  seatProjectionsDisclaimer:
    "* सिट अनुमान प्रायोगिक मात्र हो। आधिकारिक बाँडफाँट डी'हन्ट विधिमा आधारित हुन्छ।",
  sharePct: '% हिस्सा',
  mostVotes: 'सर्वाधिक मत',
  youngestLeading: 'कान्छो अग्रता',
  oldestLeading: 'जेष्ठ अग्रता',
  womenLeading: 'महिला अग्रता',
  mostContested: 'सबैभन्दा भिडन्त',
  landslideLead: 'भारी मतान्तर',
  totalCandidates: 'जम्मा उम्मेदवार',
  independentForce: 'स्वतन्त्र शक्ति',
  winningParties: 'प्रमुख विजयी दल',
  noData: 'डाटा छैन',
  yrs: 'वर्ष',
  candidates: 'उम्मेदवार',
  diff: 'फरक',
  margin: 'मतान्तर',

  share: 'शेयर',
  shareWinCard: 'नतिजा शेयर गर्नुहोस्',
  downloadForTikTok: 'फोटो डाउनलोड गर्नुहोस्',
  post: 'पोष्ट',
  copyURL: 'लिंक कपी',
  copyText: 'विवरण कपी',
  textCopied: '✓ कपी भयो',
  linkCopied: '✓ कपी भयो',
  downloadFailed: 'डाउनलोड गर्न सकिएन। कृपया पुनः प्रयास गर्नुहोस् वा स्क्रिनसट लिनुहोस्।',
  runnersUp: 'निकटतम प्रतिस्पर्धी',
  votesReceived: 'प्राप्त मत',

  fptp: 'प्रत्यक्ष',
  pr: 'समानुपातिक',
  constituencies: 'क्षेत्रहरू',
  votesLabel: 'मत',
  footerText: 'आधिकारिक ECN डेटा द्वारा संचालित समानुपातिक र प्रताक्ष्य अन्तर्दृष्टि।',
  shareThisDashboard: 'यो ड्यासबोर्ड शेयर गर्नुहोस्',
  shareDashboardText:
    '२०८२ को नेपाल निर्वाचन लाइभ ड्यासबोर्ड हेर्नुहोस्! समानुपातिक र प्रत्यक्ष नतिजाहरू।',

  getDistrictName: (id: number) => districtLookupNp[id] || `क्षेत्र ${id}`,
  getProvinceName: (idOrName: number | string) => {
    if (typeof idOrName === 'number') {
      const name = provinceLookup[idOrName];
      if (name === 'Koshi') return 'कोशी';
      if (name === 'Madhesh') return 'मधेश';
      if (name === 'Bagmati') return 'बागमती';
      if (name === 'Gandaki') return 'गण्डकी';
      if (name === 'Lumbini') return 'लुम्बिनी';
      if (name === 'Karnali') return 'कर्णाली';
      if (name === 'Sudurpashchim') return 'सुदूरपश्चिम';
      return 'अन्य';
    }
    return idOrName;
  },
  formatVotes: (v: number) => v.toLocaleString('ne-NP'),
  getShareText: (name, party, statusLabel, votes, dist, area, url) =>
    `${name} (${party}) ${dist} क्षेत्र नं ${area} मा ${votes} मतका साथ ${statusLabel} हुनुहुन्छ! ताजा नतिजाको लागि: ${url}`,
  getClosestMarginText: (name, margin) => `${name} ${margin} मतले अगाडि`,
  getLandslideMarginText: (party, margin) => `${party} · ${margin} मतान्तर`,
};
