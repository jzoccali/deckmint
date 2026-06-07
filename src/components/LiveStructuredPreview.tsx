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

    if (isTimeline || visual_type.includes('step') || visual_type === 'cheatsheet') {
      // High-fidelity modern premium cheat sheet / step guide preview.
      // Dark cosmic background + vibrant glowing numbered cards with colored borders and depth.
      // This is what makes the Structured tab feel like you can actually produce 2025-2026 quality lead magnets.
      const stepCount = 5;
      const stepColors = ['#a78bfa', '#60a5fa', '#34d399', '#f472b6', '#f59e0b'];
      const stepIcons = ['🎯', '🏗️', '📸', '💬', '📈'];

      // Try to parse real step text from onImageText if the user has typed good lines.
      const parsedSteps = textLines.length >= 3 ? textLines.slice(0, stepCount) : null;

      return (
        <div
          className="h-full w-full p-2 flex flex-col relative overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #0b0c12 0%, #0a0b10 100%)',
            color: '#f1f5f9',
          }}
        >
          {/* Subtle premium grid texture */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 4px)',
            }}
          />

          <div className={`text-[11px] mb-1.5 font-black tracking-[-0.4px] relative z-10`} style={{ color: '#c026ff' }}>
            {headline || '5 Steps. Max Impact.'}
          </div>

          <div className="relative z-10 flex-1 flex flex-col gap-1">
            {Array.from({ length: stepCount }).map((_, i) => {
              const col = stepColors[i % stepColors.length];
              const icon = stepIcons[i % stepIcons.length];
              const line = parsedSteps && parsedSteps[i] ? parsedSteps[i] : (i === 0 ? 'Claim & verify your spot' : i === 1 ? 'Optimize so you are impossible to ignore' : i === 2 ? 'Post high-signal content consistently' : i === 3 ? 'Turn happy customers into proof' : 'Measure, double down, dominate');
              return (
                <div
                  key={i}
                  className="flex items-start gap-1.5 rounded px-1 py-0.5"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${col}55`,
                    boxShadow: `0 0 0 1px ${col}22, 0 0 7px ${col}22 inset`,
                  }}
                >
                  <div
                    className="w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center text-[7px] font-black mt-px"
                    style={{
                      background: col,
                      color: '#0b0c12',
                      boxShadow: `0 0 5px ${col}, 0 0 10px ${col}99`,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[7px] opacity-80">{icon}</span>
                      <span className="text-[7.5px] font-semibold tracking-[-0.1px] leading-tight text-white/95">{line}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative z-10 mt-1 text-center text-[5.5px] font-bold tracking-[0.6px]" style={{ color: '#c026ff' }}>
            CONSISTENCY TODAY • DOMINANCE TOMORROW
          </div>
        </div>
      );
    }

    // === Rich modern carousel roles (the ones that looked flat and tragic before) ===
    if (visual_type.includes('carousel')) {
      if (visual_type === 'carousel-cover' || /cover|hook|question|personal|story/i.test((template.name || '').toLowerCase())) {
        const q = textLines[0] || 'The one mistake that cost me $47k';
        const sub = textLines[1] || 'A 4-slide story about learning the hard way';
        return (
          <div className="h-full w-full p-1.5 flex flex-col" style={{ background: bg, color: textColor }}>
            <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
              <div className={`text-[10px] leading-[12px] font-extrabold ${titleFont}`} style={{ color: accent }}>{q}</div>
              <div className="text-[6px] mt-1 opacity-75">{sub}</div>
            </div>
            <div className="text-[4.5px] text-center opacity-60 tracking-wide">Swipe to see what I would do differently →</div>
          </div>
        );
      }
      if (visual_type === 'carousel-interior' || /interior|standard/i.test((template.name || '').toLowerCase())) {
        const tag = textLines[0] || '01 / 04 • Mistake #2';
        const h = textLines[1] || 'Chasing every shiny object';
        const b1 = textLines[2] || 'I said yes to every opportunity for 18 months.';
        const b2 = textLines[3] || 'Here is the simple filter I use now.';
        return (
          <div className="h-full w-full p-1.5 flex flex-col" style={{ background: bg, color: textColor }}>
            <div className="text-[5px] opacity-60 mb-0.5">{tag}</div>
            <div className={`text-[9px] leading-tight font-semibold mb-1`} style={{ color: accent }}>{h}</div>
            <div className="flex-1 text-[6px] leading-[8px] opacity-85">
              <div>{b1}</div>
              <div className="mt-0.5">{b2}</div>
            </div>
            <div className="mt-1 text-[4px] opacity-60 text-center">Swipe for the next →</div>
          </div>
        );
      }
      if (visual_type === 'carousel-closing' || /closing|cta|final/i.test((template.name || '').toLowerCase())) {
        const ask = textLines[0] || 'Which of these mistakes are you making right now?';
        return (
          <div className="h-full w-full p-1.5 flex flex-col" style={{ background: bg, color: textColor }}>
            <div className={`text-[8px] leading-tight font-semibold mb-1.5`} style={{ color: accent }}>{ask}</div>
            <div className="flex-1 flex flex-col gap-1 justify-center">
              {['Comment the number', 'Save this', 'DM me "FILTER"'].map((c, i) => (
                <div key={i} className="text-center text-[5.5px] py-[1px] rounded-full border" style={{ borderColor: accent + '50', background: accent + '12' }}>{c}</div>
              ))}
            </div>
            <div className="text-[4px] text-center opacity-70">@yourhandle</div>
          </div>
        );
      }
    }

    // === Rich knowledge / explainer cards (the light 3-point ones that still looked 1997) ===
    if (visual_type === 'knowledge-card' || /knowledge|explainer|concept/i.test((template.name || '').toLowerCase())) {
      const t1 = textLines[0] || textLines[1] || 'A bridge between programs';
      const t2 = textLines[1] || textLines[2] || 'Moves data from A to B';
      const t3 = textLines[2] || textLines[3] || 'How frontend and backend work together';
      return (
        <div className="h-full w-full p-1.5 flex flex-col" style={{ background: bg, color: textColor }}>
          <div className={`text-[8px] leading-[10px] font-semibold mb-1 ${titleFont}`} style={{ color: accent }}>{headline}</div>
          <div className="flex-1 grid grid-rows-3 gap-1">
            {[t1, t2, t3].map((txt, i) => (
              <div key={i} className="rounded-md border px-1.5 py-0.5 flex items-center text-[5.5px] leading-tight" style={{ borderColor: accent + '35', background: 'rgba(255,255,255,0.85)' }}>
                <div className="w-1.5 h-1.5 rounded-full mr-1 flex-shrink-0" style={{ background: accent }} />
                <div className="truncate">{txt}</div>
              </div>
            ))}
          </div>
          <div className="text-[4px] opacity-60 mt-0.5">In 3 Minutes</div>
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

    // === Premium modern Blog / Article heroes + Mockups (the ones people actually post in 2026) ===
    if (visual_type === 'blog-hero' || visual_type === 'mockup') {
      const n = (template.name || '').toLowerCase();

      // Engineer's desk — warm top-down lifestyle with depth
      if (/engineer|desk|workspace|laptop/i.test(n)) {
        return (
          <div className="h-full w-full p-1 relative overflow-hidden" style={{ background: '#f4e9d8' }}>
            <div className="absolute inset-1 rounded-sm overflow-hidden" style={{ background: 'linear-gradient(145deg, #e8d9c2 0%, #d4b78f 60%, #b38b5e 100%)' }}>
              {/* Laptop */}
              <div className="absolute left-[10%] top-[14%] w-[42%] h-[52%] rounded-sm shadow" style={{ background: '#1f2937' }}>
                <div className="absolute inset-[6%] rounded-sm" style={{ background: '#0f172a' }} />
                <div className="absolute left-[10%] top-[12%] right-[10%] space-y-0.5">
                  <div className="h-0.5 bg-sky-400/70 w-3/4 rounded" />
                  <div className="h-0.5 bg-sky-400/50 w-1/2 rounded" />
                  <div className="h-0.5 bg-sky-400/40 w-5/6 rounded" />
                </div>
              </div>
              {/* Coffee */}
              <div className="absolute right-[14%] top-[18%] w-[11%] h-[16%] rounded-full" style={{ background: '#3f2a1f', boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.2)' }} />
              {/* Plant */}
              <div className="absolute right-[8%] bottom-[14%] w-[9%] h-[12%] rounded-full" style={{ background: '#166534' }} />
              {/* Keyboard hint */}
              <div className="absolute left-[14%] bottom-[10%] w-[28%] h-[6%] rounded" style={{ background: '#374151' }} />
              {/* Subtle window light */}
              <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent" />
            </div>
            {/* Tiny on-screen / sticky text */}
            <div className="absolute bottom-[6%] left-[12%] text-[5px] text-[#3f2a1f]/80 tracking-wide">Side Project • launch v1.0</div>
          </div>
        );
      }

      // Listicle giant number
      if (/listicle|giant number|big number/i.test(n)) {
        return (
          <div className="h-full w-full p-0.5 flex" style={{ background: '#2b1f3d' }}>
            <div className="flex-1 p-1.5 flex flex-col justify-center">
              <div className="text-[7px] font-bold text-white/90 leading-none">10 skills new frontend<br />engineers should learn in 2026</div>
            </div>
            <div className="w-[46%] flex items-center justify-center text-white text-[26px] font-black tracking-[-2px]" style={{ background: 'linear-gradient(135deg, #c026ff, #f472b6)', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
              10
            </div>
          </div>
        );
      }

      // Magazine cover homage
      if (/magazine|masthead|wired/i.test(n)) {
        return (
          <div className="h-full w-full p-0.5" style={{ background: '#111' }}>
            <div className="h-full w-full rounded-sm overflow-hidden relative" style={{ background: '#111' }}>
              <div className="absolute top-0 left-0 right-0 h-[13%] bg-white flex items-center justify-center">
                <div className="text-[5.5px] font-black tracking-[2px] text-black">TECH MAG</div>
              </div>
              <div className="absolute top-[18%] left-1/2 -translate-x-1/2 text-center px-1">
                <div className="text-[6.5px] leading-[7.5px] font-serif text-white">The next decade of AI<br />rewriting engineering work</div>
              </div>
              <div className="absolute bottom-[7%] left-[7%] w-[16%] h-[5%] flex gap-px">
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="flex-1" style={{ background: i % 2 === 0 ? '#fff' : 'transparent' }} />)}
              </div>
              <div className="absolute bottom-[5%] right-[7%] text-[3px] text-white/60 tracking-widest">MAY 2026</div>
            </div>
          </div>
        );
      }

      // Polaroid / modern collage
      if (/polaroid|collage|retro/i.test(n)) {
        return (
          <div className="h-full w-full p-0.5" style={{ background: '#d2b48c' }}>
            <div className="h-full w-full rounded-sm relative" style={{ background: '#c9a77a' }}>
              {[-11, 7, -5, 4].map((rot, idx) => (
                <div key={idx} className="absolute bg-white shadow" style={{
                  width: '24%', height: '28%',
                  left: 8 + idx * 16 + '%', top: 12 + (idx % 2) * 7 + '%',
                  transform: `rotate(${rot}deg)`,
                }}>
                  <div className="h-[62%] bg-[#e8dcc8]" />
                  <div className="h-[38%] text-[3px] text-[#3f2a1f]/70 flex items-end justify-center pb-px">label</div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // App / device mockup
      if (/app mock|phone|device|interface/i.test(n)) {
        return (
          <div className="h-full w-full p-1 flex items-center justify-center" style={{ background: '#f1f5f9' }}>
            <div className="w-[38%] h-[82%] rounded-2xl border border-black/20 bg-white overflow-hidden shadow relative">
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full bg-black/20" />
              <div className="p-1 pt-2 text-[4.5px]">
                <div className="font-semibold tracking-tight">DeckMint</div>
                <div className="text-[3.5px] text-black/60">Structured prompts for production graphics</div>
                <div className="mt-1 h-1 bg-emerald-500/70 rounded" />
                <div className="mt-0.5 space-y-0.5">
                  <div className="h-0.5 bg-black/10 rounded" />
                  <div className="h-0.5 bg-black/10 rounded w-5/6" />
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Generic strong blog hero
      return (
        <div className="h-full w-full p-1 flex flex-col" style={{ background: bg, color: textColor }}>
          <div className="flex-1 flex items-center justify-center text-center px-1">
            <div className={`text-[9px] leading-tight ${titleFont} ${titleWeight}`} style={{ color: accent }}>{headline}</div>
          </div>
          <div className="text-[5px] opacity-60 text-center pb-0.5">Premium modern hero</div>
        </div>
      );
    }

    // === Quote cards (editorial + japanese minimal) ===
    if (visual_type === 'quote-card') {
      const isJapanese = /japanese|minimal|handwritten|slow/i.test((template.name || '').toLowerCase());
      if (isJapanese) {
        return (
          <div className="h-full w-full flex items-center justify-center p-2" style={{ background: '#f8f1e3', color: '#3f2a1f' }}>
            <div className="text-center">
              <div className="text-[11px] leading-tight font-light tracking-[-0.1px]">Slow is fast.</div>
              <div className="text-[4px] mt-1 opacity-60">2026.05 / @yourhandle</div>
            </div>
          </div>
        );
      }
      return (
        <div className="h-full w-full p-1 flex" style={{ background: '#e8e1d9' }}>
          <div className="w-[32%] flex items-center justify-center">
            <div className="w-6 h-7 rounded-full" style={{ background: '#4b4b4b', opacity: 0.85 }} />
          </div>
          <div className="flex-1 flex flex-col justify-center pr-1 text-[6.5px] leading-tight text-[#1f2937]">
            Design is not just what it looks like and feels like.<br />Design is how it works.
            <div className="text-[4px] mt-0.5 opacity-70">— Steve Jobs</div>
          </div>
        </div>
      );
    }

    // === Planner / Habit tracker (premium productivity) ===
    if (visual_type === 'planner') {
      return (
        <div className="h-full w-full p-1.5" style={{ background: '#f8f7f4', color: '#1f2937' }}>
          <div className="text-[6px] font-semibold mb-0.5">Week of June 8</div>
          <div className="space-y-0.5 text-[4.5px]">
            {['Mon • Deep work 3h ✓', 'Tue • Ship v2', 'Wed • No meetings', 'Thu • Review + plan', 'Fri • Buffer & reset'].map((l, i) => (
              <div key={i} className="flex items-center gap-0.5">
                <div className="w-1.5 h-1.5 border border-[#166534] rounded-sm flex-shrink-0" />
                <div>{l}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // === Recipe card (appetizing modern) ===
    if (visual_type === 'recipe') {
      return (
        <div className="h-full w-full p-1 flex flex-col" style={{ background: '#f8f5ef' }}>
          <div className="h-5 bg-gradient-to-r from-[#854d0e] to-[#a16207] rounded-sm mb-0.5" />
          <div className="text-[6px] font-semibold">One-Pan Miso Butter Pasta</div>
          <div className="text-[4px] text-black/60">15 min • Serves 2</div>
          <div className="mt-0.5 text-[4px] leading-tight">
            200g pasta • 2 tbsp butter • 1 tbsp miso<br />Chili + scallion • Boil. Brown. Toss.
          </div>
        </div>
      );
    }

    // === Itinerary (premium travel) ===
    if (visual_type === 'itinerary') {
      return (
        <div className="h-full w-full p-1.5 text-[5px]" style={{ background: '#f1f5f9', color: '#1e2937' }}>
          <div className="font-semibold tracking-tight mb-0.5">Kyoto • One Perfect Day</div>
          <div className="space-y-0.5 leading-tight">
            <div>07:30 — Coffee at % Arabica</div>
            <div>08:30 — Fushimi Inari (early)</div>
            <div>11:00 — Arashiyama bamboo</div>
            <div>13:00 — Lunch at Kinsui</div>
            <div>18:00 — Gion walk + dinner</div>
          </div>
        </div>
      );
    }

    // === Before / After (strong educational contrast) ===
    if (visual_type === 'before-after') {
      const isUI = /ui|screen|redesign|login/i.test((template.name || '').toLowerCase());
      if (isUI) {
        return (
          <div className="h-full w-full p-0.5 flex text-[4.5px]">
            <div className="flex-1 bg-[#f43f5e] text-white p-0.5 rounded-l-sm">
              <div className="font-bold mb-0.5">Before</div>
              <div className="text-[3px] leading-none">Member Login<br />[rainbow chaos, bad fonts]</div>
            </div>
            <div className="w-px bg-black/30" />
            <div className="flex-1 bg-white text-[#1e2937] p-0.5 rounded-r-sm border border-black/10">
              <div className="font-bold mb-0.5 text-emerald-700">After</div>
              <div className="text-[3px] leading-none">Welcome back<br />[beautiful modern form]</div>
            </div>
          </div>
        );
      }
      return (
        <div className="h-full w-full p-1 flex flex-col text-[5px]">
          <div className="bg-[#e5e7eb] p-0.5 rounded-t">
            <div className="font-semibold">Before</div>
            <div className="text-[3.5px] leading-tight text-black/70">Long corporate paragraph full of buzzwords and zero clarity...</div>
          </div>
          <div className="bg-[#10b981] text-white p-0.5 rounded-b">
            <div className="font-semibold">After</div>
            <div className="text-[3.5px] leading-tight">Ship faster. Waste less. Sleep better.</div>
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
