import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Types ───────────────────────────────────────────────────────────────────
export interface CandidateResult {
    MetaDistId: number;
    MetaConstId: number;
    CandidateName: string;
    PoliticalPartyName: string;
    TotalVoteReceived: number;
    Remarks: string;
    Gender?: string;
    Age?: number;
    DistrictName?: string;
    Qualification?: string;
}

interface Props {
    resultsData: CandidateResult[];          // one entry per constituency (leader already selected)
    allCandidates: CandidateResult[];        // all raw candidates for per-constituency breakdown
    partyColors: Record<string, string>;
    theme: 'dark' | 'light';
    lang: 'en' | 'np';
    mapMode?: 'fptp' | 'pr';
}

// ── Component ────────────────────────────────────────────────────────────────

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 1024 || L.Browser.mobile);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    return isMobile;
}

export default function ElectionMap({ resultsData, allCandidates, partyColors, theme, lang, mapMode = 'fptp' }: Props) {
    const mapDivRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const isMobile = useIsMobile();
    const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    const [hoverInfo, setHoverInfo] = useState<{
        level: 'province' | 'district' | 'constituency';
        name: string;
        nameNp: string;
        distId?: number;
        constId?: number;
        parties: Record<string, number>;
        candidates: CandidateResult[];
        mouseX: number;
        mouseY: number;
    } | null>(null);

    const [zoomLevel, setZoomLevel] = useState(7);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Build fast lookup maps
    const leaderByConstKey = useRef<Record<string, CandidateResult>>({});
    const leaderByDistKey = useRef<Record<string, CandidateResult>>({});
    const allByConstKey = useRef<Record<string, CandidateResult[]>>({});

    useEffect(() => {
        leaderByConstKey.current = {};
        leaderByDistKey.current = {};
        resultsData.forEach(r => {
            leaderByConstKey.current[`${r.MetaDistId}-${r.MetaConstId}`] = r;
            if (!leaderByDistKey.current[`${r.MetaDistId}`] ||
                (r.TotalVoteReceived || 0) > (leaderByDistKey.current[`${r.MetaDistId}`].TotalVoteReceived || 0)) {
                leaderByDistKey.current[`${r.MetaDistId}`] = r;
            }
        });
        allByConstKey.current = {};
        allCandidates.forEach(r => {
            const key = `${r.MetaDistId}-${r.MetaConstId}`;
            if (!allByConstKey.current[key]) allByConstKey.current[key] = [];
            allByConstKey.current[key].push(r);
        });
        Object.keys(allByConstKey.current).forEach(key => {
            allByConstKey.current[key].sort((a, b) => (b.TotalVoteReceived || 0) - (a.TotalVoteReceived || 0));
        });
    }, [resultsData, allCandidates]);

    const getPartyColor = useCallback((party: string) => {
        return partyColors[party] || '#6b7280';
    }, [partyColors]);

    const styleFeature = useCallback((feature: any) => {
        const distId = feature?.properties?.distId;
        const constId = feature?.properties?.constId;
        const leader = leaderByConstKey.current[`${distId}-${constId}`] || leaderByDistKey.current[`${distId}`];
        const color = leader ? getPartyColor(leader.PoliticalPartyName) : (theme === 'dark' ? '#27272a' : '#e5e7eb');
        const isElected = leader?.Remarks === 'Elected' || leader?.Remarks === 'निर्वाचित';
        const hasData = !!leader;
        const isLeading = leader && !isElected;
        return {
            fillColor: color,
            fillOpacity: isElected ? 0.92 : isLeading ? 0.5 : hasData ? 0.75 : 0.15,
            color: isElected ? '#ffffff' : (isLeading ? color : hasData ? color : (theme === 'dark' ? '#3f3f46' : '#d1d5db')),
            weight: isElected ? 1.2 : (isLeading ? 0.8 : hasData ? 0.6 : 0.5),
            dashArray: isLeading ? '4 3' : undefined,
        };
    }, [getPartyColor, theme]);

    useEffect(() => {
        if (!mapDivRef.current || mapRef.current) return;
        const map = L.map(mapDivRef.current, {
            center: [28.3, 84.1],
            zoom: isMobile ? 6 : 7,
            minZoom: 2,
            zoomControl: false,
            dragging: true, // Always allow dragging
            touchZoom: true,
            scrollWheelZoom: false,
            doubleClickZoom: true,
            attributionControl: false,
        });

        // Add zoom control for all platforms for accessibility
        L.control.zoom({ position: 'topright' }).addTo(map);

        const japanIcon = L.divIcon({
            html: `<div style="font-family: monospace; font-size: 10px; color: #ec4899; white-space: nowrap; font-weight: bold; text-shadow: 0 0 4px rgba(255,255,255,0.8); background: rgba(255,255,255,0.6); backdrop-filter: blur(4px); padding: 4px 8px; border-radius: 4px; border: 1px solid #fbcfe8; pointer-events: none;">Made with ❤️ in Japan</div>`,
            className: 'empty-class',
            iconSize: [200, 20]
        });
        L.marker([36.2048, 138.2529], { icon: japanIcon, interactive: false }).addTo(map);

        mapRef.current = map;
        map.on('zoomend', () => setZoomLevel(map.getZoom()));

        return () => {
            map.remove();
            mapRef.current = null;
            tileLayerRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        if (tileLayerRef.current) tileLayerRef.current.remove();
        const tileUrl = theme === 'dark'
            ? 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
        const tile = L.tileLayer(tileUrl, { subdomains: 'abcd', maxZoom: 19 });
        tile.addTo(map);
        tileLayerRef.current = tile;
    }, [theme]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const BASE = import.meta.env.BASE_URL || '/';
        fetch(`${BASE}data/nepal-constituencies.geojson`)
            .then(r => r.json())
            .then((geojson) => {
                if (geojsonLayerRef.current) geojsonLayerRef.current.remove();
                const layer = L.geoJSON(geojson, {
                    style: styleFeature,
                    onEachFeature: (feature, layer) => {
                        const props = feature.properties || {};
                        const distId: number = props.distId;
                        const constId: number = props.constId;

                        const areaLabel = `${lang === 'np' ? props.districtNameNp : props.districtName} ${props.constId}`;
                        const areaIdOnly = `${props.constId}`;

                        if (zoomLevel >= 10) {
                            // Deep zoom: area number only for clarity
                            layer.bindTooltip(areaIdOnly, {
                                permanent: true,
                                direction: 'center',
                                className: `bg-transparent border-none shadow-none font-bold text-[10px] pointer-events-none opacity-80 ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-500'}`
                            });
                        } else if (zoomLevel >= 8) {
                            // Medium zoom: District + Area
                            layer.bindTooltip(areaLabel, {
                                permanent: true,
                                direction: 'center',
                                className: `bg-transparent border-none shadow-none font-bold text-[9px] pointer-events-none opacity-60 ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'}`
                            });
                        } else {
                            layer.unbindTooltip();
                        }

                        layer.on('mousemove', (e: L.LeafletMouseEvent) => {
                            let candidates: CandidateResult[] = [];
                            let hoverTitleEn = '';
                            let hoverTitleNp = '';

                            if (mapMode === 'pr') {
                                const distData = allCandidates.filter(r => r.MetaDistId === distId);
                                const partyMap = new Map<string, number>();
                                distData.forEach(r => {
                                    partyMap.set(r.PoliticalPartyName, (partyMap.get(r.PoliticalPartyName) || 0) + (r.TotalVoteReceived || 0));
                                });
                                // Process candidates for PR mode
                                candidates = Array.from(partyMap.entries())
                                    .map(([party, votes]) => ({
                                        MetaDistId: distId, MetaConstId: 0, CandidateName: party, PoliticalPartyName: party, TotalVoteReceived: votes, Remarks: ''
                                    }))
                                    .sort((a, b) => (b.TotalVoteReceived || 0) - (a.TotalVoteReceived || 0))
                                    .slice(0, 5);
                                hoverTitleEn = `${props.districtName} (District Totals)`;
                                hoverTitleNp = `${props.districtNameNp} (जिल्ला नतिजा)`;
                            } else {
                                candidates = allByConstKey.current[`${distId}-${constId}`] || [];
                                hoverTitleEn = `${props.districtName} • Const ${constId}`;
                                hoverTitleNp = `${props.districtNameNp} • क्षेत्र ${constId}`;
                            }

                            const distParties: Record<string, number> = {};
                            resultsData.filter(r => r.MetaDistId === distId).forEach(r => {
                                const p = r.PoliticalPartyName || 'Other';
                                distParties[p] = (distParties[p] || 0) + 1;
                            });

                            const containerRect = mapDivRef.current?.getBoundingClientRect();
                            if (!containerRect) return;

                            setHoverInfo({
                                level: mapMode === 'pr' ? 'district' : 'constituency',
                                name: hoverTitleEn,
                                nameNp: hoverTitleNp,
                                distId,
                                constId,
                                parties: distParties,
                                candidates: candidates.slice(0, 5),
                                mouseX: e.originalEvent.clientX - containerRect.left,
                                mouseY: e.originalEvent.clientY - containerRect.top,
                            });
                            (layer as L.Path).setStyle({ weight: 2.5, color: '#10b981', fillOpacity: 0.95 });
                        });

                        layer.on('click', (e: L.LeafletMouseEvent) => {
                            L.DomEvent.stopPropagation(e);
                            layer.fire('mousemove', e);
                        });

                        layer.on('mouseout', () => {
                            setHoverInfo(null);
                            (layer as L.Path).setStyle(styleFeature(feature) as L.PathOptions);
                        });
                    },
                });
                layer.addTo(map);
                geojsonLayerRef.current = layer;
            })
            .catch(e => console.error('Failed to load GeoJSON:', e));
    }, [resultsData, styleFeature, zoomLevel, lang]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (geojsonLayerRef.current) {
            geojsonLayerRef.current.setStyle(styleFeature as any);
        }
    }, [resultsData, styleFeature]);

    return (
        <div className={`relative w-full transition-all duration-500 ease-in-out ${isCollapsed ? 'h-32' : 'h-[65vh] lg:h-[85vh]'}`} style={{ minHeight: isCollapsed ? 128 : 500 }}>
            <div ref={mapDivRef} className="w-full h-full rounded-2xl overflow-hidden" style={{ touchAction: 'auto' }} />

            {/* Collapse / Expand Toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`absolute top-4 left-4 z-[1001] px-3 py-1.5 rounded-xl font-bold text-xs shadow-lg backdrop-blur-md border transition-all ${theme === 'dark'
                    ? 'bg-zinc-900/80 border-zinc-700 text-zinc-100'
                    : 'bg-white/80 border-gray-200 text-gray-900'
                    }`}
            >
                {isCollapsed ? (lang === 'en' ? '🔽 Show Map' : '🔽 नक्सा देखाउनुहोस्') : (lang === 'en' ? '🔼 Hide Map' : '🔼 नक्सा लुकाउनुहोस्')}
            </button>

            {/* Hover Panel */}
            {hoverInfo && !isCollapsed && (
                <div
                    onPointerEnter={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`absolute z-[9999] rounded-2xl shadow-2xl border text-sm max-w-xs w-72 transition-all duration-200 pointer-events-auto ${theme === 'dark' ? 'bg-zinc-900/95 border-zinc-700 text-zinc-100 backdrop-blur-md' : 'bg-white/95 border-gray-200 text-gray-900 backdrop-blur-md'
                        } ${isMobile ? 'left-4 right-4 bottom-12 !w-auto max-w-none translate-y-0 opacity-100' : ''}`}
                    style={isMobile ? {} : {
                        left: Math.min(window.innerWidth - 300, hoverInfo.mouseX + 16),
                        top: Math.max(8, hoverInfo.mouseY - 60),
                    }}
                >
                    <div className={`px-4 pt-3 pb-2 border-b ${theme === 'dark' ? 'border-zinc-700' : 'border-gray-100'}`}>
                        <div className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'}`}>
                            {hoverInfo.level === 'constituency' ? (lang === 'np' ? 'निर्वाचन क्षेत्र' : 'Constituency') : 'District'}
                        </div>
                        <div className="font-bold text-base leading-tight mt-0.5">
                            {lang === 'np' ? hoverInfo.nameNp : hoverInfo.name}
                        </div>
                    </div>

                    {hoverInfo.candidates.length > 0 ? (
                        <div className="px-4 pt-3 pb-3 space-y-2 max-h-[40vh] overflow-y-auto">
                            {hoverInfo.candidates.map((c, idx) => {
                                const total = hoverInfo.candidates.reduce((s, x) => s + (x.TotalVoteReceived || 0), 0);
                                const pct = total > 0 ? Math.round(((c.TotalVoteReceived || 0) / total) * 100) : 0;
                                const isLeader = idx === 0;
                                const color = getPartyColor(c.PoliticalPartyName);
                                return (
                                    <div key={idx} className={`flex items-start gap-2 ${!isLeader ? 'opacity-70' : ''}`}>
                                        <div className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline gap-1">
                                                <span className={`font-medium text-xs truncate ${isLeader ? (theme === 'dark' ? 'text-white' : 'text-gray-900') : (theme === 'dark' ? 'text-zinc-300' : 'text-gray-600')}`}>
                                                    {c.CandidateName}
                                                </span>
                                                <span className="font-mono text-xs font-bold flex-shrink-0" style={{ color }}>
                                                    {(c.TotalVoteReceived || 0).toLocaleString()}
                                                </span>
                                            </div>
                                            {c.Qualification && (
                                                <div className={`text-[9px] italic ${theme === 'dark' ? 'text-zinc-500' : 'text-slate-400'} truncate`}>
                                                    {c.Qualification}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <div className={`h-1 rounded-full flex-1 ${theme === 'dark' ? 'bg-zinc-800' : 'bg-gray-100'}`}>
                                                    <div className="h-1 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                                                </div>
                                                <span className={`text-[9px] font-bold ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'}`}>{pct}%</span>
                                            </div>
                                        </div>
                                        {isLeader && (
                                            <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full flex-shrink-0 ${c.Remarks === 'Elected' || c.Remarks === 'निर्वाचित' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                {c.Remarks === 'Elected' || c.Remarks === 'निर्वाचित' ? '✓' : '▲'}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={`px-4 py-3 text-xs italic ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'}`}>
                            No data yet for this constituency
                        </div>
                    )}

                    {Object.keys(hoverInfo.parties).length > 0 && (
                        <div className={`px-4 pb-3 pt-1 border-t ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-100'}`}>
                            <div className={`text-[9px] uppercase tracking-wider font-bold mb-1.5 ${theme === 'dark' ? 'text-zinc-600' : 'text-gray-400'}`}>
                                District total
                            </div>
                            <div className="flex gap-0.5 h-2 rounded overflow-hidden">
                                {Object.entries(hoverInfo.parties).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([party, count]) => {
                                    const total = Object.values(hoverInfo.parties).reduce((s, v) => s + v, 0);
                                    const pct = (count / total) * 100;
                                    return <div key={party} title={`${party}: ${count}`} className="h-2 rounded-sm" style={{ width: `${pct}%`, backgroundColor: getPartyColor(party) }} />;
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Map Legend: Status */}
            {!isCollapsed && (
                <>
                    <div className={`absolute bottom-4 left-4 z-[1000] rounded-xl px-3 py-2 text-[10px] border ${theme === 'dark' ? 'bg-zinc-900/90 border-zinc-700' : 'bg-white/90 border-gray-200'}`}>
                        <div className={`font-bold uppercase tracking-widest mb-1.5 ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'}`}>Status</div>
                        <div className={`flex items-center gap-1.5 mb-1 ${theme === 'dark' ? 'text-zinc-300' : 'text-gray-600'}`}>
                            <div className="w-5 h-2.5 rounded-sm border border-white" style={{ backgroundColor: '#10b981' }} />
                            <span>Elected</span>
                        </div>
                        <div className={`flex items-center gap-1.5 mb-1 ${theme === 'dark' ? 'text-zinc-300' : 'text-gray-600'}`}>
                            <div className="w-5 h-2.5 rounded-sm border-2 border-dashed border-emerald-400" style={{ backgroundColor: 'rgba(16,185,129,0.4)' }} />
                            <span>Leading</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${theme === 'dark' ? 'text-zinc-300' : 'text-gray-600'}`}>
                            <div className={`w-5 h-2.5 rounded-sm opacity-20 ${theme === 'dark' ? 'bg-zinc-600' : 'bg-gray-400'}`} />
                            <span>No data</span>
                        </div>
                    </div>

                    {/* Map Legend: Parties */}
                    <div className={`absolute bottom-4 right-4 z-[1000] rounded-xl px-3 py-2 text-[10px] border hidden sm:block ${theme === 'dark' ? 'bg-zinc-900/90 border-zinc-700' : 'bg-white/90 border-gray-200'}`}>
                        {Object.entries(partyColors).slice(0, 6).map(([party, color]) => (
                            <div key={party} className="flex items-center gap-1.5 mb-1 last:mb-0">
                                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                                <span className={`truncate max-w-[110px] ${theme === 'dark' ? 'text-zinc-300' : 'text-gray-600'}`}>{party}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
