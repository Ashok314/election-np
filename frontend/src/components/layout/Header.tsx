import { Lang, Theme, LiveStatus } from '../../types/election';
import { TOTAL_FPTP_SEATS, TOTAL_PR_DISTRICTS } from '../../constants/electionData';
import type { Locale } from '../../locales/types';
import { elections } from '../../config/election';
import type { ElectionConfig } from '../../config/election';

interface HeaderProps {
  election: ElectionConfig;
  setElection: (id: string) => void;
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
  election,
  setElection,
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

  const isLive = election.phase === 'live';
  const statusLabel =
    election.phase === 'archived'
      ? t.archived
      : election.phase === 'upcoming'
        ? t.upcoming
        : liveStatus === LiveStatus.LIVE
          ? t.live
          : liveStatus === LiveStatus.POLLING
            ? t.polling
            : t.connect;

  return (
    <header
      className={`lg:sticky relative top-0 z-[9999] border-b backdrop-blur-md px-4 sm:px-6 py-3 flex flex-wrap gap-3 items-center justify-between ${headerBg}`}
    >
      <div>
        <h1 className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">
          {t.title}
        </h1>
        <p className={`text-xs font-medium ${subTextClass}`}>{t.subTitle}</p>
        <label className="group relative mt-2 inline-flex max-w-full items-center rounded-xl border border-border-default bg-surface-main/40 shadow-sm transition-colors hover:border-brand-main/40 hover:bg-surface-card focus-within:border-brand-main/60 focus-within:ring-2 focus-within:ring-brand-main/15">
          <span className="sr-only">{t.electionSelector}</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
          >
            <rect x="3" y="5" width="18" height="16" rx="3" />
            <path d="M16 3v4M8 3v4M3 11h18m-13 5h2m4 0h2" />
          </svg>
          <select
            value={election.id}
            onChange={(event) => setElection(event.target.value)}
            className="max-w-full cursor-pointer appearance-none rounded-xl bg-transparent py-2 pl-9 pr-9 text-[11px] font-bold tracking-wide text-text-main outline-none"
          >
            {elections.map((item) => (
              <option key={item.id} value={item.id} className="bg-surface-card text-text-main">
                {item.gregorianYear ? t.electionOption(item.gregorianYear) : t.upcomingTitle}
              </option>
            ))}
          </select>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute right-3 h-3 w-3 text-text-muted transition-colors group-hover:text-brand-main"
          >
            <path d="m6 8 4 4 4-4" />
          </svg>
        </label>
        {/* Mobile-only Metric */}
        <div className="flex lg:hidden items-center gap-3 mt-1 text-[9px] font-black tracking-wide">
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            🏆 {election.phase === 'upcoming' ? '—' : `${totalElected} / ${TOTAL_FPTP_SEATS}`}
          </div>
          <div className="w-px h-2 bg-border-default" />
          <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
            🗳️{' '}
            {election.phase === 'upcoming'
              ? '—'
              : `${totalPRDistrictsFinished} / ${TOTAL_PR_DISTRICTS}`}
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
              {election.phase === 'upcoming' ? '—' : totalElected}{' '}
              {election.phase !== 'upcoming' && (
                <span className="text-sm tracking-tight text-text-muted opacity-50">
                  / {TOTAL_FPTP_SEATS}
                </span>
              )}
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
              {election.phase === 'upcoming' ? '—' : totalPRDistrictsFinished}{' '}
              {election.phase !== 'upcoming' && (
                <span className="text-sm tracking-tight text-text-muted opacity-50">
                  / {TOTAL_PR_DISTRICTS}
                </span>
              )}
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
            isLive && liveStatus === LiveStatus.LIVE
              ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
              : !isLive || liveStatus === LiveStatus.POLLING
                ? 'border-border-default text-text-muted'
                : 'border-border-default text-text-muted opacity-50'
          }`}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isLive && liveStatus === LiveStatus.LIVE
                ? 'bg-emerald-400 live'
                : !isLive || liveStatus === LiveStatus.POLLING
                  ? 'bg-amber-400'
                  : 'bg-zinc-600'
            }`}
          />
          {statusLabel}
        </div>
        {isLive && (
          <span className={`text-xs ${subTextClass}`}>
            {t.lastUpdated} {lastUpdated}
          </span>
        )}
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
