import type { ElectionConfig } from '../config/election';
import type { Locale } from '../locales/types';

export default function ElectionNotice({ t, election }: { t: Locale; election: ElectionConfig }) {
  if (election.phase === 'live') return null;

  const archived = election.phase === 'archived';

  return (
    <aside
      aria-label={archived ? t.archived : t.upcoming}
      className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-4 sm:px-6"
    >
      <div className="mx-auto flex max-w-7xl items-start gap-3">
        <span aria-hidden="true" className="mt-0.5 text-xl">
          {archived ? '▣' : '◷'}
        </span>
        <div>
          <p className="text-sm font-bold text-text-main">
            {archived ? t.archiveTitle : t.upcomingTitle}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            {archived ? t.archiveDescription : t.upcomingDescription}
          </p>
        </div>
      </div>
    </aside>
  );
}
