import { useState, useEffect } from 'react';
import { Lang, Theme } from './types/election';
import { useElectionData } from './hooks/useElectionData';
import { getTranslations } from './constants/translations';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import DashboardPage from './pages/DashboardPage';

function App() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('lang') as Lang) || Lang.NP);
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme) || Theme.DARK,
  );

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
  } = useElectionData();

  const t = getTranslations(lang);

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

  const appBg = 'bg-surface-main text-text-main';

  return (
    <div className={`min-h-screen transition-colors duration-300 flex flex-col ${appBg}`}>
      <Header
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

      <DashboardPage
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
