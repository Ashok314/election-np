import { Lang, Theme, LiveStatus } from '../../types/election';
import { TOTAL_FPTP_SEATS, TOTAL_PR_DISTRICTS } from '../../constants/electionData';
import type { Locale } from '../../locales/types';

interface HeaderProps {
  t: Locale;
  lang: Lang;
  setLang: (lang: Lang) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  liveStatus: LiveStatus;
  lastUpdated: string;
  totalElected: number;
  totalPRDistrictsFinished: number;
}

const Header: React.FC<HeaderProps> = ({
  t,
  lang,
  setLang,
  theme,
  setTheme,
  liveStatus,
  lastUpdated,
  totalElected,
  totalPRDistrictsFinished,
}) => {
  const subTextClass = 'text-text-muted';
  const headerBg = 'bg-surface-main/90 border-border-default';

  const cycleLang = () => {
    if (lang === Lang.NP) setLang(Lang.EN);
    else if (lang === Lang.EN) setLang(Lang.JP);
    else setLang(Lang.NP);
  };

  const statusLabel =
    liveStatus === LiveStatus.LIVE
      ? t.live
      : liveStatus === LiveStatus.POLLING
        ? t.polling
        : t.connect;

  return (
    <header
      className={`lg:sticky relative top-0 z-[9999] border-b backdrop-blur-md px-6 py-3 flex items-center justify-between ${headerBg}`}
    >
      <div>
        <h1 className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">
          {t.title}
        </h1>
        <p className={`text-xs font-medium ${subTextClass}`}>{t.subTitle}</p>
        {/* Mobile-only Metric */}
        <div className="flex lg:hidden items-center gap-3 mt-1 text-[9px] font-black tracking-wide">
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            🏆 {totalElected} / {TOTAL_FPTP_SEATS}
          </div>
          <div className="w-px h-2 bg-border-default" />
          <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
            🗳️ {totalPRDistrictsFinished} / {TOTAL_PR_DISTRICTS}
          </div>
        </div>
      </div>

      {/* Stats Section with Metrics */}
      <div className="hidden lg:flex items-center gap-4 flex-1 mx-8 justify-center">
        {/* FPTP Pill */}
        <div className="flex items-center gap-3 px-5 py-2 rounded-xl backdrop-blur-md shadow-sm border bg-surface-main/40 border-border-default">
          <div className="flex flex-col items-end leading-none translate-y-[2px]">
            <span className="text-[9px] uppercase font-black tracking-[0.2em] text-text-muted">
              {t.totalDeclared}
            </span>
            <span className="text-xl font-black mt-1 bg-clip-text text-transparent bg-gradient-to-br from-emerald-400 to-teal-600">
              {totalElected}{' '}
              <span className="text-sm tracking-tight text-text-muted opacity-50">
                / {TOTAL_FPTP_SEATS}
              </span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500/20 flex items-center justify-center to-teal-500/10 border border-emerald-500/20">
            <span className="text-xl">🏆</span>
          </div>
        </div>

        {/* PR Pill */}
        <div className="flex items-center gap-3 px-5 py-2 rounded-xl backdrop-blur-md shadow-sm border bg-surface-main/40 border-border-default">
          <div className="flex flex-col items-end leading-none translate-y-[2px]">
            <span className="text-[9px] uppercase font-black tracking-[0.2em] text-text-muted">
              {t.prFinished}
            </span>
            <span className="text-xl font-black mt-1 bg-clip-text text-transparent bg-gradient-to-br from-violet-400 to-indigo-600">
              {totalPRDistrictsFinished}{' '}
              <span className="text-sm tracking-tight text-text-muted opacity-50">
                / {TOTAL_PR_DISTRICTS}
              </span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-500/20 flex items-center justify-center to-indigo-500/10 border border-violet-500/20">
            <span className="text-xl">🗳️</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Live status badge */}
        <div
          className={`flex items-center justify-center gap-1.5 w-28 text-[10px] font-bold tracking-wider px-2 py-1 rounded-full border ${
            liveStatus === LiveStatus.LIVE
              ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
              : liveStatus === LiveStatus.POLLING
                ? 'border-border-default text-text-muted'
                : 'border-border-default text-text-muted opacity-50'
          }`}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              liveStatus === LiveStatus.LIVE
                ? 'bg-emerald-400 live'
                : liveStatus === LiveStatus.POLLING
                  ? 'bg-amber-400'
                  : 'bg-zinc-600'
            }`}
          />
          {statusLabel}
        </div>
        <span className={`text-xs ${subTextClass}`}>
          {t.lastUpdated} {lastUpdated}
        </span>
        <div className="w-px h-4 bg-border-default" />
        <button
          onClick={() => setTheme(theme === Theme.DARK ? Theme.LIGHT : Theme.DARK)}
          className="text-xs px-2 py-1 rounded border border-border-default text-text-muted hover:bg-surface-card"
        >
          {theme === Theme.DARK ? '☀️' : '🌙'}
        </button>
        <button
          onClick={cycleLang}
          className="text-xs px-2 py-1 rounded border min-w-[32px] font-bold border-border-default text-text-muted hover:bg-surface-card"
        >
          {lang === Lang.EN ? 'EN' : lang === Lang.JP ? 'JP' : 'ने'}
        </button>
      </div>
    </header>
  );
};

export default Header;
