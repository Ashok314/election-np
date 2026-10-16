import { useState, useEffect } from 'react';
import { Lang, Theme } from './types/election';
import { useElectionData } from './hooks/useElectionData';
import { getTranslations } from './constants/translations';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import DashboardPage from './pages/DashboardPage';
import ElectionNotice from './components/ElectionNotice';
import { getElection } from './config/election';
import type { ElectionConfig } from './config/election';

function App() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('lang') as Lang) || Lang.NP);
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme) || Theme.DARK,
  );

  const [electionId, setElectionId] = useState(
    () => getElection(new URLSearchParams(window.location.search).get('election')).id,
  );

  const selectElection = (id: string) => {
    setElectionId(id);
    const url = new URL(window.location.href);
    url.searchParams.set('election', id);
    window.history.replaceState(null, '', url);
  };

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === Theme.DARK) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ElectionDashboard
      key={electionId}
      election={getElection(electionId)}
      setElection={selectElection}
      lang={lang}
      setLang={setLang}
      theme={theme}
      setTheme={setTheme}
    />
  );
}

interface ElectionDashboardProps {
  election: ElectionConfig;
  setElection: (id: string) => void;
  lang: Lang;
  setLang: (lang: Lang) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

function ElectionDashboard({
  election,
  setElection,
  lang,
  setLang,
  theme,
  setTheme,
}: ElectionDashboardProps) {
  const {
    lastUpdated,
    overallStats,
    leaders,
    allCandidates,
    liveStatus,
    prData,
    prByDistrict,
    totalPRDistrictsFinished,
    totalElected,
  } = useElectionData(election);

  const t = getTranslations(lang, election);

  const appBg = 'bg-surface-main text-text-main';

  return (
    <div className={`min-h-screen transition-colors duration-300 flex flex-col ${appBg}`}>
      <Header
        election={election}
        setElection={setElection}
        t={t}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        liveStatus={liveStatus}
        lastUpdated={lastUpdated}
        totalElected={totalElected}
        totalPRDistrictsFinished={totalPRDistrictsFinished}
      />

      {election.phase === 'archived' && <ElectionNotice t={t} election={election} />}

      {election.phase === 'upcoming' && <ElectionNotice t={t} election={election} />}

      <DashboardPage
        election={election}
        lastUpdated={lastUpdated}
        overallStats={overallStats}
        leaders={leaders}
        allCandidates={allCandidates}
        liveStatus={liveStatus}
        prData={prData}
        prByDistrict={prByDistrict}
        t={t}
      />

      <Footer t={t} />
    </div>
  );
}

export default App;
