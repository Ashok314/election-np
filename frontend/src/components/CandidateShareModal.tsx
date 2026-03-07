import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import type { CandidateResult } from '../App';

interface CandidateShareModalProps {
    candidate: CandidateResult;
    isOpen: boolean;
    onClose: () => void;
    getPartyColor: (party: string) => string;
    lang: 'en' | 'np';
    theme: 'dark' | 'light';
    districtName: string;
}

const CandidateShareModal: React.FC<CandidateShareModalProps> = ({
    candidate,
    isOpen,
    onClose,
    getPartyColor,
    lang,
    theme,
    districtName
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isTextCopied, setIsTextCopied] = useState(false);
    const partyColor = getPartyColor(candidate.PoliticalPartyName);
    const isDark = theme === 'dark';

    if (!isOpen) return null;

    const isElected = candidate.Remarks === 'Elected' || candidate.Remarks === 'निर्वाचित';
    const statusLabel = isElected
        ? (lang === 'en' ? 'ELECTED' : 'निर्वाचित')
        : (lang === 'en' ? 'LEADING' : 'अग्रता');

    const shareUrl = window.location.href;

    const copyToClipboard = async (text: string) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback for non-secure contexts or older browsers
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.left = "-999999px";
                textArea.style.top = "-999999px";
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
            // Improvement: html-to-image sometimes fails with complex fonts or CSS in one go
            // We use a slight delay and cleaner options
            await new Promise(r => setTimeout(r, 100));
            const dataUrl = await toPng(cardRef.current, {
                quality: 0.95,
                cacheBust: true,
                pixelRatio: 2,
                skipFonts: true, // Speeds up and prevents some capture failures
            });
            const link = document.createElement('a');
            link.download = `election-${isElected ? 'win' : 'lead'}-${candidate.CandidateName.replace(/\s+/g, '-').toLowerCase()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Could not generate image', err);
            alert(lang === 'en' ? 'Download failed. Please try again or take a screenshot.' : 'डाउनलोड गर्न सकिएन। कृपया पुनः प्रयास गर्नुहोस् वा स्क्रिनसट लिनुहोस्।');
        } finally {
            setIsExporting(false);
        }
    };

    const votes = candidate.TotalVoteReceived?.toLocaleString() || '0';
    const shareText = lang === 'en'
        ? `${candidate.CandidateName} (${candidate.PoliticalPartyName}) is ${isElected ? 'elected' : 'leading'} with ${votes} votes in ${districtName} ${candidate.MetaConstId}! Check live results: `
        : `${candidate.CandidateName} (${candidate.PoliticalPartyName}) ${districtName} क्षेत्र नं ${candidate.MetaConstId} मा ${votes} मतका साथ ${isElected ? 'निर्वाचित हुनुभएको छ' : 'अगाडि हुनुहुन्छ'}! ताजा नतिजाको लागि:`;

    const shareOnX = () => {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    };

    const shareOnFB = () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-500 overflow-y-auto">
            <div className={`relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden my-auto ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-gray-100'}`}>

                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between">
                    <h3 className={`font-black text-sm uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                        {lang === 'en' ? 'Share Win Card' : 'नतिजा शेयर गर्नुहोस्'}
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Card Preview Container (The part that gets captured) */}
                <div className="px-6 pb-6 flex justify-center">
                    <div
                        ref={cardRef}
                        className="w-full rounded-3xl overflow-hidden shadow-2xl relative"
                        style={{
                            background: `linear-gradient(135deg, ${partyColor} 0%, ${partyColor}dd 100%)`,
                            aspectRatio: '1/1.2'
                        }}
                    >
                        {/* Visual Flair */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

                        <div className="relative h-full p-6 flex flex-col text-white">
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-white/20 backdrop-blur-md rounded-full px-3 py-1 text-[8px] font-black tracking-[0.2em] uppercase">
                                    NEPAL ELECTION 2082
                                </div>
                                <div className="text-xl">🗳️</div>
                            </div>

                            <div className="mt-auto">
                                <div className="text-[10px] font-bold opacity-80 uppercase tracking-[0.1em] mb-1">
                                    {districtName} · क्षेत्र {candidate.MetaConstId}
                                </div>
                                <h2 className="text-2xl font-black leading-tight mb-2 drop-shadow-lg">
                                    {candidate.CandidateName}
                                </h2>
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                    <span className="text-[10px] font-black tracking-widest py-1 px-2.5 bg-white/20 rounded-lg backdrop-blur-md uppercase">
                                        {statusLabel}
                                    </span>
                                </div>

                                <div className="flex items-end justify-between border-t border-white/20 pt-4">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] opacity-70 uppercase font-black tracking-widest mb-1">VOTES RECEIVED</span>
                                        <span className="text-3xl font-black tracking-tighter tabular-nums leading-none">
                                            {candidate.TotalVoteReceived?.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-bold max-w-[100px] leading-tight mb-1 opacity-90 truncate italic">
                                            {candidate.PoliticalPartyName}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stealth Watermark */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/5 font-black text-6xl tracking-tighter rotate-[-35deg] pointer-events-none select-none uppercase text-center leading-none">
                                ELECTION-NP
                            </div>

                            {/* Visible URL for branding */}
                            <div className="mt-auto pt-2 text-[8px] font-bold opacity-60 tracking-widest text-right">
                                {window.location.hostname}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="px-6 pb-6 flex flex-col gap-3">
                    <button
                        onClick={handleDownload}
                        disabled={isExporting}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white rounded-2xl font-black text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 active:scale-[0.98]"
                    >
                        {isExporting ? <span className="animate-spin text-xl">⏳</span> : <span className="text-lg">⬇️</span>}
                        {lang === 'en' ? 'Download for TikTok/FB' : 'फोटो डाउनलोड गर्नुहोस्'}
                    </button>

                    <div className="flex gap-2">
                        <button
                            onClick={shareOnX}
                            className={`flex-1 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border ${isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white' : 'bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-900'}`}
                        >
                            <span className="text-xl">𝕏</span> <span className="text-xs uppercase tracking-widest">Post</span>
                        </button>
                        <div className="flex-1 flex flex-col gap-1">
                            <button
                                onClick={shareOnFB}
                                className={`w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border ${isDark ? 'bg-blue-600/10 border-blue-600/20 hover:bg-blue-600/20 text-blue-400' : 'bg-blue-50 border-blue-100 hover:bg-blue-100 text-blue-600'}`}
                            >
                                <span className="text-xl">f</span> <span className="text-xs uppercase tracking-widest">Share</span>
                            </button>
                            <button
                                onClick={handleCopyText}
                                className={`text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-1 ${isTextCopied ? 'text-emerald-500' : 'text-zinc-500 hover:text-zinc-400'}`}
                            >
                                {isTextCopied ? (lang === 'en' ? '✓ Text Copied' : '✓ कपी भयो') : (lang === 'en' ? '📋 Copy Text' : '📋 विवरण कपी')}
                            </button>
                        </div>
                    </div>

                    <div className={`mt-2 flex items-center gap-2 justify-center py-2 px-3 rounded-xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-slate-50 border-slate-200'}`}>
                        <span className="text-[10px] text-zinc-500 truncate">{shareUrl}</span>
                        <button
                            onClick={handleCopyLink}
                            className={`text-[10px] font-bold uppercase transition-colors ${isCopied ? 'text-emerald-400' : 'text-emerald-500 hover:text-emerald-400'}`}
                        >
                            {isCopied ? (lang === 'en' ? 'Copied!' : 'कपी भयो!') : (lang === 'en' ? 'Copy URL' : 'लिङ्क कपी')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CandidateShareModal;
