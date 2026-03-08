import React from 'react';
import type { Locale } from '../../locales/types';

interface FooterProps {
  t: Locale;
}

const Footer: React.FC<FooterProps> = ({ t }) => {
  const subTextClass = 'text-text-muted';

  const shareUrl = window.location.href;
  const shareText = t.shareDashboardText;

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

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    alert(t.linkCopied);
  };

  return (
    <footer className="mt-12 py-12 px-6 border-t bg-surface-main/80 border-border-default">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🇳🇵</span>
            <h2 className="text-xl font-black uppercase tracking-tighter">
              Nepal Election <span className="text-emerald-500">2082</span>
            </h2>
          </div>
          <p className={`text-xs max-w-sm ${subTextClass}`}>{t.footerText}</p>
        </div>

        <div className="flex flex-col items-center md:items-end gap-4">
          <span className={`text-[10px] font-black tracking-widest uppercase ${subTextClass}`}>
            {t.shareThisDashboard}
          </span>
          <div className="flex gap-4">
            <button
              onClick={shareOnX}
              className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all border bg-surface-card border-border-default hover:scale-110 active:scale-95 text-text-main shadow-sm"
            >
              <span className="text-xl font-black">𝕏</span>
            </button>
            <button
              onClick={shareOnFB}
              className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all border bg-blue-500/10 border-blue-500/20 hover:scale-110 active:scale-95 text-blue-600 dark:text-blue-400 shadow-sm"
            >
              <span className="text-xl font-black">f</span>
            </button>
            <button
              onClick={copyLink}
              className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all border bg-brand-main/10 border-brand-main/20 hover:scale-110 active:scale-95 text-brand-main shadow-sm"
            >
              <span className="text-xl font-black">🔗</span>
            </button>
          </div>
        </div>
      </div>
      <div className="mt-12 pt-8 text-center text-[10px] border-t max-w-6xl mx-auto border-border-default text-text-muted opacity-50">
        © 2026 Election-NP Dashboard · Powered by ECN Data
      </div>
    </footer>
  );
};

export default Footer;
