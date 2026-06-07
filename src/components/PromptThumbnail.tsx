import React from 'react';
import type { PromptTemplate } from '../types/prompt';

interface Props {
  template: PromptTemplate;
  size?: 'sm' | 'md';
  className?: string;
}

// A smart, pure-CSS visual mock that captures the essence of each visual_type + color/ layout hints.
// This gives instant, distinctive thumbnails without any external images or API calls.
export const PromptThumbnail: React.FC<Props> = ({ template, size = 'md', className = '' }) => {
  const { visual_type, aspect_ratio, thumbnail_visual, color, name } = template;

  const ratioClass =
    aspect_ratio === '1:1' ? 'aspect-square' :
    aspect_ratio === '16:9' ? 'aspect-[16/9]' :
    aspect_ratio === '3:4' ? 'aspect-[3/4]' :
    'aspect-[4/5]';

  const isSmall = size === 'sm';

  // Heuristic color extraction for the mocks (keeps them faithful to the prompt descriptions)
  const bg = /black|dark grey/i.test(color) ? '#111113' : /cream|warm|off-white|white/i.test(color) ? '#f8f7f4' : '#f4f4f6';
  const accent = /orange|#e85d04/i.test(color) ? '#e85d04' : /green/i.test(color) ? '#10b981' : /blue|deep blue/i.test(color) ? '#1e40af' : /pink|neon/i.test(color) ? '#ec4899' : /teal/i.test(color) ? '#14b8a6' : /red/i.test(color) ? '#dc2626' : '#2563eb';
  const textColor = /black|dark/i.test(color) ? '#f5f5f7' : '#1f2937';

  const nameLower = (name || '').toLowerCase();
  const layoutLower = (template.layout || '').toLowerCase();

  // Richer, more distinctive pure-CSS thumbnails.
  // Goal: the library grid should immediately communicate "this is what good output from this template looks like".
  const renderMock = () => {
    // === Knowledge / Explainer family ===
    if (visual_type === 'knowledge-card' || visual_type === 'step-card') {
      return (
        <div className="flex flex-col h-full w-full p-1.5" style={{ background: bg, color: textColor }}>
          <div className="h-2.5 w-3/4 rounded mb-1" style={{ background: accent, opacity: 0.95 }} />
          <div className="flex-1 grid grid-rows-3 gap-1">
            {[0,1,2].map(i => (
              <div key={i} className="rounded border flex items-center px-1" style={{ borderColor: accent + '55', background: 'rgba(255,255,255,0.6)' }}>
                <div className="w-2 h-2 rounded-full mr-1" style={{ background: accent }} />
                <div className="flex-1 h-1 bg-black/10 rounded" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (visual_type === 'cheatsheet') {
      return (
        <div className="h-full w-full p-1 grid grid-cols-2 grid-rows-5 gap-0.5" style={{ background: '#0a0a0a', color: '#eee' }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="text-[5px] flex items-center px-0.5 border" style={{ borderColor: '#14b8a6' }}>
              <div className="w-2 h-1 bg-[#14b8a6]/70 mr-0.5" /> <div className="flex-1 h-0.5 bg-white/30" />
            </div>
          ))}
        </div>
      );
    }

    if (visual_type === 'comparison-card') {
      return (
        <div className="h-full w-full flex p-1 gap-0.5" style={{ background: '#f8f7f4' }}>
          <div className="flex-1 rounded" style={{ background: '#86efac' }} />
          <div className="w-px bg-black/20" />
          <div className="flex-1 rounded" style={{ background: '#93c5fd' }} />
        </div>
      );
    }

    if (visual_type === 'contrast-card') {
      return (
        <div className="h-full w-full flex p-1 gap-0.5" style={{ background: '#fff' }}>
          <div className="flex-1 rounded-tl" style={{ background: '#fee2e2' }} />
          <div className="w-px bg-black/20" />
          <div className="flex-1 rounded-tr" style={{ background: '#d1fae5' }} />
        </div>
      );
    }

    // === Data / Statistical family — make these actually look like ranked data ===
    if (visual_type === 'data-card' || /statistical|data fact/i.test(name) || (visual_type === 'infographic' && /bar|rank|stat|chart/i.test(nameLower + ' ' + layoutLower))) {
      // 5 ranked horizontal bars with short labels + percentages (feels like the real structured preview)
      const bars = [
        { label: 'Alpha', w: 92, pct: '47%' },
        { label: 'Beta', w: 64, pct: '29%' },
        { label: 'Gamma', w: 38, pct: '14%' },
        { label: 'Delta', w: 22, pct: '7%' },
        { label: 'Eps', w: 11, pct: '3%' },
      ];
      return (
        <div className="h-full w-full p-1 flex flex-col" style={{ background: bg, color: textColor }}>
          <div className="h-2 w-2/3 rounded mb-1" style={{ background: accent }} />
          <div className="flex-1 flex flex-col justify-center gap-0.5 px-0.5">
            {bars.map((b, i) => (
              <div key={i} className="flex items-center gap-0.5">
                <div className="w-6 text-[4.5px] opacity-70 truncate">{b.label}</div>
                <div className="flex-1 h-1.5 rounded-sm" style={{ width: `${b.w}%`, background: accent, opacity: 0.9 + (4 - i) * 0.02 }} />
                <div className="w-5 text-[5px] font-semibold tabular-nums">{b.pct}</div>
              </div>
            ))}
          </div>
          <div className="h-1 w-2/3 mx-auto mt-0.5 rounded" style={{ background: accent, opacity: 0.25 }} />
        </div>
      );
    }

    if (visual_type === 'infographic') {
      // Differentiate the big infographic subtypes
      if (/flow|process|step/i.test(nameLower + ' ' + layoutLower)) {
        // Vertical flowchart with 4 connected steps
        return (
          <div className="h-full w-full p-1 flex flex-col" style={{ background: bg }}>
            <div className="h-1.5 w-1/2 rounded mb-1" style={{ background: accent }} />
            {[0,1,2,3].map(i => (
              <div key={i} className="flex items-center gap-1 mb-0.5">
                <div className="w-3 h-3 rounded-full flex-shrink-0 text-[5px] flex items-center justify-center font-bold" style={{ background: accent, color: '#fff' }}>{i + 1}</div>
                <div className="flex-1 h-1.5 rounded" style={{ background: accent + '33' }} />
              </div>
            ))}
          </div>
        );
      }
      if (/timeline|evolution|history/i.test(nameLower + ' ' + layoutLower)) {
        // Horizontal timeline
        return (
          <div className="h-full w-full p-1 flex flex-col" style={{ background: bg }}>
            <div className="h-1.5 w-1/2 rounded mb-1" style={{ background: accent }} />
            <div className="flex-1 flex items-center">
              <div className="h-px flex-1" style={{ background: accent + '66' }} />
              {[0,1,2,3,4].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full mx-0.5" style={{ background: accent }} />
              ))}
              <div className="h-px flex-1" style={{ background: accent + '66' }} />
            </div>
            <div className="flex justify-between text-[4px] opacity-60 mt-0.5 px-0.5">
              <div>22</div><div>23</div><div>24</div><div>25</div><div>26</div>
            </div>
          </div>
        );
      }
      if (/matrix|comparison|table|grid/i.test(nameLower + ' ' + layoutLower)) {
        // Small feature matrix
        return (
          <div className="h-full w-full p-1 flex flex-col" style={{ background: bg }}>
            <div className="h-1.5 w-1/2 rounded mb-1" style={{ background: accent }} />
            <div className="grid grid-cols-4 gap-px flex-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-white/70 border border-black/10 text-[4px] flex items-center justify-center" style={{ color: i % 3 === 0 ? '#16a34a' : '#64748b' }}>
                  {i % 3 === 0 ? '✓' : '—'}
                </div>
              ))}
            </div>
          </div>
        );
      }
      // Generic infographic fallback (still better than before)
      return (
        <div className="h-full w-full p-1 flex flex-col justify-end gap-0.5" style={{ background: bg }}>
          {[92, 71, 48, 27, 14].map((w, i) => (
            <div key={i} className="h-1.5 rounded-sm" style={{ width: `${w}%`, background: accent }} />
          ))}
        </div>
      );
    }

    // === Carousels — differentiate roles visually ===
    if (visual_type.includes('carousel')) {
      if (visual_type === 'carousel-cover' || /cover|hook|question/i.test(nameLower)) {
        const isPersonal = /personal|story|journey|hand-drawn|zine|silhouette/i.test(nameLower + ' ' + (template.thumbnail_visual || ''));

        if (isPersonal) {
          // Warm, hand-drawn personal story cover
          return (
            <div className="h-full w-full p-1 flex flex-col" style={{ background: '#f5e8d3', color: '#3f2a1f' }}>
              {/* soft silhouette shape */}
              <div className="flex-1 flex items-center justify-center">
                <div className="w-6 h-7 rounded-full" style={{ background: '#8b5e3c', opacity: 0.35 }} />
              </div>
              <div className="text-center pb-0.5">
                <div className="text-[5.5px] font-medium leading-none">From X to Y</div>
                <div className="text-[3.5px] opacity-70 mt-0.5">The 3 traps I learned</div>
              </div>
            </div>
          );
        }

        // Default bold hook cover
        return (
          <div className="h-full w-full p-1 flex flex-col" style={{ background: bg, color: textColor }}>
            <div className="flex-1 flex items-center justify-center px-1 text-center">
              <div className="text-[7px] font-extrabold tracking-[-0.2px] leading-none" style={{ color: accent }}>
                Big hook<br />question?
              </div>
            </div>
            <div className="h-1.5 w-3/4 mx-auto rounded mb-0.5" style={{ background: accent, opacity: 0.25 }} />
            <div className="text-[4.5px] text-center opacity-60">Swipe →</div>
          </div>
        );
      }
      if (visual_type === 'carousel-interior' || /interior|standard/i.test(nameLower)) {
        // Clearly a content slide: tag + headline + body lines + small visual/code block at bottom
        return (
          <div className="h-full w-full p-1 flex flex-col" style={{ background: bg, color: textColor }}>
            <div className="text-[4.5px] mb-0.5 font-medium opacity-70">01 / 04 • Bad habit 1</div>
            <div className="h-1 w-4/5 rounded mb-0.5" style={{ background: accent }} />
            <div className="flex-1 space-y-0.5">
              <div className="h-0.5 bg-black/10 rounded w-full" />
              <div className="h-0.5 bg-black/10 rounded w-5/6" />
              <div className="h-0.5 bg-black/10 rounded w-4/5" />
            </div>
            {/* small code / visual snippet at bottom */}
            <div className="h-3 mt-0.5 rounded-sm border" style={{ borderColor: accent + '40', background: accent + '10' }}>
              <div className="text-[3px] px-0.5 pt-0.5 opacity-60 font-mono">const x = ...</div>
            </div>
            <div className="text-[3.5px] text-center mt-0.5 opacity-50">Swipe for the next →</div>
          </div>
        );
      }
      if (visual_type === 'carousel-closing' || /closing|cta|final/i.test(nameLower)) {
        // Clearly action-oriented: three big round CTAs + handle
        return (
          <div className="h-full w-full p-1 flex flex-col" style={{ background: bg, color: textColor }}>
            <div className="h-1 w-3/4 rounded mb-1" style={{ background: accent }} />
            <div className="flex-1 flex items-center justify-around pb-0.5">
              {['Follow', 'Save', 'Share'].map((lab, i) => (
                <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center text-[3.5px] font-medium border" style={{ background: accent + '22', borderColor: accent + '55', color: accent }}>
                  {lab}
                </div>
              ))}
            </div>
            <div className="text-[3.5px] text-center opacity-60">@yourhandle</div>
          </div>
        );
      }
      // Generic carousel
      return (
        <div className="h-full w-full p-1 flex flex-col" style={{ background: bg, color: textColor }}>
          <div className="flex-1 flex items-center justify-center text-[8px] font-bold tracking-tighter text-center px-1" style={{ color: accent }}>
            {name.length > 22 ? name.slice(0, 20) + '…' : name}
          </div>
          <div className="h-2 w-4/5 mx-auto rounded" style={{ background: accent, opacity: 0.3 }} />
        </div>
      );
    }

    // === Blog / Article heroes — make these actually distinct and representative ===
    if (visual_type === 'blog-hero' || visual_type === 'mockup') {
      const isDesk = /engineer|desk|workspace|laptop/i.test(nameLower + ' ' + (template.thumbnail_visual || ''));
      const isTicket = /ticket|pickup|metaphor|abstract.*concept|promise/i.test(nameLower + ' ' + (template.thumbnail_visual || ''));
      const isListicle = /listicle|giant number|big number|10 |count/i.test(nameLower + ' ' + (template.thumbnail_visual || ''));
      const isMagazine = /magazine|wired|masthead|barcode|serif/i.test(nameLower + ' ' + (template.thumbnail_visual || ''));
      const isPolaroid = /polaroid|collage|washi|scattered|retro/i.test(nameLower + ' ' + (template.thumbnail_visual || ''));
      const isAppMock = /mockup|app interface|phone|device/i.test(nameLower + ' ' + (template.thumbnail_visual || ''));

      // Engineer's desk — warm top-down workspace vibe
      if (isDesk) {
        return (
          <div className="h-full w-full p-0.5" style={{ background: '#f4e9d8' }}>
            <div className="h-full w-full rounded-sm overflow-hidden relative" style={{ background: '#e8d9c2' }}>
              {/* desk surface */}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(145deg, #d4b78f 0%, #b38b5e 100%)' }} />
              {/* laptop */}
              <div className="absolute left-[12%] top-[18%] w-[38%] h-[48%] rounded-sm" style={{ background: '#222', boxShadow: '0 2px 0 #111' }}>
                <div className="absolute inset-[8%] rounded-sm" style={{ background: '#0a2540' }} />
                {/* screen glow / code lines */}
                <div className="absolute left-[12%] top-[18%] w-[30%] h-0.5 bg-[#3b82f6]/60" />
                <div className="absolute left-[12%] top-[28%] w-[22%] h-0.5 bg-[#3b82f6]/40" />
              </div>
              {/* coffee cup */}
              <div className="absolute right-[18%] top-[22%] w-[9%] h-[14%] rounded-full" style={{ background: '#3f2a1f', border: '1px solid #2a1c14' }} />
              {/* plant */}
              <div className="absolute right-[12%] bottom-[18%] w-[7%] h-[10%] rounded-full" style={{ background: '#166534' }} />
              {/* keyboard hint */}
              <div className="absolute left-[18%] bottom-[14%] w-[22%] h-[5%] rounded" style={{ background: '#3a3a3a' }} />
            </div>
          </div>
        );
      }

      // Abstract metaphor — physical ticket on bokeh counter
      if (isTicket) {
        return (
          <div className="h-full w-full p-0.5" style={{ background: '#f5e8d3' }}>
            <div className="h-full w-full rounded-sm overflow-hidden relative" style={{ background: '#e8d4b8' }}>
              {/* soft counter bokeh suggestion */}
              <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.6) 0%, transparent 60%)' }} />
              {/* the ticket itself */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[52%] h-[38%] rounded-sm shadow" style={{ background: '#f8f1e3', border: '1px solid #c9b18a' }}>
                <div className="text-center pt-1">
                  <div className="text-[7px] font-mono tracking-[1px]" style={{ color: '#3f2a1f' }}>#042</div>
                  <div className="h-px w-3/4 mx-auto my-0.5" style={{ background: '#c9b18a' }} />
                  <div className="text-[4.5px] leading-none" style={{ color: '#3f2a1f' }}>Your number<br />is ready</div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Listicle — giant number treatment
      if (isListicle) {
        return (
          <div className="h-full w-full p-0.5" style={{ background: '#2b1f3d' }}>
            <div className="h-full w-full rounded-sm overflow-hidden flex">
              <div className="flex-1 p-1 flex flex-col justify-center">
                <div className="h-1 w-3/4 bg-white/30 rounded mb-0.5" />
                <div className="h-0.5 w-1/2 bg-white/20 rounded" />
              </div>
              <div className="w-[42%] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c026ff 0%, #f472b6 100%)' }}>
                <div className="text-[22px] font-black tracking-tighter text-white drop-shadow" style={{ opacity: 0.95 }}>10</div>
              </div>
            </div>
          </div>
        );
      }

      // Magazine cover style
      if (isMagazine) {
        return (
          <div className="h-full w-full p-0.5" style={{ background: '#111' }}>
            <div className="h-full w-full rounded-sm overflow-hidden relative" style={{ background: '#111' }}>
              <div className="absolute top-0 left-0 right-0 h-[14%] flex items-center justify-center" style={{ background: '#fff', color: '#111' }}>
                <div className="text-[5px] font-bold tracking-[1.5px]">TECH MAG</div>
              </div>
              <div className="absolute top-[22%] left-1/2 -translate-x-1/2 text-center px-1">
                <div className="text-[6px] leading-tight font-serif text-white">The next decade of<br />AI rewriting work</div>
              </div>
              {/* barcode */}
              <div className="absolute bottom-[8%] left-[8%] w-[18%] h-[7%] flex gap-px">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex-1" style={{ background: i % 2 === 0 ? '#fff' : 'transparent' }} />
                ))}
              </div>
              <div className="absolute bottom-[6%] right-[8%] text-[3.5px] text-white/70">MAY 2026</div>
            </div>
          </div>
        );
      }

      // Retro Polaroid collage
      if (isPolaroid) {
        return (
          <div className="h-full w-full p-0.5" style={{ background: '#d2b48c' }}>
            <div className="h-full w-full rounded-sm overflow-hidden relative" style={{ background: '#c9a77a' }}>
              {/* 3 angled polaroids */}
              {[ -12, 6, -4 ].map((rot, idx) => (
                <div
                  key={idx}
                  className="absolute bg-white shadow-sm"
                  style={{
                    width: '28%',
                    height: '32%',
                    left: 12 + idx * 18 + '%',
                    top: 18 + (idx % 2) * 8 + '%',
                    transform: `rotate(${rot}deg)`,
                    border: '1px solid #e5d9c2'
                  }}
                >
                  <div className="h-[68%] bg-[#e5d9c2]" />
                  <div className="h-[32%] text-[3px] flex items-end justify-center pb-0.5 text-[#3f2a1f]/70">label</div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // App / device mockup
      if (isAppMock) {
        return (
          <div className="h-full w-full p-0.5" style={{ background: '#e5e7eb' }}>
            <div className="h-full w-full rounded-sm overflow-hidden border border-black/10 bg-white flex items-center justify-center">
              <div className="w-[42%] h-[78%] rounded-xl border border-black/30 relative" style={{ background: '#f8fafc' }}>
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-black/20" />
                <div className="absolute top-[18%] left-[10%] right-[10%] h-1 bg-emerald-400/70 rounded" />
                <div className="absolute top-[28%] left-[10%] right-[10%] space-y-0.5">
                  {[0,1,2].map(i => <div key={i} className="h-0.5 bg-black/15 rounded" />)}
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Generic blog hero fallback (still better than the old one)
      return (
        <div className="h-full w-full p-0.5" style={{ background: '#e5e7eb' }}>
          <div className="h-full w-full rounded-sm overflow-hidden border border-black/10" style={{ background: bg }}>
            <div className="h-1/3 w-full" style={{ background: accent, opacity: 0.15 }} />
            <div className="p-1 space-y-0.5">
              <div className="h-1 w-3/4 bg-black/30 rounded" />
              <div className="h-1 w-1/2 bg-black/20 rounded" />
            </div>
          </div>
        </div>
      );
    }

    if (visual_type === 'before-after') {
      return (
        <div className="h-full w-full flex">
          <div className="flex-1" style={{ background: '#f3e8ff' }} />
          <div className="w-px bg-black/30" />
          <div className="flex-1" style={{ background: '#a7f3d0' }} />
        </div>
      );
    }

    if (visual_type === 'quote-card') {
      return (
        <div className="h-full w-full p-1.5 flex" style={{ background: '#f3f0e9' }}>
          <div className="w-1/3 rounded-full" style={{ background: '#6b7280', opacity: 0.3 }} />
          <div className="flex-1 pl-1 flex flex-col justify-center">
            <div className="h-1 w-full bg-black/40 mb-0.5" />
            <div className="h-1 w-5/6 bg-black/30" />
          </div>
        </div>
      );
    }

    if (visual_type === 'planner') {
      return (
        <div className="h-full w-full p-1 grid grid-cols-7 gap-0.5" style={{ background: '#f8f7f4' }}>
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="rounded-full border" style={{ borderColor: '#86efac' }} />
          ))}
        </div>
      );
    }

    if (visual_type === 'recipe' || visual_type === 'itinerary') {
      return (
        <div className="h-full w-full p-1" style={{ background: '#f8f7f4' }}>
          <div className="h-2/5 rounded mb-1" style={{ background: accent, opacity: 0.25 }} />
          <div className="space-y-0.5">
            <div className="h-1 w-full bg-black/20 rounded" />
            <div className="h-1 w-4/5 bg-black/15 rounded" />
          </div>
        </div>
      );
    }

    // Fallback generic nice card
    return (
      <div className="h-full w-full p-1.5" style={{ background: bg }}>
        <div className="h-2 w-2/3 rounded mb-1" style={{ background: accent }} />
        <div className="space-y-1">
          <div className="h-1 bg-black/10 rounded" />
          <div className="h-1 w-4/5 bg-black/10 rounded" />
        </div>
      </div>
    );
  };

  return (
    <div
      className={`thumbnail-container ${ratioClass} ${className}`}
      data-ratio={aspect_ratio}
      title={thumbnail_visual}
    >
      <div className={`thumbnail ${isSmall ? 'text-[5px]' : ''}`}>
        {renderMock()}
      </div>
    </div>
  );
};
