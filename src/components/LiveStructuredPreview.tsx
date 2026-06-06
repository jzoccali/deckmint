import React from 'react';
import type { PromptTemplate } from '../types/prompt';

interface StructuredValues {
  subject: string;
  useCase: string;
  layout: string;
  color: string;
  typography: string;
  style: string;
  onImageText: string;
}

interface Props {
  template: PromptTemplate;
  structured: StructuredValues;
  size?: 'md' | 'lg';
  className?: string;
}

// A much more alive preview that tries to reflect the live structured CMS values.
// Pure CSS / heuristic driven — no images, no external deps. The goal is "I change the color field and the visual updates".
export const LiveStructuredPreview: React.FC<Props> = ({ template, structured, size = 'lg', className = '' }) => {
  const { aspect_ratio, visual_type } = template;

  const ratioClass =
    aspect_ratio === '1:1' ? 'aspect-square' :
    aspect_ratio === '16:9' ? 'aspect-[16/9]' :
    aspect_ratio === '3:4' ? 'aspect-[3/4]' :
    'aspect-[4/5]';

  const isLarge = size === 'lg';

  // === Color parsing (very heuristic but surprisingly effective) ===
  const colorStr = (structured.color || template.color || '').toLowerCase();
  const bg =
    /black|charcoal|dark slate|deep navy|midnight/i.test(colorStr) ? '#0f1115' :
    /cream|warm off.white|warm white|ivory|paper|beige/i.test(colorStr) ? '#f8f5ef' :
    /white|light grey|soft white|clean white/i.test(colorStr) ? '#fafafa' :
    /slate|cool grey|stone/i.test(colorStr) ? '#f1f5f9' :
    '#f4f4f6';

  const accent =
    /#([0-9a-f]{3,6})/i.exec(structured.color)?.[0] ||
    (/orange|#e85d04|burnt/i.test(colorStr) ? '#e85d04' :
     /emerald|green|teal|mint/i.test(colorStr) ? '#10b981' :
     /blue|navy|indigo|deep blue/i.test(colorStr) ? '#1e40af' :
     /pink|rose|magenta|neon/i.test(colorStr) ? '#ec4899' :
     /teal|cyan/i.test(colorStr) ? '#14b8a6' :
     /red|coral|terracotta/i.test(colorStr) ? '#dc2626' :
     /amber|gold|yellow/i.test(colorStr) ? '#f59e0b' :
     /violet|purple/i.test(colorStr) ? '#7c3aed' :
     '#2563eb');

  const textColor = /black|dark|charcoal|navy|deep/i.test(colorStr) ? '#f5f5f7' : '#1f2937';
  const mutedText = /black|dark/i.test(colorStr) ? 'rgba(245,245,247,0.75)' : 'rgba(31,41,55,0.7)';

  // === Typography simulation ===
  const typo = (structured.typography || template.typography || '').toLowerCase();
  const isSerif = /serif|editorial|classic|garamond|playfair/i.test(typo);
  const isCondensed = /condensed|narrow|tight|compact/i.test(typo);
  const isBold = /bold|heavy|black|extrabold/i.test(typo);
  const titleFont = isSerif ? 'font-serif' : 'font-sans';
  const titleWeight = isBold ? 'font-extrabold' : 'font-semibold';
  const titleTracking = isCondensed ? 'tracking-tighter' : 'tracking-[-0.2px]';

  // === Layout heuristics (the fun part) ===
  const layout = (structured.layout || template.layout || '').toLowerCase();
  const hasTopHeavy = /top.?heavy|hero.?top|large top|header dominant/i.test(layout);
  const isGrid = /grid|3.?col|2.?col|columns|matrix/i.test(layout);
  const isSplit = /split|two.?column|left.?right|side.?by.?side/i.test(layout);
  // (isCentered reserved for future layout variants)
  const isTimeline = /timeline|steps|vertical flow|numbered/i.test(layout);
  const hasBottomBar = /bottom bar|footer strip|bottom band|accent bar at bottom/i.test(layout);

  // New high-value mode: geographic density / choropleth style (perfect for population density by state, etc.)
  const isDensityMap = /map|choropleth|density|by state|geographic|regional|us map|united states|states shaded|fill by/i.test(layout) ||
                       /density|choropleth|map of/i.test(structured.subject.toLowerCase());

  // === On-image text (exact strings the user typed — we try to place them plausibly) ===
  const textLines = (structured.onImageText || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .slice(0, 6); // keep it reasonable in the mock

  const subject = (structured.subject || template.name || '').trim();

  // Main render surface
  const renderLive = () => {
    // Big headline area using subject + first text line
    const headline = subject || (textLines[0] ?? 'Your subject');

    if (isGrid) {
      return (
        <div className="h-full w-full p-2 flex flex-col" style={{ background: bg, color: textColor }}>
          <div className={`text-[13px] leading-tight mb-1.5 ${titleFont} ${titleWeight} ${titleTracking}`} style={{ color: accent }}>
            {headline}
          </div>
          <div className="grid grid-cols-3 gap-1 flex-1">
            {[0,1,2].map((i) => (
              <div key={i} className="rounded border p-1 flex flex-col" style={{ borderColor: accent + '40', background: 'rgba(255,255,255,0.5)' }}>
                <div className="h-1.5 w-4/5 rounded mb-1" style={{ background: accent, opacity: 0.9 }} />
                <div className="text-[7px] leading-[9px] line-clamp-3" style={{ color: mutedText }}>
                  {textLines[i + 1] || '• detail'}
                </div>
              </div>
            ))}
          </div>
          {textLines.length > 3 && (
            <div className="mt-1 text-[8px] opacity-70">{textLines.slice(3).join('  •  ')}</div>
          )}
        </div>
      );
    }

    if (isSplit) {
      return (
        <div className="h-full w-full flex" style={{ background: bg }}>
          <div className="w-2/5 p-2 flex flex-col" style={{ color: textColor }}>
            <div className={`text-[11px] leading-tight ${titleFont} ${titleWeight}`} style={{ color: accent }}>{headline}</div>
            <div className="mt-auto text-[7px] leading-tight opacity-75">
              {textLines.slice(0, 2).map((l, i) => <div key={i}>• {l}</div>)}
            </div>
          </div>
          <div className="w-px" style={{ background: accent + '30' }} />
          <div className="flex-1 p-2 flex flex-col justify-center gap-1" style={{ background: 'rgba(255,255,255,0.35)' }}>
            {textLines.slice(2, 5).map((l, i) => (
              <div key={i} className="text-[8px] px-1 py-0.5 rounded" style={{ background: accent + '15', color: textColor }}>{l}</div>
            ))}
          </div>
        </div>
      );
    }

    if (isTimeline || visual_type.includes('step')) {
      return (
        <div className="h-full w-full p-2 flex flex-col" style={{ background: bg, color: textColor }}>
          <div className={`text-[12px] mb-2 ${titleFont} ${titleWeight}`} style={{ color: accent }}>{headline}</div>
          <div className="flex-1 space-y-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-1.5 items-start">
                <div className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0" style={{ background: accent, opacity: 0.85 }} />
                <div className="text-[8px] leading-tight flex-1">
                  {textLines[i] || (i === 0 ? 'Step one' : 'Next step')}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // === Density / Choropleth map style (high-value for population density, demographic maps, by-state data) ===
    if (isDensityMap) {
      // Parse real state + percentage lines from onImageText for accurate, labeled tiles.
      // Expected lines like: "Region A — 52%" or "AB 47%" or "Category Name 31%" (any label + percentage)
      const stateEntries = textLines.length > 0
        ? textLines.map(l => {
            const pctMatch = /(\d+)%/.exec(l);
            const pct = pctMatch ? parseInt(pctMatch[1], 10) : 30;
            // Try to extract a short label: prefer full name, abbreviation, or the part before the number.
            const labelMatch = /^([A-Za-z][A-Za-z\s\.]+?)\s*[-—:]\s*\d|([A-Z]{2})\s+\d/.exec(l);
            let label = (labelMatch?.[1] || labelMatch?.[2] || l.split(/\s|—|-|:/)[0] || '').trim();
            if (label.length > 14) label = label.slice(0, 11) + '…';
            return { label: label || 'State', pct };
          })
        : [
            { label: 'A', pct: 48 },
            { label: 'B', pct: 37 },
            { label: 'C', pct: 31 },
            { label: 'D', pct: 25 },
            { label: 'E', pct: 18 },
          ];

      const maxPct = Math.max(...stateEntries.map(e => e.pct), 50);
      const getIntensity = (p: number) => Math.max(0.18, Math.min(0.92, p / maxPct));

      return (
        <div className="h-full w-full p-1.5 flex flex-col" style={{ background: bg, color: textColor }}>
          <div className={`text-[10px] mb-1 font-semibold tracking-[-0.1px] ${titleFont}`} style={{ color: accent }}>{headline}</div>

          {/* State density tiles — feels like a mini choropleth / state grid */}
          <div className="flex-1 grid grid-cols-5 gap-1">
            {stateEntries.slice(0, 5).map((entry, i) => {
              const intensity = getIntensity(entry.pct);
              const tileBg = `linear-gradient(145deg, ${accent} ${intensity * 55}%, ${bg} ${intensity * 78}%)`;
              return (
                <div
                  key={i}
                  className="rounded-sm border flex flex-col items-center justify-center text-center overflow-hidden"
                  style={{
                    borderColor: accent + '55',
                    background: tileBg,
                  }}
                >
                  <div className="text-[11px] font-extrabold leading-none" style={{ color: accent }}>{entry.pct}%</div>
                  <div className="text-[6.5px] mt-0.5 opacity-85 tracking-[0.3px]">{entry.label}</div>
                </div>
              );
            })}
          </div>

          {/* Bottom legend / source strip */}
          <div className="mt-1 flex items-center justify-between text-[6px] opacity-70">
            <div>Shading = density</div>
            <div className="truncate">{textLines.find(l => /source/i.test(l)) || 'Source: your data'}</div>
          </div>
        </div>
      );
    }

    // Default / hero-ish treatment (top heavy, centered, or generic card)
    return (
      <div className="h-full w-full flex flex-col" style={{ background: bg, color: textColor }}>
        {/* Top accent zone or hero band */}
        <div className={`${hasTopHeavy ? 'h-2/5' : 'h-1/3'} w-full flex items-center justify-center px-2`} style={{ background: accent + '18' }}>
          <div className={`text-center text-[13px] leading-[15px] ${titleFont} ${titleWeight} ${titleTracking}`} style={{ color: accent }}>
            {headline}
          </div>
        </div>

        {/* Body content area with on-image text placed as realistically as we can */}
        <div className="flex-1 p-2 flex flex-col justify-between">
          <div className="space-y-1">
            {textLines.slice(0, 3).map((line, idx) => (
              <div key={idx} className={`text-[9px] ${idx === 0 ? 'font-semibold' : ''}`} style={{ color: idx === 0 ? accent : textColor }}>
                {line}
              </div>
            ))}
            {textLines.length === 0 && (
              <div className="text-[8px] opacity-60">Your on-image text will appear here…</div>
            )}
          </div>

          {/* Bottom info strip (use case / style hint) */}
          <div className="flex items-center justify-between text-[7px] opacity-70 pt-1 border-t" style={{ borderColor: accent + '25' }}>
            <div>{structured.useCase || template.use_case}</div>
            {hasBottomBar && <div className="h-1 w-8 rounded" style={{ background: accent, opacity: 0.5 }} />}
          </div>
        </div>

        {/* Optional style treatment overlay */}
        {/flat|minimal|clean/i.test(structured.style) && (
          <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)' }} />
        )}
      </div>
    );
  };

  return (
    <div
      className={`thumbnail-container ${ratioClass} ${className} overflow-hidden border border-[var(--border)]`}
      data-ratio={aspect_ratio}
      title="Live visual preview — updates as you edit the six structured fields"
    >
      <div className={`thumbnail relative ${isLarge ? '' : 'text-[5px]'}`}>
        {renderLive()}
        {/* Subtle live indicator */}
        <div className="absolute top-1 right-1 text-[7px] px-1 rounded bg-black/60 text-white tracking-[0.5px]">LIVE</div>
      </div>
    </div>
  );
};
