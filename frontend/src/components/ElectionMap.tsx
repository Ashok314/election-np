import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { ElectionRemarks } from '../types/election';
import type { CandidateResult } from '../types/election';
import type { Locale } from '../locales/types';
import { useIsMobile } from '../hooks/useIsMobile';

interface Props {
  resultsData: CandidateResult[];
  partyColors: Record<string, string>;
  t: Locale;
  onShare: (candidate: CandidateResult) => void;
  onHover?: (info: { distId: number; constId: number; x: number; y: number } | null) => void;
}

export default function ElectionMap({ resultsData, partyColors, t, onShare, onHover }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const isMobile = useIsMobile();
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [zoomLevel, setZoomLevel] = useState(7);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [geojsonData, setGeojsonData] = useState<unknown>(null);

  // Build fast lookup maps
  const leaderByConstKey = useRef<Record<string, CandidateResult>>({});
  const leaderByDistKey = useRef<Record<string, CandidateResult>>({});

  useEffect(() => {
    leaderByConstKey.current = {};
    leaderByDistKey.current = {};
    resultsData.forEach((r) => {
      leaderByConstKey.current[`${r.MetaDistId}-${r.MetaConstId}`] = r;
      if (
        !leaderByDistKey.current[`${r.MetaDistId}`] ||
        (r.TotalVoteReceived || 0) >
          (leaderByDistKey.current[`${r.MetaDistId}`].TotalVoteReceived || 0)
      ) {
        leaderByDistKey.current[`${r.MetaDistId}`] = r;
      }
    });
  }, [resultsData]);

  const getPartyColor = useCallback(
    (party: string) => {
      return partyColors[party] || '#6b7280';
    },
    [partyColors],
  );

  const styleFeature = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (feature: any) => {
      const distId = feature?.properties?.distId;
      const constId = feature?.properties?.constId;
      const leader =
        leaderByConstKey.current[`${distId}-${constId}`] || leaderByDistKey.current[`${distId}`];
      const color = leader ? getPartyColor(leader.PoliticalPartyName) : 'var(--bg-card)';
      const isElected =
        leader?.Remarks === ElectionRemarks.ELECTED ||
        leader?.Remarks === ElectionRemarks.ELECTED_NP;
      const hasData = !!leader;
      const isLeading = leader && !isElected;
      return {
        fillColor: color,
        fillOpacity: isElected ? 0.92 : isLeading ? 0.5 : hasData ? 0.75 : 0.15,
        color: isElected
          ? '#ffffff'
          : isLeading
            ? color
            : hasData
              ? color
              : 'var(--border-default)',
        weight: isElected ? 1.2 : isLeading ? 0.8 : hasData ? 0.6 : 0.5,
        dashArray: isLeading ? '4 3' : undefined,
      };
    },
    [getPartyColor],
  );

  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    const map = L.map(mapDivRef.current, {
      center: [28.3, 84.1],
      zoom: isMobile ? 6 : 7,
      minZoom: 2,
      zoomControl: false,
      dragging: true,
      touchZoom: true,
      scrollWheelZoom: false,
      doubleClickZoom: true,
      attributionControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    const japanIcon = L.divIcon({
      html: `<div style="font-family: monospace; font-size: 10px; color: #ec4899; white-space: nowrap; font-weight: bold; text-shadow: 0 0 4px rgba(255,255,255,0.8); background: rgba(255,255,255,0.6); backdrop-filter: blur(4px); padding: 4px 8px; border-radius: 4px; border: 1px solid #fbcfe8; pointer-events: none;">Made with ❤️ in Japan</div>`,
      className: 'empty-class',
      iconSize: [200, 20],
    });
    L.marker([36.2048, 138.2529], { icon: japanIcon, interactive: false }).addTo(map);

    mapRef.current = map;
    map.on('zoomend', () => setZoomLevel(map.getZoom()));

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
    };
  }, [isMobile]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) tileLayerRef.current.remove();
    const isDark = document.documentElement.classList.contains('dark');
    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
    const tile = L.tileLayer(tileUrl, { subdomains: 'abcd', maxZoom: 19 });
    tile.addTo(map);
    tileLayerRef.current = tile;
  }, []);

  // 1. Fetch GeoJSON once
  useEffect(() => {
    const controller = new AbortController();
    const BASE = import.meta.env.BASE_URL || '/';

    fetch(`${BASE}data/nepal-constituencies.geojson`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setGeojsonData(data))
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Failed to load GeoJSON:', err);
        }
      });

    return () => controller.abort();
  }, []);

  // 2. Manage Layer Creation
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geojsonData) return;

    if (geojsonLayerRef.current) {
      geojsonLayerRef.current.remove();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layer = L.geoJSON(geojsonData as any, {
      style: styleFeature,
      onEachFeature: (feature, layer) => {
        const props = feature.properties || {};
        const distId: number = props.distId;
        const constId: number = props.constId;

        const distName = t.getDistrictName(distId);
        const areaLabel = `${distName} ${constId}`;
        const areaIdOnly = `${constId}`;

        if (zoomLevel >= 10) {
          layer.bindTooltip(areaIdOnly, {
            permanent: true,
            direction: 'center',
            className:
              'bg-transparent border-none shadow-none font-bold text-[10px] pointer-events-none opacity-80 text-text-muted',
          });
        } else if (zoomLevel >= 8) {
          layer.bindTooltip(areaLabel, {
            permanent: true,
            direction: 'center',
            className:
              'bg-transparent border-none shadow-none font-bold text-[9px] pointer-events-none opacity-60 text-text-muted',
          });
        }

        layer.on('mousemove', (e: L.LeafletMouseEvent) => {
          if (onHover) {
            onHover({
              distId,
              constId,
              x: e.originalEvent.clientX,
              y: e.originalEvent.clientY,
            });
          }
          (layer as L.Path).setStyle({ weight: 2.5, color: '#10b981', fillOpacity: 0.95 });
        });

        layer.on('click', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          const leader =
            leaderByConstKey.current[`${distId}-${constId}`] ||
            leaderByDistKey.current[`${distId}`];
          if (leader) onShare(leader);
        });

        layer.on('mouseout', () => {
          if (onHover) onHover(null);
          (layer as L.Path).setStyle(styleFeature(feature) as L.PathOptions);
        });
      },
    });

    layer.addTo(map);
    geojsonLayerRef.current = layer;

    return () => {
      if (layer && map) layer.remove();
    };
  }, [geojsonData, zoomLevel, t, onHover, onShare, styleFeature]);

  useEffect(() => {
    if (geojsonLayerRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (geojsonLayerRef.current as L.GeoJSON).setStyle(styleFeature as any);
    }
  }, [resultsData, styleFeature]);

  return (
    <div
      className={`relative w-full transition-all duration-500 ease-in-out ${isCollapsed ? 'h-32' : 'h-[65vh] lg:h-[85vh]'}`}
      style={{ minHeight: isCollapsed ? 128 : 500 }}
    >
      <div
        ref={mapDivRef}
        className="w-full h-full rounded-2xl overflow-hidden"
        style={{ touchAction: 'auto' }}
      />

      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-4 left-4 z-[1001] px-3 py-1.5 rounded-xl font-bold text-xs shadow-lg backdrop-blur-md border transition-all bg-surface-card border-border-default text-text-main"
      >
        {isCollapsed ? t.showMap : t.hideMap}
      </button>

      {/* Map Legend: Status */}
      {!isCollapsed && (
        <>
          <div className="absolute bottom-4 left-4 z-[1000] rounded-xl px-3 py-2 text-[10px] border bg-surface-card border-border-default">
            <div className="font-bold uppercase tracking-widest mb-1.5 text-text-muted">
              {t.colStatus}
            </div>
            <div className="flex items-center gap-1.5 mb-1 text-text-muted">
              <div className="w-5 h-2.5 rounded-sm border border-white bg-brand-main" />
              <span>{t.statusElected}</span>
            </div>
            <div className="flex items-center gap-1.5 mb-1 text-text-muted">
              <div className="w-5 h-2.5 rounded-sm border-2 border-dashed border-brand-main/50 bg-brand-main/40" />
              <span>{t.statusLeading}</span>
            </div>
            <div className="flex items-center gap-1.5 text-text-muted">
              <div className="w-5 h-2.5 rounded-sm opacity-20 bg-surface-main" />
              <span>{t.noData}</span>
            </div>
          </div>

          {/* Map Legend: Parties */}
          <div className="absolute bottom-4 right-4 z-[1000] rounded-xl px-3 py-2 text-[10px] border hidden sm:block bg-surface-card border-border-default">
            {Object.entries(partyColors)
              .slice(0, 6)
              .map(([party, color]) => (
                <div key={party} className="flex items-center gap-1.5 mb-1 last:mb-0">
                  <div
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate max-w-[110px] text-text-muted">{party}</span>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
