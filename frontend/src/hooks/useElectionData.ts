import { useState, useEffect, useCallback } from 'react';
import type {
  CandidateResult,
  PRResult,
  PRByDistrict,
  OverallStats,
  LiveStatus as LiveStatusType,
} from '../types/election';
import { LiveStatus, ElectionRemarks } from '../types/election';
import { provinceLookup, districtLookup } from '../constants/electionData';
import { fetchFPTPData, fetchPRData, fetchPRByDistrictData } from '../services/api';

export const useElectionData = () => {
  const [lastUpdated, setLastUpdated] = useState<string>('—');
  const [overallStats, setOverallStats] = useState<OverallStats>({});
  const [leaders, setLeaders] = useState<CandidateResult[]>([]);
  const [allCandidates, setAllCandidates] = useState<CandidateResult[]>([]);
  const [liveStatus, setLiveStatus] = useState<LiveStatusType>(LiveStatus.CONNECTING);
  const [prData, setPRData] = useState<PRResult[]>([]);
  const [prByDistrict, setPRByDistrict] = useState<PRByDistrict[]>([]);

  const processData = useCallback((data: CandidateResult[]) => {
    if (!data.length) return;
    setAllCandidates(data);

    const nptTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kathmandu',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(new Date());
    setLastUpdated(`${nptTime} NPT`);

    const leaderMap: Record<string, CandidateResult> = {};
    data.forEach((c) => {
      const key = `${c.MetaDistId}-${c.MetaConstId}`;
      const cur = leaderMap[key];
      if (!cur || (c.TotalVoteReceived || 0) > (cur.TotalVoteReceived || 0)) {
        leaderMap[key] = c;
      }
    });

    const leaderList = Object.values(leaderMap)
      .sort((a, b) => (b.TotalVoteReceived || 0) - (a.TotalVoteReceived || 0))
      .map((l) => ({
        ...l,
        StateName: l.StateName || provinceLookup[l.MetaDistId] || 'Other',
        DistrictName: l.DistrictName || districtLookup[l.MetaDistId] || `Dist ${l.MetaDistId}`,
      }));
    setLeaders(leaderList);

    const statsObj: OverallStats = {};
    leaderList.forEach((c) => {
      const p = c.PoliticalPartyName || 'Independent/Others';
      if (!statsObj[p]) statsObj[p] = { leads: 0, won: 0 };
      if (c.Remarks === ElectionRemarks.ELECTED || c.Remarks === ElectionRemarks.ELECTED_NP) {
        statsObj[p].won += 1;
      } else {
        statsObj[p].leads += 1;
      }
    });
    setOverallStats(statsObj);
  }, []);

  const loadData = useCallback(async () => {
    setLiveStatus(LiveStatus.CONNECTING);
    const data = await fetchFPTPData();
    if (data.length > 0) {
      processData(data);
      setLiveStatus(LiveStatus.LIVE);
    } else {
      // Fallback or error state
    }
  }, [processData]);

  const loadPRData = useCallback(async () => {
    const [prNat, prDist] = await Promise.all([fetchPRData(), fetchPRByDistrictData()]);
    if (prNat.length > 0) setPRData(prNat);
    if (prDist.length > 0) setPRByDistrict(prDist);
  }, []);

  useEffect(() => {
    // Start initial loading
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();

    void loadPRData();

    const fptpInterval = setInterval(loadData, 5000);
    const prInterval = setInterval(loadPRData, 60000);

    return () => {
      clearInterval(fptpInterval);
      clearInterval(prInterval);
    };
  }, [loadData, loadPRData]);

  const totalPRDistrictsFinished = new Set(prByDistrict.map((d) => d.dist_id)).size;
  const totalElected = leaders.filter(
    (r) => r.Remarks === ElectionRemarks.ELECTED || r.Remarks === ElectionRemarks.ELECTED_NP,
  ).length;

  return {
    lastUpdated,
    overallStats,
    leaders,
    allCandidates,
    liveStatus,
    prData,
    prByDistrict,
    totalPRDistrictsFinished,
    totalElected,
    refreshData: loadData,
  };
};
