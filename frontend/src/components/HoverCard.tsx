import React from 'react';
import { ElectionRemarks } from '../types/election';
import type { CandidateResult } from '../types/election';
import type { Locale } from '../locales/types';

export interface HoverInfo {
  level: 'province' | 'district' | 'constituency';
  title: string;
  distId?: number;
  constId?: number;
  parties: Record<string, number>;
  candidates: CandidateResult[];
  mouseX: number;
  mouseY: number;
}

interface HoverCardProps {
  hoverInfo: HoverInfo;
  t: Locale;
  getPartyColor: (party: string) => string;
  isMobile: boolean;
  onClose?: () => void;
  onShare: (c: CandidateResult) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const HoverCard: React.FC<HoverCardProps> = ({
  hoverInfo,
  t,
  getPartyColor,
  isMobile,
  onClose,
  onShare,
  onMouseEnter,
  onMouseLeave,
}) => {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onPointerDown={(e) => e.stopPropagation()}
      className={`fixed z-[9999] rounded-2xl shadow-2xl border text-sm max-w-xs w-80 transition-all duration-200 pointer-events-auto bg-surface-card border-border-default text-text-main backdrop-blur-md ${isMobile ? 'left-4 right-4 bottom-12 !w-auto max-w-none translate-y-0 opacity-100' : ''}`}
      style={
        isMobile
          ? {}
          : {
              left: Math.min(window.innerWidth - 340, hoverInfo.mouseX + 16),
              top: Math.max(8, hoverInfo.mouseY - 60),
            }
      }
    >
      <div className={`px-4 pt-3 pb-2 border-b relative border-border-default`}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose?.();
          }}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-full hover:bg-red-500/10 dark:hover:bg-red-500/20 transition-all active:scale-90 group/close"
          aria-label="Close"
        >
          <svg
            className="w-5 h-5 text-red-500 group-hover/close:text-red-600 transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <div className={`text-[10px] font-bold uppercase tracking-wider text-text-muted`}>
          {hoverInfo.level === 'constituency' ? t.colConst : t.district}
        </div>
        <div className="font-bold text-base leading-tight mt-0.5 text-left pr-8">
          {hoverInfo.title}
        </div>
      </div>

      {hoverInfo.candidates.length > 0 ? (
        <div className="px-3 pt-3 pb-3 space-y-2.5 max-h-[50vh] overflow-y-auto">
          {hoverInfo.candidates.map((c, idx) => {
            const total = hoverInfo.candidates.reduce((s, x) => s + (x.TotalVoteReceived || 0), 0);
            const pct = total > 0 ? Math.round(((c.TotalVoteReceived || 0) / total) * 100) : 0;
            const isLeader = idx === 0;
            const isElected =
              c.Remarks === ElectionRemarks.ELECTED || c.Remarks === ElectionRemarks.ELECTED_NP;
            const color = getPartyColor(c.PoliticalPartyName);

            return (
              <div
                key={idx}
                className={`flex items-start gap-3 p-2.5 rounded-xl transition-all ${!isLeader ? 'opacity-75' : ''} ${isElected ? 'border-2 shadow-sm' : ''}`}
                style={isElected ? { borderColor: color, backgroundColor: `${color}10` } : {}}
              >
                <div
                  className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0 text-left">
                      <div
                        className={`font-bold text-sm leading-tight ${isLeader ? 'text-text-main' : 'text-text-muted'}`}
                      >
                        {c.CandidateName}
                      </div>
                      <div className="text-[10px] opacity-90 mt-1 truncate text-text-muted">
                        {isLeader && (
                          <span
                            className={`font-black uppercase tracking-wider text-[10px] mr-2 inline-flex items-center gap-1 ${isElected ? 'text-emerald-500' : 'text-blue-500'}`}
                          >
                            {isElected ? (
                              <>
                                <span className="text-base font-black">✓</span>
                                {t.statusElected}
                              </>
                            ) : (
                              <>
                                <span className="text-sm">▲</span>
                                {t.statusLeading}
                              </>
                            )}
                          </span>
                        )}
                        {isLeader ? '· ' : ''}
                        {c.PoliticalPartyName}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div
                        className={`font-mono font-bold text-xs ${isLeader ? 'text-brand-main' : ''}`}
                      >
                        {t.formatVotes(c.TotalVoteReceived || 0)}
                      </div>
                      <div className="text-[9px] opacity-60 font-mono">{pct}%</div>
                    </div>
                    {isLeader && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onShare(c);
                        }}
                        className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/30 transition-all border border-white/20 shadow-lg text-lg ml-1"
                        title={t.share}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        📤
                      </button>
                    )}
                  </div>

                  {c.Qualification && (
                    <div className="text-[9px] italic text-text-muted truncate mt-1.5">
                      {c.Qualification}
                    </div>
                  )}

                  <div className="flex items-center gap-1 mt-2">
                    <div className={`h-1.5 rounded-full flex-1 bg-surface-main`}>
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-3 text-xs italic text-text-muted">{t.noData}</div>
      )}

      {hoverInfo.parties && Object.keys(hoverInfo.parties).length > 0 && (
        <div className="px-4 pb-3 pt-1 border-t border-border-default">
          <div className={`text-[9px] uppercase tracking-wider font-bold mb-1.5 text-text-muted`}>
            {t.district} {t.best}
          </div>
          <div className="flex gap-0.5 h-2 rounded overflow-hidden">
            {Object.entries(hoverInfo.parties)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([party, count]) => {
                const total = Object.values(hoverInfo.parties).reduce((s, v) => s + v, 0);
                const countPct = (count / total) * 100;
                return (
                  <div
                    key={party}
                    title={`${party}: ${count}`}
                    className="h-2 rounded-sm"
                    style={{ width: `${countPct}%`, backgroundColor: getPartyColor(party) }}
                  />
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default HoverCard;
