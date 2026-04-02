import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { ElectionRemarks } from '../types/election';
import type { CandidateResult } from '../types/election';
import type { Locale } from '../locales/types';

interface CandidateShareModalProps {
  candidate: CandidateResult;
  isOpen: boolean;
  onClose: () => void;
  getPartyColor: (party: string) => string;
  t: Locale;
  districtName: string;
  others: CandidateResult[];
}

const CandidateShareModal: React.FC<CandidateShareModalProps> = ({
  candidate,
  isOpen,
  onClose,
  getPartyColor,
  t,
  districtName,
  others,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isTextCopied, setIsTextCopied] = useState(false);
  const partyColor = getPartyColor(candidate.PoliticalPartyName);

  if (!isOpen) return null;

  const isElected =
    candidate.Remarks === ElectionRemarks.ELECTED ||
    candidate.Remarks === ElectionRemarks.ELECTED_NP;
  const statusLabel = isElected ? t.statusElected : t.statusLeading;
  const shareUrl = window.location.href;

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      }
    } catch (err) {
      console.error('Clipboard copy failed', err);
      return false;
    }
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleCopyText = async () => {
    const success = await copyToClipboard(shareText);
    if (success) {
      setIsTextCopied(true);
      setTimeout(() => setIsTextCopied(false), 2000);
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 100));
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.95,
        cacheBust: true,
        pixelRatio: 2,
        skipFonts: true,
      });
      const link = document.createElement('a');
      link.download = `election-${isElected ? 'win' : 'lead'}-${candidate.CandidateName.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Could not generate image', err);
      alert(t.downloadFailed);
    } finally {
      setIsExporting(false);
    }
  };

  const votesFormatted = t.formatVotes(candidate.TotalVoteReceived || 0);
  const shareText = t.getShareText(
    candidate.CandidateName,
    candidate.PoliticalPartyName,
    statusLabel,
    votesFormatted,
    districtName,
    candidate.MetaConstId,
    shareUrl,
  );

  const shareOnX = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank',
    );
  };

  const shareOnFB = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      '_blank',
    );
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-500 overflow-y-auto cursor-pointer"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden my-auto bg-surface-card border border-border-default cursor-default`}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between">
          <h3 className="font-black text-sm uppercase tracking-widest text-text-muted">
            {t.shareWinCard}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-red-500/10 dark:hover:bg-red-500/20 transition-all active:scale-90 group/close"
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
        </div>

        {/* Card Preview Container */}
        <div className="px-6 pb-6 flex justify-center">
          <div
            ref={cardRef}
            className="w-full rounded-3xl overflow-hidden shadow-2xl relative"
            style={{
              background: `linear-gradient(135deg, ${partyColor} 0%, ${partyColor}dd 100%)`,
              aspectRatio: '1/1.4',
            }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

            <div className="relative h-full p-6 flex flex-col text-white">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-white/20 backdrop-blur-md rounded-full px-3 py-1 text-[8px] font-black tracking-[0.2em] uppercase">
                  {t.title}
                </div>
                <div className="text-xl">🗳️</div>
              </div>

              <div className="mt-2">
                <div className="text-[10px] font-bold opacity-80 uppercase tracking-[0.1em] mb-0.5">
                  {districtName} · {t.area} {candidate.MetaConstId}
                </div>
                <h2 className="text-2xl font-black leading-tight mb-2 drop-shadow-lg">
                  {candidate.CandidateName}
                </h2>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span className="text-[10px] font-black tracking-widest py-1 px-2.5 bg-white/20 rounded-lg backdrop-blur-md uppercase">
                    {statusLabel}
                  </span>
                </div>

                <div className="flex items-end justify-between border-t border-white/20 pt-3 mb-4">
                  <div className="flex flex-col">
                    <span className="text-[8px] opacity-70 uppercase font-black tracking-widest mb-1">
                      {t.votesReceived}
                    </span>
                    <span className="text-3xl font-black tracking-tighter tabular-nums leading-none">
                      {votesFormatted}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold max-w-[120px] leading-tight mb-1 opacity-90 truncate italic">
                      {candidate.PoliticalPartyName}
                    </div>
                  </div>
                </div>

                {/* Others Section */}
                {others && others.length > 0 && (
                  <div className="mt-2 pt-3 border-t border-white/10">
                    <div className="text-[8px] font-black tracking-widest opacity-60 mb-2 uppercase">
                      {t.runnersUp}
                    </div>
                    <div className="flex flex-col gap-2">
                      {others.map((other, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[11px] font-bold bg-white/10 rounded-lg px-2.5 py-1.5 backdrop-blur-sm"
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="truncate max-w-[120px]">{other.CandidateName}</span>
                            <span className="text-[8px] opacity-60 truncate max-w-[110px] font-medium italic">
                              {other.PoliticalPartyName}
                            </span>
                          </div>
                          <span className="tabular-nums font-black ml-2">
                            {t.formatVotes(other.TotalVoteReceived || 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/5 font-black text-6xl tracking-tighter rotate-[-35deg] pointer-events-none select-none uppercase text-center leading-none">
                ELECTION-NP
              </div>

              <div className="mt-auto pt-4 text-[8px] font-bold opacity-60 tracking-widest text-right">
                {(
                  window.location.host +
                  (import.meta.env.BASE_URL !== '/' ? import.meta.env.BASE_URL : '')
                ).replace(/\/$/, '')}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-6 flex flex-col gap-3">
          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="w-full py-3.5 bg-brand-main hover:bg-brand-dark disabled:opacity-50 text-white rounded-2xl font-black text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand-main/20 active:scale-[0.98]"
          >
            {isExporting ? (
              <span className="animate-spin text-xl">⏳</span>
            ) : (
              <span className="text-lg">⬇️</span>
            )}
            {t.downloadForTikTok}
          </button>

          <div className="flex gap-2">
            <button
              onClick={shareOnX}
              className="flex-1 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border bg-surface-main border-border-default hover:bg-surface-card text-text-main"
            >
              <span className="text-xl">𝕏</span>{' '}
              <span className="text-xs uppercase tracking-widest">{t.post}</span>
            </button>
            <div className="flex-1 flex flex-col gap-1">
              <button
                onClick={shareOnFB}
                className="w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border bg-accent-blue/10 border-accent-blue/20 hover:bg-accent-blue/20 text-accent-blue"
              >
                <span className="text-xl">f</span>{' '}
                <span className="text-xs uppercase tracking-widest">{t.share}</span>
              </button>
              <button
                onClick={handleCopyText}
                className={`text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-1 ${isTextCopied ? 'text-brand-main' : 'text-text-muted hover:text-text-main'}`}
              >
                {isTextCopied ? t.textCopied : t.copyText}
              </button>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 justify-center py-2 px-3 rounded-xl border bg-surface-main border-border-default">
            <span className="text-[10px] text-text-muted truncate">{shareUrl}</span>
            <button
              onClick={handleCopyLink}
              className={`text-[10px] font-bold uppercase transition-colors ${isCopied ? 'text-brand-main' : 'text-brand-main hover:opacity-80'}`}
            >
              {isCopied ? t.linkCopied : t.copyURL}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateShareModal;
