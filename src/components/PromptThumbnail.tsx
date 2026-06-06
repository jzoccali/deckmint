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
        return (
          <div className="h-full w-full p-1 flex flex-col" style={{ background: bg, color: textColor }}>
            <div className="text-[5px] mb-0.5 opacity-70">01 / 04</div>
            <div className="h-1.5 w-4/5 rounded mb-1" style={{ background: accent }} />
            <div className="flex-1 space-y-0.5">
              <div className="h-1 bg-black/10 rounded" />
              <div className="h-1 w-5/6 bg-black/10 rounded" />
              <div className="h-1 w-4/5 bg-black/10 rounded" />
            </div>
            <div className="h-1.5 w-1/2 mx-auto rounded mt-0.5" style={{ background: accent, opacity: 0.3 }} />
          </div>
        );
      }
      if (visual_type === 'carousel-closing' || /closing|cta|final/i.test(nameLower)) {
        return (
          <div className="h-full w-full p-1 flex flex-col" style={{ background: bg, color: textColor }}>
            <div className="h-1.5 w-3/4 rounded mb-1" style={{ background: accent }} />
            <div className="flex-1 flex items-end justify-around pb-1">
              {['F','S','Sh'].map((lab, i) => (
                <div key={i} className="w-4 h-4 rounded-full flex items-center justify-center text-[5px]" style={{ background: accent + '33', color: accent }}>
                  {lab}
                </div>
              ))}
            </div>
            <div className="text-[4.5px] text-center opacity-60">@you</div>
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

    if (visual_type === 'blog-hero' || visual_type === 'mockup') {
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
