import React, { useMemo } from 'react';
import { Toaster, toast } from 'sonner';
import { Copy, Plus, X, RotateCcw } from 'lucide-react';
import { Command } from 'cmdk';
import {
  usePromptStore,
  getEffectiveValues,
  generatePrompt,
  buildEditInstruction,
  buildStructuredPrompt,
  buildSeriesPack,
  renderStructuredPreviewToDataUrl,
} from './store/usePromptStore';
import { PromptThumbnail } from './components/PromptThumbnail';
import { LiveStructuredPreview } from './components/LiveStructuredPreview';
import { usePlatform } from './hooks/usePlatform';

// Simple local-first persistence for the most important CMS + series state.
// This gives you "come back tomorrow and your carousels + custom templates + deep edits are still there".
// We also persist generations (including the local PNG data URLs) so your produced assets survive refresh.
function usePersistedStore() {
  const { structuredEdits, customTemplates, series, seriesNotes, savedPacks, generations, ai, templateExampleOverrides, setStructuredEdit, setSeries, setSeriesNote } = usePromptStore();

  // Load once on mount
  React.useEffect(() => {
    try {
      const savedStructured = localStorage.getItem('deckmint:structuredEdits');
      if (savedStructured) {
        const parsed = JSON.parse(savedStructured);
        Object.entries(parsed).forEach(([key, edits]) => {
          const e = edits as any;
          // Support both base template numeric ids and custom:xxx keys (the CMS structured layer)
          if (key.startsWith('custom:')) {
            // For custom keys we write directly into the store's structuredEdits via a small bypass
            // (setStructuredEdit expects a number; we reach into the store for full fidelity)
            const store = usePromptStore.getState() as any;
            store.structuredEdits = { ...(store.structuredEdits || {}), [key]: e };
          } else {
            const id = Number(key);
            if (!Number.isNaN(id)) {
              Object.entries(e).forEach(([k, v]) => setStructuredEdit(id, k as any, v as string));
            }
          }
        });
      }
      const savedCustom = localStorage.getItem('deckmint:customTemplates');
      if (savedCustom) {
        // Custom templates are saved via the store action; full re-hydration can be added to store init later.
      }
      const savedSeries = localStorage.getItem('deckmint:series');
      if (savedSeries) {
        const parsed = JSON.parse(savedSeries);
        if (Array.isArray(parsed)) setSeries(parsed as any);
      }
      const savedNotes = localStorage.getItem('deckmint:seriesNotes');
      if (savedNotes) {
        const parsed = JSON.parse(savedNotes);
        Object.entries(parsed).forEach(([k, v]) => setSeriesNote(k as any, v as string));
      }
      const savedPacksRaw = localStorage.getItem('deckmint:savedPacks');
      if (savedPacksRaw) {
        const parsed = JSON.parse(savedPacksRaw);
        if (Array.isArray(parsed)) {
          const store = usePromptStore.getState() as any;
          store.savedPacks = parsed;
        }
      }
      const savedGens = localStorage.getItem('deckmint:generations');
      if (savedGens) {
        const parsed = JSON.parse(savedGens);
        if (Array.isArray(parsed)) {
          const store = usePromptStore.getState() as any;
          store.generations = parsed;
          if (parsed[0]) store.lastGenerated = parsed[0];
        }
      }

      // Load optional AI provider config (keys stay on the user's machine)
      const savedAi = localStorage.getItem('deckmint:ai');
      if (savedAi) {
        try {
          const parsed = JSON.parse(savedAi);
          if (parsed && typeof parsed === 'object') {
            (usePromptStore.getState() as any).setAiConfig?.(parsed);
          }
        } catch {}
      }

      // Load promoted example images for library cards (real high-end graphics the user chose)
      const savedOverrides = localStorage.getItem('deckmint:templateExampleOverrides');
      if (savedOverrides) {
        try {
          const parsed = JSON.parse(savedOverrides);
          if (parsed && typeof parsed === 'object') {
            (usePromptStore.getState() as any).templateExampleOverrides = parsed;
          }
        } catch {}
      }
    } catch {}
  }, []);

  // Persist on change (lightweight)
  React.useEffect(() => {
    try {
      localStorage.setItem('deckmint:structuredEdits', JSON.stringify(structuredEdits));
      localStorage.setItem('deckmint:customTemplates', JSON.stringify(customTemplates));
      localStorage.setItem('deckmint:series', JSON.stringify(series));
      localStorage.setItem('deckmint:seriesNotes', JSON.stringify(seriesNotes));
      localStorage.setItem('deckmint:savedPacks', JSON.stringify(savedPacks));
      localStorage.setItem('deckmint:generations', JSON.stringify(generations));
      localStorage.setItem('deckmint:ai', JSON.stringify(ai));
      localStorage.setItem('deckmint:templateExampleOverrides', JSON.stringify(templateExampleOverrides));
    } catch {}
  }, [structuredEdits, customTemplates, series, seriesNotes, savedPacks, generations, ai, templateExampleOverrides]);

  return null;
}

const MODES = [
  { id: 'library', label: 'Library' },
  { id: 'series', label: 'Build Series' },
  { id: 'edit-existing', label: 'Edit Existing Image' },
] as const;

export default function DeckMintApp() {
  const platform = usePlatform();
  usePersistedStore();

  const {
    templates,
    selectedId,
    variableValues,
    mode,
    series,
    preserveText,
    changeText,
    structuredEdits,
    selectTemplate,
    setVariableValue,
    resetVariables,
    setMode,
    addToSeries,
    removeFromSeries,
    setSeries,
    clearSeries,
    setPreserveText,
    setChangeText,
    setStructuredEdit,
    resetStructuredEdit,
    lastGenerated,
    generations,
    recordGeneration,
    customTemplates,
    saveAsCustomTemplate,
    deleteCustomTemplate,
    renameCustomTemplate,
    duplicateCustomTemplate,
    applyCurrentStructuredToSeries,
    savedPacks,
    saveCurrentSeriesAsPack,
    loadSavedPack,
    deleteSavedPack,
    seriesNotes,
    setSeriesNote,
    lockStyleFromFirst,
    ai,
    setAiConfig,
    clearAiKey,
    generateRealImage,
    exportWorkspace,
    importWorkspace,
    templateExampleOverrides,
    setTemplateExampleOverride,
    clearTemplateExampleOverride,
  } = usePromptStore();

  const selected = useMemo(
    () => templates.find((t) => t.id === selectedId) || templates[0],
    [templates, selectedId]
  );

  const currentOverrides = variableValues[selected.id] || {};
  const effectiveValues = getEffectiveValues(selected, currentOverrides);
  const generatedPrompt = generatePrompt(selected, effectiveValues);

  const editInstruction = buildEditInstruction(preserveText, changeText);

  // Simple filtering
  const [search, setSearch] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null);

  // Inspector tab (real now) — do NOT auto-reset on selection so users can stay in Structured while browsing
  const [inspectorTab, setInspectorTab] = React.useState<'variables' | 'structured' | 'raw'>('variables');

  // PWA install prompt (makes "install as a real desktop app" discoverable on Windows, Chrome, Edge, etc.)
  const [deferredInstallPrompt, setDeferredInstallPrompt] = React.useState<any>(null);
  const [canInstallPWA, setCanInstallPWA] = React.useState(false);

  // Capture the browser's install prompt so we can offer a first-class "Install DeckMint" button
  // This works on Chromium-based browsers (Chrome, Edge, Arc, Brave, etc.) on Windows, macOS, Linux, ChromeOS.
  React.useEffect(() => {
    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      setDeferredInstallPrompt(e);
      setCanInstallPWA(true);
    };
    const installedHandler = () => {
      setCanInstallPWA(false);
      setDeferredInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  // Structured edits come from the store (first-class, persist across selections)
  const activeCustomId = (usePromptStore.getState() as any).selectedCustomId as string | null;
  const currentStructured = activeCustomId 
    ? (structuredEdits[`custom:${activeCustomId}` as any] || {
        subject: '', useCase: '', layout: '', color: '', typography: '', style: '', onImageText: ''
      })
    : (structuredEdits[selectedId ?? -1] || {
        subject: selected.name,
        useCase: selected.use_case,
        layout: selected.layout,
        color: selected.color,
        typography: selected.typography,
        style: selected.style,
        onImageText: selected.on_image_text_structure.join('\n'),
      });

  // Live assembled prompt from the 6-part structured editor (the powerful CMS output)
  const assembledStructuredPrompt = useMemo(() => {
    const acId = (usePromptStore.getState() as any).selectedCustomId as string | null;
    if (acId) {
      const c = customTemplates.find((ct) => ct.id === acId);
      if (c) {
        // Build using the custom's structured directly
        return buildStructuredPrompt(selected, c.structured as any);
      }
    }
    return buildStructuredPrompt(selected, structuredEdits[selectedId ?? -1]);
  }, [selected, structuredEdits, selectedId, customTemplates]);

  // Native drag state for series reordering (reliable, no bundler issues) — now supports custom string ids too
  const [draggedSeriesId, setDraggedSeriesId] = React.useState<number | string | null>(null);

  // Command palette (power-user desktop tool — ⌘K / Ctrl+K everywhere)
  const [commandOpen, setCommandOpen] = React.useState(false);

  // Smart visual recommender — describe what you're trying to make in plain language
  // and we surface the best matching templates.
  const [vizQuery, setVizQuery] = React.useState('');

  // Global hotkey for the palette + escape handling
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const isK = e.key.toLowerCase() === 'k';
      if ((e.metaKey || e.ctrlKey) && isK) {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
      if (e.key === 'Escape' && commandOpen) {
        setCommandOpen(false);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [commandOpen]);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      const matchesSearch =
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.summary.toLowerCase().includes(search.toLowerCase()) ||
        t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
      const matchesCat = !activeCategory || t.category === activeCategory;
      return matchesSearch && matchesCat;
    });
  }, [templates, search, activeCategory]);

  const categories = Array.from(new Set(templates.map((t) => t.category)));

  // Custom templates as first-class CMS citizens
  const isCustomFilter = activeCategory === 'Custom';
  const displayedCustoms = isCustomFilter ? customTemplates : [];

  function handleCopyPrompt(text: string, label = 'Prompt') {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied`, { description: 'Ready to paste into your image model' });
    });
  }

  function handleSelect(id: number) {
    selectTemplate(id);
    // Clear any active custom when selecting a base template
    (usePromptStore.getState() as any).selectedCustomId = null;
    // If in series mode, also add it
    if (mode === 'series') {
      addToSeries(id);
    }
  }

  function handleSelectCustom(id: string) {
    // Load the custom into the structured editor and focus the CMS view
    (usePromptStore.getState() as any).selectCustomTemplate?.(id);
    setInspectorTab('structured');
  }

  // === Series consistency helpers (for the upgraded builder) ===
  function getEffectiveStructuredForSeriesId(sid: number | string) {
    const idStr = String(sid);
    if (idStr.startsWith('custom-')) {
      const liveKey = `custom:${idStr}` as any;
      const live = structuredEdits[liveKey];
      if (live) return live;
      const c = customTemplates.find((ct) => ct.id === idStr);
      return c?.structured || { color: '', typography: '', style: '' };
    }
    return structuredEdits[sid as number] || { color: '', typography: '', style: '' };
  }

  function getSeriesReferenceStyle() {
    if (series.length === 0) return { color: '', typography: '', style: '' };
    return getEffectiveStructuredForSeriesId(series[0]);
  }

  function getDivergence(sid: number | string) {
    if (series[0] != null && String(sid) === String(series[0])) return null; // first/cover is the reference
    const ref = getSeriesReferenceStyle();
    const mine = getEffectiveStructuredForSeriesId(sid);
    const diffs: string[] = [];
    if (ref.color && mine.color && ref.color !== mine.color) diffs.push('color');
    if (ref.typography && mine.typography && ref.typography !== mine.typography) diffs.push('typography');
    if (ref.style && mine.style && ref.style !== mine.style) diffs.push('style');
    return diffs.length ? diffs : null;
  }

  // === Smart visual recommender logic ===
  // Scores templates against a natural-language description and returns the top 3 matches.
  function getRecommendedTemplates(query: string) {
    const q = query.toLowerCase().trim();
    if (!q) return [] as Array<{ template: any; score: number; reason: string }>;

    const keywords = {
      data: /data|chart|stat|statistic|percent|percentage|ranking|rank|bar|graph|viz|visualization/i,
      people: /population|demographic|survey|audience|group|community|ethnic|diversity/i,
      geography: /map|region|state|country|geographic|choropleth|by location/i,
      infographic: /infographic|report|slide|deck|one pager|one-pager/i,
      knowledge: /explain|how|why|what|tip|guide|tutorial|learn|breakdown/i,
    };

    const scores: Array<{ template: any; score: number; reason: string }> = [];

    templates.forEach((t) => {
      let score = 0;
      let reasons: string[] = [];

      const haystack = `${t.name} ${t.summary} ${t.category} ${t.use_case} ${t.layout} ${t.tags.join(' ')}`.toLowerCase();

      if (keywords.data.test(q) && (keywords.data.test(haystack) || t.visual_type.includes('data') || t.visual_type.includes('infographic') || t.category.includes('Infographic'))) {
        score += 3; reasons.push('data/chart style');
      }
      if (keywords.people.test(q) && (keywords.people.test(haystack) || /stat|survey|ranking/i.test(haystack))) {
        score += 3; reasons.push('stats/demographic fit');
      }
      if (keywords.geography.test(q) && /infographic|data|map/i.test(haystack)) {
        score += 3; reasons.push('geographic/regional data');
      }
      if (keywords.infographic.test(q) && t.category.includes('Infographic')) {
        score += 2; reasons.push('infographic family');
      }
      if (keywords.knowledge.test(q) && /knowledge|explainer|tip|how.to/i.test(haystack)) {
        score += 3; reasons.push('explainer/knowledge card');
      }

      // Boost strongest data templates when the query is clearly data-oriented
      if (/statistical infographic|data fact card/i.test(t.name) && keywords.data.test(q)) {
        score += 4;
        reasons.push('strong match for data rankings');
      }

      if (score > 0) {
        scores.push({
          template: t,
          score,
          reason: reasons.slice(0, 2).join(' + '),
        });
      }
    });

    return scores.sort((a, b) => b.score - a.score).slice(0, 3);
  }

  const recommendations = React.useMemo(() => getRecommendedTemplates(vizQuery), [vizQuery]);

  // Load a recommended template and switch to the structured editor.
  function useRecommended(rec: { template: any; score: number; reason: string }) {
    const t = rec.template;
    selectTemplate(t.id);
    (usePromptStore.getState() as any).selectedCustomId = null;
    setInspectorTab('structured');
    setVizQuery('');
    toast.success(`Loaded ${t.name}`, { description: rec.reason });
  }

  // One click → 4-slide data story carousel using the currently active template and structured values.
  function buildDataStoryFromCurrent() {
    const activeCustomId = (usePromptStore.getState() as any).selectedCustomId as string | null;
    const baseId = selectedId || 6;

    clearSeries();
    addToSeries(baseId);                    // 0: hook cover
    addToSeries(activeCustomId || baseId);  // 1: hero viz
    addToSeries(activeCustomId || baseId);  // 2: insights / supporting
    addToSeries(baseId);                    // 3: CTA / closer

    setMode('series');

    const ids = usePromptStore.getState().series;

    // Derive a strong, production-ready 4-slide story from the current template + structured values.
    // Fully generic (no topic lock-in). Rich enough that "build story" feels like a real deliverable.
    const isDataTemplate = /statistical|data fact|infographic|chart|ranking/i.test((selected?.name || '') + ' ' + (currentStructured.layout || ''));

    const slides = [
      {
        subject: currentStructured.subject || 'The key insight',
        useCase: 'Carousel cover slide',
        layout: 'Massive centered headline, generous top whitespace, tiny swipe hint at bottom. Maximum stop-power and scannability at small sizes.',
        color: currentStructured.color || 'High-contrast dark or light background, bright accent for the headline',
        typography: currentStructured.typography || 'Extra-bold condensed or display sans, enormous scale on the headline',
        style: 'Bold, confident, poster-like. Text is the hero. Minimal supporting elements.',
        onImageText: (currentStructured.subject || 'The one thing that matters') + '\nSwipe to see why →',
      },
      {
        subject: currentStructured.subject || 'Main visualization',
        useCase: 'Hero slide — the money shot',
        layout: currentStructured.layout || (isDataTemplate ? 'Clean ranked visualization with strictly proportional elements and large legible labels' : 'Strong visual treatment with clear hierarchy and all text fully contained'),
        color: currentStructured.color || (isDataTemplate ? 'Clean background, strong but calm accent for data elements' : 'Match cover system for cohesion'),
        typography: currentStructured.typography || (isDataTemplate ? 'Bold title, oversized numbers, clear supporting labels' : 'Same type system as cover'),
        style: currentStructured.style || (isDataTemplate ? 'Premium editorial data-viz. Precise, authoritative, instantly readable at a glance.' : 'Consistent with cover, calm and explanatory'),
        onImageText: currentStructured.onImageText || (isDataTemplate ? 'Metric A — 47%\nMetric B — 29%\nMetric C — 15%\nSource: your data' : 'Supporting point one\nSupporting point two\nSupporting point three'),
      },
      {
        subject: isDataTemplate ? 'What the numbers actually mean' : 'Key supporting points',
        useCase: 'Insight / proof slide',
        layout: isDataTemplate
          ? '2–3 crisp callout cards. One big stat or comparison per card plus one short plain-English explanation.'
          : 'Grid or list of 3 supporting facts, quotes, or steps. Generous breathing room.',
        color: currentStructured.color || 'Slightly softer or warmer background than the hero for visual breathing room while staying in the same system',
        typography: currentStructured.typography || 'Bold for the big numbers or headlines, slightly lighter weight for explanations',
        style: currentStructured.style || 'Editorial, trustworthy, easy to scan while swiping',
        onImageText: isDataTemplate
          ? 'Biggest segment\n47% of total — the clear leader\n\nSecond place cluster\n29% + 15% combined\n\nActionable gap\nTop 3 drive 91%'
          : 'Point one — the core idea\nPoint two — proof or detail\nPoint three — implication or next step',
      },
      {
        subject: 'Next step',
        useCase: 'Carousel closing / CTA slide',
        layout: 'Clean centered summary line + three crisp, large-target action rows (Follow / Save / Share). Bookend the cover visually.',
        color: currentStructured.color || 'Match cover color and accent for strong bookend consistency',
        typography: currentStructured.typography || 'Strong but slightly smaller than the cover headline; very clear button labels',
        style: currentStructured.style || 'Confident, brandable, action-oriented. Friendly but not salesy.',
        onImageText: 'Found this useful?\nFollow for more\nSave this\nShare with your team',
      },
    ];

    ids.forEach((sid, idx) => {
      const struct = slides[idx] || slides[slides.length - 1];
      const key: any = typeof sid === 'string' ? `custom:${sid}` : sid;
      Object.entries(struct).forEach(([k, v]) => setStructuredEdit(key, k as any, v as string));
    });

    setTimeout(() => {
      (usePromptStore.getState() as any).lockStyleFromFirst?.();
    }, 30);

    toast.success('4-slide story ready', {
      description: 'Cover → Hero viz → Insights → CTA. Edit each slide, then export PNGs or the full Markdown pack.',
    });
  }

  // One-click "give me the actual files" action.
  // Renders real PNGs for every slide using the live structured previews + canvas exporter,
  // then downloads a rich self-contained Markdown sidecar with the exact prompts, notes, and image references.
  // This turns the series builder into a real production asset pipeline.
  async function exportSeriesAsProductionAssets() {
    if (series.length === 0) {
      toast.info('Add some slides to your series first');
      return;
    }

    const pack = buildSeriesPack(series, templates, variableValues, structuredEdits, customTemplates, seriesNotes);
    const dateSlug = new Date().toISOString().slice(0, 10);
    const baseName = `deckmint-series-${dateSlug}`;

    // Export one PNG per slide (staggered to be friendly to the browser)
    for (let i = 0; i < series.length; i++) {
      const sid = series[i];
      const item = pack[i];

      // Resolve the template + current structured values for high-fidelity rendering
      let tmpl: any;
      let struct: any;
      const idStr = String(sid);

      if (idStr.startsWith('custom-')) {
        const custom = customTemplates.find((c) => c.id === idStr);
        tmpl = custom?.baseTemplateId ? templates.find((t) => t.id === custom.baseTemplateId) : templates[0];
        const liveKey = `custom:${idStr}` as any;
        struct = structuredEdits[liveKey] || custom?.structured || {};
      } else {
        tmpl = templates.find((t) => t.id === (sid as number)) || templates[0];
        struct = structuredEdits[sid as number] || {};
      }

      try {
        const dataUrl = await renderStructuredPreviewToDataUrl(struct as any, tmpl, 1280);
        const safe = (item.name || `slide-${i + 1}`)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 60);
        const filename = `${String(i + 1).padStart(2, '0')}-${safe}.png`;

        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (err) {
        // Fall back gracefully — still give the user the prompts
        console.warn('Preview render failed for slide', i + 1, err);
      }

      // Tiny stagger prevents most browsers from blocking the downloads
      await new Promise((r) => setTimeout(r, 90));
    }

    // Build and download the companion Markdown pack (prompts + notes + image refs)
    const md: string[] = [];
    md.push(`# DeckMint Series — ${dateSlug}`);
    md.push(`${series.length} slides • order matters • structured prompts included`);
    md.push('');
    md.push('Images are named to match the order below. Use the prompts exactly as shown for best results with image models.');
    md.push('');
    md.push('---');
    md.push('');

    pack.forEach((item: any, idx: number) => {
      const num = String(idx + 1).padStart(2, '0');
      const safe = (item.name || `slide-${idx + 1}`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
      const img = `${num}-${safe}.png`;

      md.push(`## ${num}. ${item.name}`);
      if (item.note) md.push(`**Production note:** ${item.note}`);
      md.push('');
      md.push(`![${item.name}](${img})`);
      md.push('');
      md.push('**Exact prompt to paste:**');
      md.push('```');
      md.push(item.prompt);
      md.push('```');
      md.push('');
      md.push('---');
      md.push('');
    });

    const blob = new Blob([md.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Production assets exported', {
      description: `${series.length} PNGs + ${baseName}.md (with prompts + notes). Drop straight into Figma, Keynote, or your deck.`,
    });
  }

  // Helper: produce a rich, realistic preview structured object for a template.
  // This is how we "use the app to build examples of what each one would look like".
  // Every entry below is a carefully curated "perfect modern 2026 example" — the exact
  // on-image text, layout language, color, typography and style a great output from that
  // prompt should have. These power the LiveStructuredPreview in both the library grid
  // and the Structured inspector so the app itself demonstrates modern, production-grade
  // results for every template.
  function getExampleStructuredForTemplate(t: any) {
    const nameLower = (t.name || '').toLowerCase();
    const isData = /statistical|data fact|infographic/i.test(t.name) || t.visual_type.includes('data') || t.category.includes('Infographic');
    const isKnowledge = t.visual_type === 'knowledge-card' || t.category.includes('Knowledge');
    const isCarousel = t.visual_type && t.visual_type.includes('carousel');
    const isTimeline = /timeline/i.test(t.name);
    const isFlow = /flowchart/i.test(t.name);
    const isMatrix = /matrix|comparison/i.test(t.name);
    const isCheat = t.visual_type === 'cheatsheet' || /cheat|five-minute/i.test(t.name || '');
    const isBlogHero = t.visual_type === 'blog-hero' || t.visual_type === 'mockup';
    const isQuote = t.visual_type === 'quote-card';
    const isPlanner = t.visual_type === 'planner';
    const isRecipe = t.visual_type === 'recipe';
    const isItinerary = t.visual_type === 'itinerary';
    const isBeforeAfter = t.visual_type === 'before-after';

    if (isData) {
      const wantsDensity = /density|map|choropleth|geographic|by state|regional/i.test(t.layout || t.name);
      return {
        subject: t.name + ' example',
        useCase: t.use_case || 'Data insight / ranking',
        layout: wantsDensity
          ? 'Clean 5-tile density map layout. Each tile shows a short region label and large percentage. Tiles shaded by intensity. Title at top, source footer at bottom. High data density, instantly scannable. Premium editorial data-viz with modern depth.'
          : 'Bold title at top. 5 horizontal bars ranked longest to shortest. Exact category name on left of each bar, large bold percentage label on or right next to the bar. Strict visual proportionality. Source footer at bottom. Clean modern data visualization skin.',
        color: t.color || 'Clean light background, strong accent color for bars or tiles, dark highly legible text. Subtle soft shadows and depth for 2026 production feel.',
        typography: t.typography || 'Bold sans title and oversized percentages, clear readable category labels. Excellent hierarchy and tracking.',
        style: t.style || 'Premium editorial data-viz. Authoritative, precise, minimal decoration, high production value, modern and shareable.',
        onImageText: wantsDensity
          ? 'Metric Share by Region\nRegion A — 52%\nRegion B — 31%\nRegion C — 24%\nRegion D — 17%\nRegion E — 9%\nSource: Internal analytics (example)'
          : 'Top Categories 2026\nAlpha — 47%\nBeta — 29%\nGamma — 14%\nDelta — 7%\nEpsilon — 3%\nSource: 2026 Survey (example)',
      };
    }

    if (isKnowledge) {
      return {
        subject: t.name,
        useCase: t.use_case,
        layout: t.layout,
        color: t.color,
        typography: t.typography,
        style: t.style + ' — modern clean educational card with excellent depth and scannability.',
        onImageText: (t.on_image_text_structure || ['Headline', 'Point one', 'Point two', 'Point three', 'Source']).join('\n'),
      };
    }

    if (isCheat) {
      return {
        subject: t.name || '5 Steps. Max Impact.',
        useCase: t.use_case || 'High-conversion lead magnet / cheat sheet',
        layout: 'Vertical 5-step glowing numbered cards on dark cosmic background. Each step has a large vibrant neon number, icon, bold action line, subtle supporting detail. Strong colored outlines with glow. Premium 2025-2026 SaaS / creator marketing aesthetic.',
        color: 'Deep dark background (#0b0c12), vibrant neon accents cycling purple/blue/green/pink/amber, high-contrast white text, glowing effects. Cinematic depth and subtle grid.',
        typography: 'Bold black weight for titles and numbers, clean tight sans for steps. Strong hierarchy. Numbers feel luminous.',
        style: 'Cinematic dark mode lead magnet, neon cyber accents, soft glows and depth, subtle grid texture, high production value for Instagram/LinkedIn. Exactly the quality bar of top founder cheat sheets in 2026.',
        onImageText: 'Claim & verify your spot\nOptimize profile so you are impossible to ignore\nPost high-signal content consistently\nTurn customers into social proof\nMeasure what works and double down',
      };
    }

    if (isCarousel) {
      // Give each role very specific, modern, production-ready text so the preview looks like a real deliverable.
      let onImageText = (t.on_image_text_structure || ['Big question or tagline', 'Supporting detail', 'Swipe hint']).join('\n');
      if (/cover|hook|question|personal|story/i.test(nameLower)) {
        onImageText = 'The one mistake that cost me $47k\nA 4-slide story about learning the hard way\nSwipe to see what I would do differently →';
      } else if (/interior|standard/i.test(nameLower)) {
        onImageText = 'Mistake #2 — Chasing every shiny object\nI said yes to every opportunity for 18 months.\nHere is the simple filter I use now.\nIt saved my focus and my revenue.';
      } else if (/closing|cta|final/i.test(nameLower)) {
        onImageText = 'Which of these 3 mistakes are you making right now?\nComment the number.\nSave this for the next time you feel stuck.\n@yourhandle';
      }
      return {
        subject: t.name,
        useCase: t.use_case,
        layout: t.layout + ' — modern high-engagement carousel with strong visual rhythm and perfect text hierarchy.',
        color: t.color,
        typography: t.typography + ' — bold, confident, highly legible at small sizes.',
        style: t.style + ' — premium 2026 carousel aesthetic, cinematic or clean editorial, excellent contrast.',
        onImageText,
      };
    }

    if (isTimeline) {
      return {
        subject: t.name,
        useCase: t.use_case,
        layout: t.layout,
        color: t.color,
        typography: t.typography,
        style: t.style + ' — clean modern timeline with excellent spacing and premium editorial feel.',
        onImageText: 'Project Timeline\n2024 Q1 — Foundation\n2024 Q3 — Public beta\n2025 Q2 — 10k users\n2025 Q4 — Enterprise\n2026 Q2 — Next platform\nSource: company milestones (example)',
      };
    }

    if (isFlow) {
      return {
        subject: t.name,
        useCase: t.use_case,
        layout: t.layout,
        color: t.color,
        typography: t.typography,
        style: t.style + ' — clear, modern, scannable flow with strong visual hierarchy.',
        onImageText: 'User Flow — New Account\n1. Landing hero\n2. Email capture\n3. Onboarding quiz\n4. First value moment\n5. Activation\n6. Habit loop',
      };
    }

    if (isMatrix) {
      return {
        subject: t.name,
        useCase: t.use_case,
        layout: t.layout,
        color: t.color,
        typography: t.typography,
        style: t.style + ' — clean comparison matrix, modern product marketing quality.',
        onImageText: 'Feature Comparison 2026\nPerformance — Excellent / Good\nDX — Best in class / Improving\nEcosystem — Mature / Growing\nPricing — Transparent / Opaque\nSupport — 24/7 / Business hours',
      };
    }

    if (isBlogHero) {
      if (/engineer|desk|workspace|laptop/i.test(nameLower)) {
        return {
          subject: t.name,
          useCase: t.use_case,
          layout: 'Top-down realistic warm wooden desk, open laptop with visible code + browser, coffee, notebook, small plant, mechanical keyboard, natural window light, soft shadows. Subtle text on screen or sticky note. Photorealistic lifestyle tech photography, calm aspirational 2026 engineer aesthetic.',
          color: 'Warm wood tones, natural daylight, low saturation, soft realistic shadows, premium lived-in feel.',
          typography: 'Subtle, elegant — faint text on laptop screen or small handwritten sticky note. High craft, not loud.',
          style: 'Photorealistic lifestyle tech photography, IG-engineer aesthetic, aspirational but authentic, high production value for blog hero or OG image.',
          onImageText: 'Side Project\nlaunch v1.0',
        };
      }
      if (/ticket|pickup|metaphor|abstract.*concept|promise/i.test(nameLower)) {
        return {
          subject: t.name,
          useCase: t.use_case,
          layout: 'Centered realistic restaurant pickup ticket with number, resting on softly blurred warm drink-shop counter, beautiful bokeh, shallow depth of field, cinematic narrative lighting.',
          color: 'Warm orange ambient low-saturation light, creamy highlights, premium photoreal storytelling.',
          typography: 'Small elegant mono on the ticket itself, one refined supporting line underneath.',
          style: 'Photorealistic cinematic metaphor, high-end article visual, thoughtful and premium.',
          onImageText: '#042\nYour number is ready',
        };
      }
      if (/listicle|giant number|big number|10 |count/i.test(nameLower)) {
        return {
          subject: t.name,
          useCase: t.use_case,
          layout: 'Left 42% holds stacked bold headline + subtitle. Right side dominated by a huge layered gradient number that feels like a design hero. Strong modern editorial composition.',
          color: 'Deep purple gradient background, vibrant neon pink/magenta accent on the giant number and key text.',
          typography: 'Confident bold sans for headline, the massive number is the primary visual element with depth and glow.',
          style: 'Bold modern listicle / editorial hero, high visual impact, confident, extremely shareable 2026 style.',
          onImageText: '10 skills new frontend engineers\nshould learn in 2026\n10',
        };
      }
      if (/magazine|wired|masthead|barcode|serif/i.test(nameLower)) {
        return {
          subject: t.name,
          useCase: t.use_case,
          layout: 'Classic magazine cover: masthead at very top, large centered two-line main headline, issue + date at bottom, clean barcode element bottom-left. Sophisticated print homage with modern refinement.',
          color: 'Rich black dominant with one strong fluorescent accent (red or electric green) on masthead or a key line.',
          typography: 'Refined elegant serif for masthead and main headline, excellent editorial spacing and hierarchy. Small clean sans for date/barcode.',
          style: 'High-end magazine cover homage (Wired / The Atlantic level), print-production quality, timeless yet fresh, authoritative and premium.',
          onImageText: 'TECH MAG\nThe next decade of AI\nrewriting engineering work\nMay 2026\nDisplay until May 30',
        };
      }
      if (/polaroid|collage|washi|scattered|retro/i.test(nameLower)) {
        return {
          subject: t.name,
          useCase: t.use_case,
          layout: 'Soft warm background with 4–6 slightly rotated modern Polaroid-style photos scattered with intention. Small elegant handwritten-style labels on each photo. Contemporary take on retro collage, premium and personal.',
          color: 'Warm cream / kraft paper tones with soft shadows and subtle texture. Modern color grading.',
          typography: 'Small delicate handwritten or clean sans labels on the photos — personal and warm.',
          style: 'Premium modern personal retrospective collage. Not cheap retro clipart — high craft, thoughtful composition, shareable and emotional.',
          onImageText: 'Shipped\nQ1 2026\nLearned\nLaunched\nBurned out\nReset',
        };
      }
      if (/app mock|phone|device|interface/i.test(nameLower)) {
        return {
          subject: t.name,
          useCase: t.use_case,
          layout: 'Clean modern smartphone (or laptop) mockup centered on a soft neutral background with beautiful soft shadows and subtle depth. The screen shows a realistic, high-quality app interface with the exact on-image text placed naturally inside the UI.',
          color: 'Soft neutral background (light warm grey or off-white), device bezel in realistic dark or light, screen content crisp and modern.',
          typography: 'The UI inside the device uses clean modern app typography. Any overlaid text is elegant and minimal.',
          style: 'Premium product / app mockup photography style, 2026 high-production feel, perfect for landing pages, case studies, or OG images.',
          onImageText: 'DeckMint\nStructured prompts\nfor production graphics',
        };
      }
      // Generic strong blog hero
      return {
        subject: t.name,
        useCase: t.use_case,
        layout: t.layout + ' — premium modern hero composition with excellent light, depth, and typography.',
        color: t.color,
        typography: t.typography,
        style: t.style + ' — high production value, modern creator / editorial aesthetic, 2026 quality.',
        onImageText: (t.on_image_text_structure || ['Headline', 'Supporting detail']).join('\n'),
      };
    }

    if (isQuote) {
      if (/japanese|minimal|handwritten|slow/i.test(nameLower)) {
        return {
          subject: t.name,
          useCase: t.use_case,
          layout: 'Solid warm cream-yellow background. Short comforting line perfectly centered in soft handwritten / brush style. Tiny delicate attribution + date only in bottom-right corner. Extreme restraint and perfect placement.',
          color: 'Cream-yellow background, warm dark brown text. Meditative and human.',
          typography: 'Soft handwritten or brush for the main line. Tiny delicate sans for attribution.',
          style: 'Japanese minimal, indie zine / lit-zine, meditative, highly bookmarkable. The power is in the negative space and warmth.',
          onImageText: 'Slow is fast.\n2026.05 / @yourhandle',
        };
      }
      // Default elegant silhouette quote
      return {
        subject: t.name,
        useCase: t.use_case,
        layout: 'Left third: elegant low-saturation silhouette profile. Right two-thirds: the quote set beautifully in large bold serif. Small clean sans attribution with em-dash at bottom. Excellent breathing room and typography.',
        color: 'Warm sophisticated grey background, crisp white quote text, monochrome elegant silhouette.',
        typography: 'Bold beautiful serif for the quote (large but refined). Small clean sans for attribution.',
        style: 'Editorial quote card, timeless yet modern, sophisticated and contemplative. High craft suitable for high-quality social or slide use.',
        onImageText: 'Design is not just what it looks like and feels like.\nDesign is how it works.\n— Steve Jobs',
      };
    }

    if (isPlanner) {
      return {
        subject: t.name,
        useCase: t.use_case,
        layout: 'Clean modern weekly or habit tracker grid. Days or habits as elegant rows/columns. Checkboxes or progress dots that feel satisfying. Subtle accent color for the current day or key habit. Premium productivity aesthetic.',
        color: 'Soft off-white or light warm grey background, calm accent (sage, navy or soft teal), excellent contrast for text and checkboxes.',
        typography: 'Clean modern sans, very legible at small sizes. Day names and habit labels have nice weight.',
        style: 'Premium modern planner / Notion-style productivity graphic. Calm, usable, beautiful enough to screenshot and share.',
        onImageText: 'Week of June 8\nMon • Deep work 3h ✓\nTue • Ship v2\nWed • No meetings\nThu • Review + plan\nFri • Buffer & reset',
      };
    }

    if (isRecipe) {
      return {
        subject: t.name,
        useCase: t.use_case,
        layout: 'Appetizing recipe card. Hero photo suggestion at top or left, ingredients list, numbered steps on the right or below. Clean delicious photography feel with modern typography.',
        color: 'Warm inviting food photography palette — soft cream, warm wood, fresh green accents, rich but natural.',
        typography: 'Bold for recipe title, clean readable for ingredients and steps. Numbers feel prominent but elegant.',
        style: 'High-end modern recipe card / food magazine style. Appetizing, clean, shareable on social or save to Notion.',
        onImageText: 'One-Pan Miso Butter Pasta\n15 min • Serves 2\n200g pasta\n2 tbsp butter\n1 tbsp miso\nChili flakes + scallion\nBoil pasta. Brown butter.\nWhisk in miso. Toss. Finish with chili.',
      };
    }

    if (isItinerary) {
      return {
        subject: t.name,
        useCase: t.use_case,
        layout: 'Elegant one-day travel itinerary. Time blocks or locations as beautiful cards or a clean vertical flow. Small icons or markers. Feels luxurious and well-paced.',
        color: 'Calm travel palette — soft sand, deep teal, warm terracotta accents, excellent contrast.',
        typography: 'Refined sans or light serif for location names. Clear time labels. Generous but tight spacing.',
        style: 'Premium modern travel / lifestyle editorial. The kind of itinerary graphic a boutique trip planner or creator would post.',
        onImageText: 'Kyoto • One Perfect Day\n07:30 — Coffee at % Arabica\n08:30 — Fushimi Inari (early)\n11:00 — Arashiyama bamboo\n13:00 — Lunch at Kinsui\n15:30 — Tea ceremony\n18:00 — Gion walk + dinner',
      };
    }

    if (isBeforeAfter) {
      if (/ui|screen|redesign|login/i.test(nameLower)) {
        return {
          subject: t.name,
          useCase: t.use_case,
          layout: 'Two device screens side by side with a crisp vertical divider. Left labeled "Before" — intentionally ugly 90s-style interface (rainbow, bad fonts, cramped). Right labeled "After" — beautiful modern minimal redesign with excellent hierarchy and spacing. Dramatic, instantly obvious improvement.',
          color: 'Left: chaotic 90s colors. Right: clean white/light with refined typography and one calm accent.',
          typography: 'Left: deliberately bad mismatched fonts. Right: beautiful modern hierarchy, generous spacing.',
          style: 'Strong educational contrast, design tutorial quality, high production value. The "After" must look like something a top designer would ship in 2026.',
          onImageText: 'Before\nMember Login\n[ugly 90s form]\nAfter\nWelcome back\n[beautiful modern form]',
        };
      }
      // Copywriting before/after
      return {
        subject: t.name,
        useCase: t.use_case,
        layout: 'Top half "Before" with long-winded corporate paragraph on light grey. Strong clean horizontal divider. Bottom half "After" with a single tight, punchy, memorable line on fresh mint. Dramatic emotional contrast.',
        color: 'Before zone: light grey. After zone: fresh mint green with high energy.',
        typography: 'Before: dense readable. After: bold, confident, the line feels like a revelation.',
        style: 'Copywriting tutorial, immediate "aha" contrast. Premium modern messaging aesthetic.',
        onImageText: 'Before\nOur solution helps forward-thinking teams leverage synergistic paradigms to drive cross-functional value creation and stakeholder alignment in today\'s rapidly evolving marketplace.\nAfter\nShip faster. Waste less. Sleep better.',
      };
    }

    // Strong generic modern fallback for anything else
    return {
      subject: t.name,
      useCase: t.use_case,
      layout: (t.layout || '') + ' — premium modern 2026 composition with excellent hierarchy, breathing room and production value.',
      color: t.color,
      typography: t.typography,
      style: (t.style || '') + ' — high production value, modern creator / editorial / product graphic aesthetic, not dated.',
      onImageText: (t.on_image_text_structure || ['Main message', 'Supporting detail']).join('\n'),
    };
  }

  // Resolve series entries for display (base templates or custom CMS templates)
  const seriesTemplates = series.map((sid) => {
    const idStr = String(sid);
    if (idStr.startsWith('custom-')) {
      const c = customTemplates.find((ct) => ct.id === idStr);
      if (!c) return null;
      const base = c.baseTemplateId ? templates.find((t) => t.id === c.baseTemplateId) : null;
      // Return a display-friendly object that most thumbnail code can handle
      return {
        id: c.id as any,
        name: c.name,
        category: 'Custom',
        aspect_ratio: base?.aspect_ratio || '4:5',
        // For PromptThumbnail we will special-case below; provide minimal fields
        visual_type: base?.visual_type || 'graphic',
        thumbnail_visual: base?.thumbnail_visual || {},
      } as any;
    }
    return templates.find((t) => t.id === Number(sid)) || null;
  }).filter(Boolean) as any[];

  return (
    <div className="app-window">
      {/* Top bar / title area — adaptive per platform */}
      <div className={`top-bar ${platform === 'macos' ? 'mac' : ''}`}>
        <div className="title">DeckMint</div>

        <div className="mode-tabs">
          {MODES.map((m) => (
            <div
              key={m.id}
              className={`mode-tab ${mode === m.id ? 'active' : ''}`}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </div>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs text-[var(--text-muted)] pr-2">
          <button
            onClick={() => setCommandOpen(true)}
            className="hidden sm:flex items-center gap-1 text-[10px] px-1.5 py-px rounded border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            title="Open command palette (⌘K / Ctrl+K)"
          >
            <span className="font-mono">⌘</span>K
          </button>

          {/* PWA install affordance — "make this feel like a real desktop app on any box" */}
          {canInstallPWA && (
            <button
              onClick={async () => {
                if (!deferredInstallPrompt) return;
                deferredInstallPrompt.prompt();
                const { outcome } = await deferredInstallPrompt.userChoice;
                if (outcome === 'accepted') {
                  setCanInstallPWA(false);
                  setDeferredInstallPrompt(null);
                }
              }}
              className="flex items-center gap-1 text-[10px] px-2 py-px rounded bg-[var(--accent)] text-white hover:opacity-90 active:scale-[0.985]"
              title="Install DeckMint as a standalone desktop app (works great on Windows, macOS, Linux, ChromeOS)"
            >
              Install app
            </button>
          )}

          deckmint.app • Structured prompts for production graphics
        </div>
      </div>

      <div className="main-content">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-header">
            <input
              className="search-input"
              placeholder="Search prompts, tags, use cases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Smart recommender — describe what you want to make and get matched to the right template. */}
          <div className="filter-section">
            <div className="filter-label">What are you trying to show?</div>
            <input
              className="search-input"
              placeholder="e.g. ranking chart, timeline of events, how-to explainer..."
              value={vizQuery}
              onChange={(e) => setVizQuery(e.target.value)}
            />
            {recommendations.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="text-[10px] text-[var(--text-muted)] px-1">Recommended for you</div>
                {recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="text-[11px] px-2 py-1.5 rounded border border-[var(--border)] hover:border-[var(--accent)] cursor-pointer flex items-center justify-between gap-2 group"
                    onClick={() => useRecommended(rec)}
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{rec.template.name}</div>
                      <div className="text-[9px] text-[var(--text-muted)] truncate">{rec.reason}</div>
                    </div>
                    <button
                      className="text-[9px] px-2 py-0.5 rounded bg-[var(--accent)] text-white opacity-90 group-hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); useRecommended(rec); }}
                    >
                      Use this
                    </button>
                  </div>
                ))}

                <button
                  className="w-full mt-1 text-[10px] py-1.5 rounded bg-emerald-600 text-white flex items-center justify-center gap-1 hover:bg-emerald-700 active:scale-[0.985]"
                  onClick={() => {
                    if (recommendations[0]) useRecommended(recommendations[0]);
                    setTimeout(() => buildDataStoryFromCurrent(), 140);
                  }}
                >
                  Use best match + build 4-slide story carousel
                </button>

                <div className="text-[9px] text-[var(--text-muted)] px-1">One click gives you the right visual treatment + a ready-to-export consistent mini-series.</div>
              </div>
            )}
          </div>

          {/* AI / Image Generation — redesigned for the "what a normal person experiences" demo.
              Default path: DeckMint provides the AI (via a serverless proxy on this Vercel deployment that holds a key).
              This is what lets the library seed with beautiful real images with one click and no user key pasting.

              Power user path: paste your own OpenAI key for unlimited volume + fully private/direct calls (your quota, your billing).
              We keep both paths because the hosted/shared key has real upsides (frictionless first use) and downsides (cost control, abuse, limits). */}
          <div className="filter-section border border-[var(--border)] rounded p-2 bg-[var(--bg-elevated)]">
            <div className="filter-label flex items-center justify-between">
              <span>Image Generation</span>
              {ai.openaiApiKey ? (
                <span className="text-[9px] px-1.5 py-px rounded bg-emerald-600 text-white">Your key (unlimited)</span>
              ) : (
                <span className="text-[9px] px-1.5 py-px rounded bg-sky-600 text-white">DeckMint AI (shared)</span>
              )}
            </div>

            {!ai.openaiApiKey && (
              <div className="text-[10px] text-[var(--text-secondary)] mb-1.5 leading-snug">
                Generations use DeckMint’s shared AI (demo tier). Great for trying the app and seeding the library with real high-quality images. Limited &amp; shared — for serious volume use your own key below.
              </div>
            )}

            {ai.openaiApiKey && (
              <div className="text-[10px] text-[var(--text-muted)] mb-1.5">
                Using your own OpenAI key. Calls go directly from your browser. Private + your quota.
              </div>
            )}

            <input
              type="password"
              className="search-input text-xs"
              placeholder="Paste your own OpenAI key for unlimited (optional)"
              value={ai.openaiApiKey || ''}
              onChange={(e) => setAiConfig({ provider: e.target.value ? 'openai' : 'none', openaiApiKey: e.target.value || undefined })}
            />

            <div className="flex items-center gap-2 mt-1.5">
              <select
                className="text-xs border rounded px-1 py-0.5 bg-transparent"
                value={ai.model || 'gpt-image-1'}
                onChange={(e) => setAiConfig({ model: e.target.value })}
              >
                <option value="gpt-image-1">gpt-image-1 (recommended)</option>
                <option value="dall-e-3">dall-e-3</option>
              </select>

              {ai.openaiApiKey && (
                <button
                  className="text-[10px] px-2 py-0.5 rounded border text-red-600 hover:bg-red-50"
                  onClick={() => {
                    clearAiKey();
                    toast('Switched back to DeckMint shared AI');
                  }}
                >
                  Use shared AI instead
                </button>
              )}
            </div>

            <div className="text-[9px] text-[var(--text-muted)] mt-1 leading-snug">
              The big emerald “Seed high-quality real examples” button and the per-card generate buttons will produce actual model images. With no key pasted they use the shared hosted path. Paste a key when you want private/unlimited results.
            </div>
          </div>

          <div className="filter-section">
            <div className="filter-label">Categories</div>
            <div className="flex flex-wrap">
              <div
                className={`category-chip ${!activeCategory ? 'active' : ''}`}
                onClick={() => setActiveCategory(null)}
              >
                All
              </div>
              {categories.map((cat) => (
                <div
                  key={cat}
                  className={`category-chip ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                >
                  {cat.replace('IG ', '')}
                </div>
              ))}
              {/* Custom templates — the real CMS power user feature */}
              {customTemplates.length > 0 && (
                <div
                  className={`category-chip ${activeCategory === 'Custom' ? 'active' : ''}`}
                  onClick={() => setActiveCategory(activeCategory === 'Custom' ? null : 'Custom')}
                  style={{ borderColor: 'var(--accent)', color: activeCategory === 'Custom' ? 'white' : 'var(--accent)' }}
                >
                  Custom ({customTemplates.length})
                </div>
              )}
            </div>
          </div>

          <div className="filter-section pt-1">
            <div className="filter-label mb-1">Quick stats</div>
            <div className="text-[11px] text-[var(--text-muted)] px-1">
              {templates.length} production templates • 8 families
              {customTemplates.length > 0 && ` • ${customTemplates.length} custom`}
              <br />Type above for smart template + example recommendations.
            </div>
          </div>

          {/* Saved series packs — collections / "my carousels" (high-value for anyone doing real content production) */}
          {savedPacks.length > 0 && (
            <div className="filter-section pt-2 border-t border-[var(--border)] mt-1">
              <div className="filter-label mb-1 flex items-center justify-between">
                Saved series <span className="text-[9px] text-[var(--text-muted)]">({savedPacks.length})</span>
              </div>
              <div className="flex flex-col gap-1">
                {savedPacks.slice().reverse().map((pack: any) => (
                  <div
                    key={pack.id}
                    className="text-[11px] px-2 py-1 rounded border border-[var(--border)] hover:border-[var(--accent)] cursor-pointer flex items-center justify-between gap-2 group"
                    onClick={() => {
                      loadSavedPack(pack.id);
                      setMode('series');
                      toast.success('Loaded saved series', { description: pack.name });
                    }}
                    title={`Load "${pack.name}" • ${pack.series.length} slides`}
                  >
                    <div className="truncate">{pack.name}</div>
                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100">
                      <span className="text-[9px] text-[var(--text-muted)]">{pack.series.length}</span>
                      <button
                        className="text-red-500/60 hover:text-red-500 text-[10px]"
                        onClick={(e) => { e.stopPropagation(); deleteSavedPack(pack.id); toast('Pack deleted'); }}
                        title="Delete this saved pack"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-[9px] text-[var(--text-muted)] mt-1 px-1">Click to load into the series strip. Use "Save as pack" in the builder.</div>
            </div>
          )}

          {/* Workspace backup / restore — makes the browser-on-any-box story complete */}
          <div className="filter-section pt-2 border-t border-[var(--border)] mt-1">
            <div className="filter-label">Workspace</div>
            <div className="flex flex-wrap gap-1">
              <button
                className="text-[10px] px-2 py-1 rounded border border-[var(--border)] hover:border-[var(--accent)]"
                onClick={() => {
                  const json = exportWorkspace();
                  const blob = new Blob([json], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `deckmint-workspace-${new Date().toISOString().slice(0,10)}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  toast.success('Workspace exported', { description: 'Your customs, packs, and full generation history.' });
                }}
              >
                Export backup
              </button>
              <label className="text-[10px] px-2 py-1 rounded border border-[var(--border)] hover:border-[var(--accent)] cursor-pointer">
                Import…
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const text = await file.text();
                    const res = importWorkspace(text, { merge: true });
                    if (res.success) {
                      toast.success('Workspace imported', { description: res.message });
                      setMode('library');
                    } else {
                      toast.error('Import failed', { description: res.message });
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            <div className="text-[9px] text-[var(--text-muted)] px-1 mt-1 leading-snug">
              Portable backup of everything. Great for switching computers or browsers.
            </div>
          </div>

          <div className="mt-auto p-3 text-[10px] text-[var(--text-muted)] border-t border-[var(--border)] leading-snug">
            CSS mocks will always look dated.<br />
            Use the emerald "✨ Generate &amp; use as thumbnail" buttons on the cards (or the seed button above) to populate the library with real high-quality generations from the actual prompts. That's how this thing stops looking like 1997.
          </div>
        </div>

        {/* Library Grid */}
        <div className="library">
          {/* Prominent, honest onboarding — this is the #1 thing users have said is missing */}
          <div className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-[12px] leading-snug">
            <div className="font-semibold mb-1">What DeckMint actually is (30 seconds)</div>
            <div className="text-[var(--text-secondary)]">
              A structured prompt library + editor for making high-quality, modern social graphics and carousels (the kind people actually save and share in 2026).
            </div>
            <div className="mt-1.5 text-[11px]">
              <strong>Loop:</strong> Browse templates → Edit the 6 fields on the right (live preview updates) → Generate a real PNG (local canvas or with your OpenAI key in the sidebar) → Export the image + the exact prompt, or click the emerald button on the card to make that beautiful result the permanent thumbnail for the template.
            </div>
            <div className="mt-1 text-[10px] text-[var(--text-muted)]">
              The CSS previews will always look cheap at small sizes. The "✨ Generate &amp; use as thumbnail" buttons (and the big seed button below) are how you make the library look like a serious collection of high-end work instead of a 1997 internal tool.
            </div>
          </div>

          <div className="library-header">
            <h2>
              {mode === 'library' && (isCustomFilter ? 'Custom Templates' : 'Prompt Library')}
              {mode === 'series' && 'Add slides to your series'}
              {mode === 'edit-existing' && 'Browse templates (optional reference)'}
            </h2>
            <div className="text-xs text-[var(--text-muted)]">
              {isCustomFilter 
                ? `${displayedCustoms.length} custom template${displayedCustoms.length === 1 ? '' : 's'}` 
                : `${filtered.length} of ${templates.length}`}
            </div>

            {/* The real way to make the library look like a serious collection of high-end graphics.
                The CSS approximations will always look dated. Click this (or the per-card button) to
                use the actual prompts + your AI key (or local renderer) to populate beautiful real examples. */}
            <button
              className="ml-auto text-[11px] px-3 py-1.5 rounded-md border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 font-medium shadow-sm"
              onClick={async () => {
                const targets = filtered.slice(0, 16);
                let count = 0;
                for (const t of targets) {
                  if (templateExampleOverrides[String(t.id)]) continue;
                  const example = getExampleStructuredForTemplate(t);
                  const prompt = buildStructuredPrompt(t, example as any);
                  try {
                    // generateRealImage now handles both:
                    // - Personal key (direct, private)
                    // - No key → hosted DeckMint AI via /api/generate-image (the "internal/shared" experience)
                    await generateRealImage(prompt, t.id, 'structured');
                    const latest = (usePromptStore.getState() as any).lastGenerated;
                    if (latest?.imageDataUrl) {
                      setTemplateExampleOverride(String(t.id), latest.imageDataUrl);
                      count++;
                    }
                    await new Promise(r => setTimeout(r, 100));
                  } catch {}
                }
                toast.success(`Seeded ${count} high-quality examples into the library`, { 
                  description: count > 0 
                    ? 'The grid now shows real output from the prompts for those templates. This is how it stops looking low-end.' 
                    : 'Most of these already had promoted images. Click the per-card emerald buttons for the rest.' 
                });
              }}
            >
              ✨ Seed high-quality real examples (recommended)
            </button>
          </div>

          <div className="prompt-grid">
            {isCustomFilter ? (
              // Render custom templates as first-class CMS items
              displayedCustoms.length === 0 ? (
                <div className="empty-state">No custom templates yet. Save edits from the Structured tab to create one.</div>
              ) : (
                displayedCustoms.map((custom) => {
                  const isActive = custom.id === (usePromptStore.getState() as any).selectedCustomId;
                  const base = custom.baseTemplateId ? templates.find((t) => t.id === custom.baseTemplateId) : null;
                  return (
                    <div
                      key={custom.id}
                      className={`prompt-card ${isActive ? 'selected' : ''}`}
                      onClick={() => handleSelectCustom(custom.id)}
                      style={{ borderColor: isActive ? 'var(--accent)' : undefined }}
                    >
                      {/* Priority: promoted real image for this custom (if the user chose one), otherwise the live structured preview of the saved values. */}
                      {templateExampleOverrides[custom.id] ? (
                        <div className="thumbnail-container" style={{ overflow: 'hidden' }}>
                          <img
                            src={templateExampleOverrides[custom.id]}
                            alt={`Example for ${custom.name}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        </div>
                      ) : (
                        <div style={{ transform: 'scale(0.82)', transformOrigin: 'top left', width: '122%' }}>
                          <LiveStructuredPreview
                            template={base || templates[0]}
                            structured={custom.structured as any}
                            size="md"
                          />
                        </div>
                      )}
                      <div className="meta">
                        <div className="name">{custom.name}</div>
                        <div className="category">
                          {base ? `based on ${base.name}` : 'Custom template'}
                        </div>
                        <div className="badges flex items-center gap-1">
                          <span className="badge" style={{ background: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'var(--accent)' }}>
                            Custom
                          </span>
                          {/* Quick CMS actions on the card itself — makes customs feel alive */}
                          <button
                            className="text-[9px] px-1 py-0 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-light)]"
                            onClick={(e) => { e.stopPropagation(); addToSeries(custom.id as any); toast.info('Added custom to series'); }}
                            title="Add this custom template to the current series"
                          >
                            + series
                          </button>
                          <button
                            className="text-[9px] px-1 py-0 rounded border text-[var(--text-muted)] hover:text-[var(--text)]"
                            onClick={(e) => { e.stopPropagation(); duplicateCustomTemplate(custom.id); toast.success('Duplicated custom'); }}
                            title="Duplicate this custom template"
                          >
                            ⎘
                          </button>
                          <button
                            className="text-[9px] px-1 py-0 rounded border text-red-500/70 hover:text-red-500"
                            onClick={(e) => { e.stopPropagation(); deleteCustomTemplate(custom.id); toast('Custom deleted'); }}
                            title="Delete this custom template"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              filtered.map((t) => {
                const isSelected = t.id === selectedId;
                const isInSeries = series.includes(t.id);
                // Use the richer live structured preview for anything where we have good example content.
                // This makes the library actually show what decent output from the prompt is supposed to look like,
                // instead of collapsing everything to generic minimal CSS cards.
                // Use the rich LiveStructuredPreview (with carefully curated "perfect modern example" data)
                // for almost everything. This makes the entire library grid show high-fidelity, modern,
                // production-grade representations of exactly what each prompt template is designed to output.
                // The user can still "promote" a real generated PNG/AI result on top of any card.
                const usesRichLivePreview =
                  /statistical|data fact|infographic/i.test(t.name) ||
                  t.visual_type.includes('data') ||
                  t.category.includes('Infographic') ||
                  t.visual_type.includes('carousel') ||
                  t.visual_type === 'blog-hero' ||
                  t.visual_type === 'infographic' ||
                  t.visual_type === 'cheatsheet' ||
                  t.visual_type === 'knowledge-card' ||
                  t.visual_type === 'step-card' ||
                  t.visual_type === 'comparison-card' ||
                  t.visual_type === 'contrast-card' ||
                  t.visual_type === 'mockup' ||
                  t.visual_type === 'quote-card' ||
                  t.visual_type === 'planner' ||
                  t.visual_type === 'recipe' ||
                  t.visual_type === 'itinerary' ||
                  t.visual_type === 'before-after';

                return (
                  <div
                    key={t.id}
                    className={`prompt-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(t.id)}
                    title="Click to inspect — the live preview in the Structured tab will show exactly what a filled version looks like"
                  >
                    {/* Priority: if the user has promoted a real high-quality generation (local PNG or AI) as the example for this template,
                        show that actual image. This is the "use our own prompts to produce high-end graphics of what they do" path. */}
                    {templateExampleOverrides[String(t.id)] ? (
                      /* When a real high-end generation is promoted, give it maximum visual real estate
                         so the library actually looks like a collection of finished modern graphics. */
                      <div className="thumbnail-container" data-ratio={t.aspect_ratio} style={{ overflow: 'hidden', minHeight: '72%' }}>
                        <img
                          src={templateExampleOverrides[String(t.id)]}
                          alt={`Example for ${t.name}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      </div>
                    ) : usesRichLivePreview ? (
                      /* Give the rich "perfect modern example" preview real visual weight in the card.
                         The old tiny scaled-down version was a big part of why it still felt weak. */
                      <div style={{ transform: 'scale(0.92)', transformOrigin: 'top left', width: '109%' }}>
                        <LiveStructuredPreview
                          template={t}
                          structured={getExampleStructuredForTemplate(t) as any}
                          size="md"
                        />
                      </div>
                    ) : (
                      <PromptThumbnail template={t} size="sm" />
                    )}
                    <div className="meta">
                      <div className="name">{t.name}</div>

                      {/* Minimal signal — the visual should do the talking. */}
                      <div className="text-[7.5px] text-[var(--text-muted)] leading-tight mt-0.5 line-clamp-1">
                        {usesRichLivePreview ? 'Modern high-signal example' : t.category.replace('IG ', '')}
                      </div>

                      {/* Quick actions — the emerald one is the important "make this card look high-end" action */}
                      <div className="mt-1 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="text-[8px] px-1.5 py-px rounded border border-[var(--border)] hover:border-[var(--accent)]"
                          onClick={(e) => { e.stopPropagation(); handleSelect(t.id); setTimeout(() => buildDataStoryFromCurrent(), 80); }}
                          title="Load this template with smart defaults + immediately build a 4-slide story carousel"
                        >
                          + story
                        </button>
                        <button
                          className="text-[8px] px-1.5 py-px rounded border border-[var(--border)] hover:border-[var(--accent)]"
                          onClick={(e) => { e.stopPropagation(); addToSeries(t.id); }}
                          title="Add this template to the current series"
                        >
                          + series
                        </button>
                        <button
                          className="text-[8px] px-1.5 py-px rounded border border-[var(--border)] hover:border-[var(--accent)]"
                          onClick={(e) => {
                            e.stopPropagation();
                            const prompt = generatePrompt(t, getEffectiveValues(t, variableValues[t.id] || {}));
                            handleCopyPrompt(prompt, t.name);
                          }}
                          title="Copy the assembled prompt for this template (using current variable values)"
                        >
                          copy
                        </button>

                        {/* The important one for making the library actually look high-end.
                            Uses the curated "perfect modern example" structured data we built,
                            assembles the real prompt, generates (AI if you have a key, else good local canvas),
                            then immediately promotes the resulting image as the canonical thumbnail for this card.
                            This is how the app "uses its own prompts to produce high end graphics of what they do". */}
                        <button
                          className="text-[8px] px-1.5 py-px rounded border border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const example = getExampleStructuredForTemplate(t);
                            // Build the exact prompt the template + this perfect example data would produce
                            const prompt = buildStructuredPrompt(t, example as any);

                            try {
                              // Always attempt a real generation.
                              // The store will use your personal key if present, otherwise the hosted DeckMint AI (shared key on this Vercel deployment).
                              await generateRealImage(prompt, t.id, 'structured');
                              const latest = (usePromptStore.getState() as any).lastGenerated;
                              if (latest?.imageDataUrl) {
                                setTemplateExampleOverride(String(t.id), latest.imageDataUrl);
                                toast.success('High-quality example set as library thumbnail', { description: `Card for "${t.name}" now shows a real generated image.` });
                              }
                            } catch (err: any) {
                              toast.error('Failed to generate example', { description: String(err?.message || err) });
                            }
                          }}
                          title="Generate a high-quality visual from this template's best example data and make it the thumbnail shown in the library grid"
                        >
                          ✨ Generate &amp; use as thumbnail
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {filtered.length === 0 && (
            <div className="empty-state">No prompts match your search.</div>
          )}
        </div>

        {/* Inspector */}
        <div className="inspector">
          {mode !== 'edit-existing' && (
            <>
              <div className="inspector-header">
                { (usePromptStore.getState() as any).selectedCustomId ? (
                  // Custom template header (true CMS mode — name is editable, rich actions)
                  (() => {
                    const activeId = (usePromptStore.getState() as any).selectedCustomId as string;
                    const activeCustom = customTemplates.find(c => c.id === activeId);
                    if (!activeCustom) return <div className="name">Custom Template</div>;

                    const currentName = activeCustom.name;
                    return (
                      <>
                        <div className="name flex items-center gap-2">
                          <input
                            className="bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none text-[15px] font-semibold"
                            value={currentName}
                            onChange={(e) => {
                              // live update the name in store as you type (feels like a real CMS)
                              renameCustomTemplate(activeId, e.target.value);
                            }}
                            onBlur={(e) => {
                              // ensure a sensible name
                              if (!e.target.value.trim()) renameCustomTemplate(activeId, 'Untitled custom');
                            }}
                            title="Rename this custom template"
                          />
                          <span className="text-[10px] px-1.5 py-0 rounded" style={{background:'var(--accent-light)', color:'var(--accent)'}}>Custom</span>
                        </div>
                        <div className="summary">Saved custom template — edits in the Structured tab are live. Rename above, duplicate, or propagate to your series.</div>

                        {templateExampleOverrides[activeId] && (
                          <div className="mt-1 text-[9px] flex items-center gap-2">
                            <span className="px-1.5 py-px rounded bg-emerald-100 text-emerald-700">Using your promoted example image in the library</span>
                            <button className="text-red-600 hover:underline" onClick={() => { clearTemplateExampleOverride(activeId); toast('Reverted custom library card to live preview'); }}>
                              Reset to live preview
                            </button>
                          </div>
                        )}

                        <div className="mt-2 flex flex-wrap gap-2">
                          <button 
                            className="action-btn text-xs"
                            onClick={() => {
                              duplicateCustomTemplate(activeId);
                              toast.success('Custom duplicated', { description: 'A copy was added to your customs.' });
                            }}
                          >
                            Duplicate as new
                          </button>
                          <button 
                            className="action-btn text-xs"
                            onClick={() => {
                              if (series.length === 0) {
                                toast.info('Add some slides to your series first');
                                return;
                              }
                              applyCurrentStructuredToSeries();
                              toast.success('Applied to series', {
                                description: 'All slides in the series now use these structured values (customs keep their identity).',
                              });
                            }}
                          >
                            Apply these edits to entire series
                          </button>
                          <button 
                            className="action-btn text-xs text-red-600 hover:bg-red-50"
                            onClick={() => {
                              deleteCustomTemplate(activeId);
                              toast('Custom template deleted');
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    );
                  })()
                ) : (
                  <>
                    <div className="name">{selected.name}</div>
                    <div className="summary">{selected.summary}</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selected.platforms.map((p) => (
                        <span key={p} className="badge">{p}</span>
                      ))}
                      <span className="badge">{selected.aspect_ratio}</span>
                    </div>

                    {/* If the user has promoted a real generated image for this template, show a clear indicator + reset. */}
                    {templateExampleOverrides[String(selected.id)] && (
                      <div className="mt-1.5 flex items-center gap-2 text-[9px]">
                        <span className="px-1.5 py-px rounded bg-emerald-100 text-emerald-700">Using your promoted example image in the library</span>
                        <button
                          className="text-red-600 hover:underline"
                          onClick={() => {
                            clearTemplateExampleOverride(String(selected.id));
                            toast('Reverted library card to default visual');
                          }}
                        >
                          Reset to default mock
                        </button>
                      </div>
                    )}

                    {/* Prompt quality notes — surfaces the aggressive hardening work we did on the 30 templates.
                        These are the exact "make sure it is as dynamic and accurate as Grok images" instructions,
                        broken out per template and per model. Not injected into the prompt (keeps it model-agnostic),
                        but shown here so power users know what the prompt is fighting for. */}
                    {selected.model_tuning && (
                      <div className="mt-2 text-[9px] border border-[var(--border)] rounded p-1.5 bg-[var(--bg-elevated)]">
                        <div className="font-medium text-[var(--text-secondary)] mb-0.5">Prompt quality notes</div>
                        {selected.model_tuning.general && (
                          <div className="mb-0.5"><span className="text-[var(--accent)]">General:</span> {selected.model_tuning.general}</div>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {selected.model_tuning.flux && (
                            <span className="px-1 rounded bg-black/5">Flux: {selected.model_tuning.flux}</span>
                          )}
                          {selected.model_tuning.grok && (
                            <span className="px-1 rounded bg-black/5">Grok: {selected.model_tuning.grok}</span>
                          )}
                          {selected.model_tuning.openai && (
                            <span className="px-1 rounded bg-black/5">OpenAI: {selected.model_tuning.openai}</span>
                          )}
                        </div>
                        <div className="text-[8px] text-[var(--text-muted)] mt-0.5">These notes drove the verbatim text rules, proportionality, and series consistency in the assembled prompt.</div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Real tabs */}
              <div className="inspector-tabs">
                <div
                  className={`inspector-tab ${inspectorTab === 'variables' ? 'active' : ''}`}
                  onClick={() => setInspectorTab('variables')}
                >
                  Variables
                </div>
                <div
                  className={`inspector-tab ${inspectorTab === 'structured' ? 'active' : ''}`}
                  onClick={() => setInspectorTab('structured')}
                >
                  Structured
                </div>
                <div
                  className={`inspector-tab ${inspectorTab === 'raw' ? 'active' : ''}`}
                  onClick={() => setInspectorTab('raw')}
                >
                  Raw
                </div>
              </div>

              <div className="inspector-body">
                {/* === VARIABLES TAB === */}
                {inspectorTab === 'variables' && (
                  <>
                    {(usePromptStore.getState() as any).selectedCustomId && (
                      <div className="mb-3 text-xs text-[var(--text-muted)]">
                        Custom templates are edited in the <span className="font-medium">Structured</span> tab.
                      </div>
                    )}
                    <div className="section">
                      <div className="section-title">Fill variables (live preview)</div>
                      {selected.variables.map((v) => (
                        <div key={v.key} className="variable-row">
                          <label>
                            {v.label}
                            {v.help && <span className="text-[10px] text-[var(--text-muted)] ml-1">({v.help})</span>}
                          </label>
                          {v.inputType === 'textarea' ? (
                            <textarea
                              value={effectiveValues[v.key] ?? ''}
                              onChange={(e) => setVariableValue(selected.id, v.key, e.target.value)}
                              placeholder={v.example}
                            />
                          ) : (
                            <input
                              value={effectiveValues[v.key] ?? ''}
                              onChange={(e) => setVariableValue(selected.id, v.key, e.target.value)}
                              placeholder={v.example}
                            />
                          )}
                        </div>
                      ))}
                      <button
                        className="action-btn text-xs mt-1"
                        onClick={() => resetVariables(selected.id)}
                      >
                        <RotateCcw size={13} /> Reset to defaults
                      </button>
                    </div>

                    <div className="section">
                      <div className="section-title">Generated prompt (copy this)</div>
                      <div className="prompt-output">{generatedPrompt}</div>
                      <button className="copy-btn" onClick={() => handleCopyPrompt(generatedPrompt)}>
                        <Copy size={15} /> Copy full prompt
                      </button>
                    </div>

                    <div className="action-row">
                      <button
                        className="action-btn primary"
                        onClick={() => {
                          const activeCustom = (usePromptStore.getState() as any).selectedCustomId as string | null;
                          const idToAdd = activeCustom || selected.id;
                          addToSeries(idToAdd as any);
                          setMode('series');
                          toast.info('Added to series', { description: 'Switch to Build Series mode to arrange and export' });
                        }}
                      >
                        <Plus size={15} /> Add to Series
                      </button>
                      <button className="action-btn" onClick={() => handleCopyPrompt(selected.base_prompt, 'Base template')}>
                        Copy base
                      </button>
                    </div>

                    {/* Real generation actions.
                        The local PNG export is always available and fantastic.
                        When you have an OpenAI key configured, a second path appears that actually calls the model
                        and drops the real result into the exact same "Latest generation" + history UI. */}
                    <div className="mt-3 flex flex-col gap-2">
                      <button
                        className="copy-btn bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => {
                          recordGeneration(generatedPrompt, selected.id, 'variables');
                          toast.success('Prompt recorded (local visual only)');
                        }}
                      >
                        Generate preview from current prompt
                      </button>

                      {ai.openaiApiKey ? (
                        <button
                          className="action-btn w-full bg-sky-600 hover:bg-sky-700 text-white"
                          onClick={async () => {
                            try {
                              await generateRealImage(generatedPrompt, selected.id, 'variables');
                              toast.success('Real image generated', { description: 'Result saved to your local history (same as PNG exports).' });
                            } catch (e: any) {
                              toast.error('Generation failed', { description: String(e?.message || e) });
                            }
                          }}
                        >
                          Generate real image with AI (OpenAI)
                        </button>
                      ) : (
                        <div className="text-[10px] text-[var(--text-muted)] px-1">
                          Add an OpenAI key above to unlock real model generation for this prompt.
                        </div>
                      )}
                    </div>

                    {/* One-click local asset export — produces a real PNG of the current visual + the exact prompt as a sidecar. No model required. */}
                    <button
                      className="action-btn mt-2 w-full"
                      onClick={async () => {
                        const promptToUse = generatedPrompt;
                        try {
                          const dataUrl = await renderStructuredPreviewToDataUrl(currentStructured, selected, 1280);
                          // Record it so it appears in history with the visual
                          recordGeneration(promptToUse, selected.id, 'variables', dataUrl);
                          // Also trigger an immediate download of the image
                          const a = document.createElement('a');
                          a.href = dataUrl;
                          a.download = `${(selected.name || 'deckmint').toLowerCase().replace(/\s+/g, '-')}.png`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          toast.success('Visual exported', { description: 'PNG downloaded + recorded in your local generations.' });
                        } catch {
                          recordGeneration(promptToUse, selected.id, 'variables');
                          toast('Exported prompt (visual render failed)');
                        }
                      }}
                    >
                      Export current visual as PNG + prompt
                    </button>

                    <div className="mt-4 text-[10px] text-[var(--text-muted)] leading-snug">
                      These prompts have been honed for precision: exact on-image text is quoted, layout proportions specified, and series consistency rules included where relevant.
                    </div>
                  </>
                )}

                {/* === STRUCTURED 6-PART EDITOR — polished, live, connected === */}
                {inspectorTab === 'structured' && (
                  <>
                    <div className="section">
                      <div className="section-title flex items-center justify-between">
                        <span>Edit the six core parts (the real prompt CMS)</span>
                        <button
                          className="action-btn text-[10px] px-2 py-0.5"
                          onClick={() => resetStructuredEdit(selectedId!)}
                          title="Reset structured edits for this template back to the original template values"
                        >
                          Reset structured
                        </button>
                      </div>

                      {[
                        { key: 'subject' as const, label: 'Subject / Core message', help: 'What this visual is actually about' },
                        { key: 'useCase' as const, label: 'Use case / Format', help: 'IG post, carousel, blog hero, infographic, etc.' },
                        { key: 'layout' as const, label: 'Layout & composition', help: 'Zones, proportions, hierarchy on the canvas' },
                        { key: 'color' as const, label: 'Color & palette', help: 'Background, accents, mood' },
                        { key: 'typography' as const, label: 'Typography', help: 'Font families, weights, scale' },
                        { key: 'style' as const, label: 'Overall style & treatment', help: 'Flat, photoreal, hand-drawn, editorial…' },
                        { key: 'onImageText' as const, label: 'On-image text (exact strings)', help: 'One per line. These must be rendered verbatim by the model.' },
                      ].map((field) => {
                        const isOverridden = currentStructured[field.key] !== (selected as any)[field.key === 'onImageText' ? 'on_image_text_structure' : field.key === 'useCase' ? 'use_case' : field.key] && 
                          (field.key !== 'onImageText' ? currentStructured[field.key] !== (selected as any)[field.key === 'useCase' ? 'use_case' : field.key] : true);
                        return (
                          <div key={field.key} className="structured-field">
                            <label className="flex items-center justify-between">
                              <span>
                                {field.label}
                                <span className="text-[10px] text-[var(--text-muted)] ml-1">— {field.help}</span>
                              </span>
                              <button
                                className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text)]"
                                onClick={() => {
                                  // Reset this field to the template's original value
                                  const originalValue = field.key === 'onImageText' 
                                    ? (selected as any).on_image_text_structure.join('\n')
                                    : (selected as any)[field.key === 'useCase' ? 'use_case' : field.key];
                                  setStructuredEdit(selectedId!, field.key, originalValue);
                                }}
                                title="Reset this field to the original template value"
                              >
                                reset
                              </button>
                            </label>
                            <textarea
                              value={currentStructured[field.key]}
                              onChange={(e) => setStructuredEdit(selectedId!, field.key, e.target.value)}
                              className={isOverridden ? 'border-[var(--accent)]' : ''}
                            />
                          </div>
                        );
                      })}

                      {/* Live preview of the fully assembled structured prompt */}
                      <div className="mt-3">
                        <div className="section-title">Live structured output (updates as you type)</div>
                        <div className="prompt-output text-xs max-h-[220px]">{assembledStructuredPrompt}</div>
                        <div className="flex gap-2 mt-2">
                          <button
                            className="copy-btn flex-1"
                            onClick={() => handleCopyPrompt(assembledStructuredPrompt, 'Structured prompt')}
                          >
                            <Copy size={15} /> Copy structured prompt
                          </button>
                          <button
                            className="action-btn primary flex-1"
                            onClick={() => {
                              const activeCustomId = (usePromptStore.getState() as any).selectedCustomId as string | null;
                              // For customs we add the custom id string so the series can carry CMS templates
                              const idToAdd = activeCustomId || selectedId!;
                              addToSeries(idToAdd as any);
                              setMode('series');
                              toast.success('Added structured version to series', {
                                description: activeCustomId 
                                  ? 'Your custom template was added. It will export with its full structured prompt.'
                                  : 'Series export will use your structured edits for this slide.',
                              });
                            }}
                          >
                            <Plus size={15} /> Add this structured version to series
                          </button>
                        </div>

                        {/* === Surprise high-value feature: Live visual preview that reacts to your structured edits ===
                            This is the "visual zone / layout canvas preview that reflects the structured fields" we wanted from the start.
                            It is still 100% local / pure-CSS (instant, no cost, no external model), but now driven by the live six-part CMS values.
                            • Edit Color & palette → the mock recolors itself.
                            • Type or change On-image text lines → the exact strings are placed in context.
                            • Mention layout keywords ("grid", "split", "timeline", "top heavy", "centered") → the arrangement and emphasis shift.
                            • Typography hints (serif, bold, condensed) influence weight and feel.
                            The result: the Structured tab stops being "just text fields" and becomes a true visual production workstation.
                            Works identically whether you are editing a base template or one of your saved custom templates. */}
                        <div className="mt-4">
                          <div className="section-title flex items-center justify-between">
                            <span>Live visual preview</span>
                            <span className="text-[9px] text-[var(--text-muted)]">reflects the six fields as you type</span>
                          </div>
                          <div className="mt-1.5">
                            <LiveStructuredPreview
                              template={selected}
                              structured={currentStructured}
                              size="lg"
                            />
                          </div>
                          <div className="text-[9px] text-[var(--text-muted)] mt-1.5 leading-snug">
                            High-signal heuristic mock. Use it to rapidly explore visual direction before you copy the prompt or hit Generate.
                            This is one of the things that makes DeckMint feel like a real content production tool rather than a prompt list.
                          </div>
                        </div>

                        {/* The high-value "create the actual graphic" action, using the structured prompt */}
                        <button
                          className="copy-btn mt-3 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => {
                            recordGeneration(assembledStructuredPrompt, selectedId!, 'structured');
                            toast.success('Structured prompt sent for generation (stub)', {
                              description: 'Real version will use securely stored credentials and stream the result back into the app.',
                            });
                          }}
                        >
                          Generate preview from these structured edits
                        </button>

                        {/* High-value local asset action: one click gives you a production-quality PNG that matches the exact structured prompt you just refined, plus the prompt itself. */}
                        <button
                          className="action-btn mt-2 w-full"
                          onClick={async () => {
                            try {
                              const dataUrl = await renderStructuredPreviewToDataUrl(currentStructured, selected, 1280);
                              recordGeneration(assembledStructuredPrompt, selectedId!, 'structured', dataUrl);
                              const a = document.createElement('a');
                              a.href = dataUrl;
                              a.download = `${(selected.name || 'deckmint').toLowerCase().replace(/\s+/g, '-')}.png`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              toast.success('Visual exported', { description: 'PNG + the exact structured prompt were saved locally.' });
                            } catch {
                              recordGeneration(assembledStructuredPrompt, selectedId!, 'structured');
                              toast('Prompt recorded (visual export had an issue)');
                            }
                          }}
                        >
                          Export live visual as PNG + structured prompt
                        </button>

                        {ai.openaiApiKey ? (
                          <button
                            className="action-btn w-full bg-sky-600 hover:bg-sky-700 text-white mt-1"
                            onClick={async () => {
                              try {
                                await generateRealImage(assembledStructuredPrompt, selectedId!, 'structured');
                                toast.success('Real image generated from structured prompt', {
                                  description: 'Landed in your local history with the same rich actions as PNG exports.',
                                });
                              } catch (e: any) {
                                toast.error('AI generation failed', { description: String(e?.message || e) });
                              }
                            }}
                          >
                            Generate real image with AI (uses your OpenAI key)
                          </button>
                        ) : (
                          <div className="text-[10px] text-[var(--text-muted)] px-1 mt-1">
                            Configure an OpenAI key in the left sidebar to generate a real image from these exact structured edits.
                          </div>
                        )}

                        {/* True CMS action: save these edits as a reusable custom template */}
                        <button
                          className="action-btn mt-2 w-full"
                          onClick={() => {
                            const suggested = `${selected.name} (custom)`;
                            const name = prompt('Name for this custom template?', suggested);
                            if (name) {
                              saveAsCustomTemplate(name, selectedId!, currentStructured);
                              // Immediately select the newly created custom so it feels connected
                              const latest = (usePromptStore.getState() as any).customTemplates.slice(-1)[0];
                              if (latest?.id) {
                                // selectCustomTemplate is now on the store
                                (usePromptStore.getState() as any).selectCustomTemplate?.(latest.id);
                              }
                              toast.success('Custom template saved', {
                                description: 'It is now available in the Custom filter and ready to use.',
                              });
                            }
                          }}
                        >
                          Save these edits as a custom template
                        </button>

                        {/* High-value CMS production action: push the current (possibly heavily edited) structured recipe to the whole series */}
                        {series.length > 0 && (
                          <button
                            className="action-btn mt-2 w-full border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-light)]"
                            onClick={() => {
                              applyCurrentStructuredToSeries();
                              toast.success('Applied structured edits to series', {
                                description: 'Every slide now carries these values. Customs in the series keep their own identity but receive the field updates.',
                              });
                            }}
                          >
                            Apply these structured edits to entire current series
                          </button>
                        )}
                      </div>

                      <div className="text-[10px] text-[var(--text-muted)] mt-3 leading-snug">
                        Edits are saved per template. When you export a series pack, any slide with structured edits will use the structured prompt instead of the variable version — this is how you get perfect carousel consistency and production control.
                      </div>
                    </div>
                  </>
                )}

                {/* === RAW / ORIGINAL === */}
                {inspectorTab === 'raw' && (
                  <>
                    <div className="section">
                      <div className="section-title">Original prompt from source (for reference)</div>
                      <div className="prompt-output text-xs">{selected.original_prompt}</div>
                      <button className="action-btn mt-2" onClick={() => handleCopyPrompt(selected.original_prompt, 'Original')}>
                        Copy original
                      </button>
                    </div>

                    <div className="section">
                      <div className="section-title">Current honed base template (what variables are applied to)</div>
                      <div className="prompt-output text-xs">{selected.base_prompt}</div>
                      <button className="action-btn mt-2" onClick={() => handleCopyPrompt(selected.base_prompt, 'Base')}>
                        Copy base template
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* === GENERATION PREVIEW (step 3 foundation — "actually use it to create graphics") === */}
              <div className="section border-t border-[var(--border)] pt-4 mt-2">
                <div className="section-title">Create the graphic</div>

                {lastGenerated ? (
                  <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-3">
                    <div className="text-[10px] text-[var(--text-muted)] mb-1 flex items-center gap-2">
                      Latest generation • {lastGenerated.source} • {new Date(lastGenerated.at).toLocaleTimeString()}
                    </div>

                    {/* If we have a local visual (from the live structured preview export), show it big and beautiful.
                        This is now a real asset you produced from your structured edits. */}
                    {lastGenerated.imageDataUrl ? (
                      <div className="mb-3 rounded overflow-hidden border border-[var(--border)] bg-white">
                        <img
                          src={lastGenerated.imageDataUrl}
                          alt="Generated visual"
                          className="w-full"
                          style={{ imageRendering: 'crisp-edges' }}
                        />
                      </div>
                    ) : (
                      <div className="mb-3 rounded overflow-hidden border border-[var(--border)] bg-[#f3f4f6]">
                        <div style={{ transform: 'scale(1.35)', transformOrigin: 'top left', width: '74%' }}>
                          <LiveStructuredPreview
                            template={selected}
                            structured={currentStructured}
                            size="md"
                          />
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] font-mono text-[var(--text-secondary)] line-clamp-3 mb-2">
                      {lastGenerated.prompt.slice(0, 280)}...
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        className="action-btn flex-1"
                        onClick={() => handleCopyPrompt(lastGenerated.prompt, 'Last generated prompt')}
                      >
                        Copy prompt
                      </button>

                      {lastGenerated.imageDataUrl && (
                        <button
                          className="action-btn flex-1"
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = lastGenerated.imageDataUrl!;
                            a.download = `deckmint-${new Date(lastGenerated.at).toISOString().slice(0,10)}.png`;
                            document.body.appendChild(a); a.click(); document.body.removeChild(a);
                          }}
                        >
                          Download image
                        </button>
                      )}

                      <button
                        className="action-btn flex-1"
                        onClick={() => {
                          // Save prompt as sidecar .txt
                          const blob = new Blob([lastGenerated.prompt], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `deckmint-prompt-${new Date(lastGenerated.at).toISOString().slice(0,10)}.txt`;
                          document.body.appendChild(a); a.click(); document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Download prompt .txt
                      </button>

                      <button
                        className="action-btn flex-1"
                        onClick={() => {
                          // Load this exact prompt's structured values back into the editor for further iteration
                          // We can't perfectly reverse a prompt to the six fields, so we at least select the right template/custom
                          if (lastGenerated.templateId != null) {
                            const id = lastGenerated.templateId;
                            selectTemplate(id);
                            (usePromptStore.getState() as any).selectedCustomId = null;
                            setInspectorTab('structured');
                            toast.info('Loaded template for the generation', { description: 'Re-open the Structured tab to continue refining.' });
                          }
                        }}
                      >
                        Load into editor
                      </button>

                      <button
                        className="action-btn flex-1"
                        onClick={() => {
                          setPreserveText('the previous visual treatment, layout, color palette, typography, and on-image text hierarchy');
                          setChangeText('update the subject and key messages to match the new prompt while keeping the exact same visual style and proportions');
                          setMode('edit-existing');
                          toast('Edit Existing primed', { description: 'Use the previous generation as the reference image.' });
                        }}
                      >
                        Use as reference for Edit Existing
                      </button>

                      {/* "Real AI" button in Latest — now works for both personal key and the hosted DeckMint shared AI.
                          This is a big part of the "it just works for normal users" experience. */}
                      {lastGenerated && (
                        <button
                          className="action-btn flex-1 bg-sky-600 hover:bg-sky-700 text-white"
                          onClick={async () => {
                            try {
                              await generateRealImage(lastGenerated.prompt, lastGenerated.templateId, lastGenerated.source as any);
                              toast.success('Real image generated', { description: 'Replaced latest with a fresh model result (still saved in history).' });
                            } catch (e: any) {
                              toast.error('Generation failed', { description: String(e?.message || e) });
                            }
                          }}
                        >
                          {ai.openaiApiKey ? 'Regenerate this with real AI' : 'Regenerate with DeckMint AI'}
                        </button>
                      )}

                      {/* The key "I produced something high-end with this prompt — make the library show it" action */}
                      {lastGenerated?.imageDataUrl && (
                        <button
                          className="action-btn flex-1 border border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => {
                            const activeCustom = (usePromptStore.getState() as any).selectedCustomId as string | null;
                            const key = activeCustom ? activeCustom : (lastGenerated.templateId != null ? String(lastGenerated.templateId) : null);
                            if (key && lastGenerated.imageDataUrl) {
                              setTemplateExampleOverride(key, lastGenerated.imageDataUrl);
                              const displayName = activeCustom
                                ? (customTemplates.find(c => c.id === activeCustom)?.name || 'custom')
                                : (templates.find(tt => tt.id === lastGenerated.templateId)?.name || 'template');
                              toast.success('Library updated', { description: `This image is now the example shown for "${displayName}" in the grid.` });
                            } else {
                              toast.info('Generate or load a template first so we know which card to update.');
                            }
                          }}
                        >
                          Use this image as the example in the library
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-[var(--text-muted)]">
                    Use the emerald “Generate preview” buttons above (in Variables or Structured tabs) — or the “Export … as PNG + prompt” buttons — to start the creation loop.
                    <br />Everything is local. No keys required. Add an OpenAI key in the sidebar if you also want real model images (they land in the same history).
                  </div>
                )}

                {generations.length > 0 && (
                  <div className="mt-3 text-[10px]">
                    <div className="text-[var(--text-muted)] mb-1">Recent local generations (click to copy prompt)</div>
                    <div className="space-y-2 max-h-40 overflow-auto pr-1">
                      {generations.slice(0, 6).map((g) => (
                        <div
                          key={g.id}
                          className="flex gap-2 rounded border border-[var(--border)] p-1.5 hover:border-[var(--accent)] cursor-pointer bg-[var(--bg)]"
                          onClick={() => handleCopyPrompt(g.prompt, 'History prompt')}
                        >
                          {g.imageDataUrl && (
                            <img src={g.imageDataUrl} alt="" className="w-16 h-16 object-cover rounded border border-[var(--border)] flex-shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-[9px] text-[var(--text-muted)]">
                              <span>{new Date(g.at).toLocaleTimeString()}</span>
                              <span className="opacity-60">{g.source}</span>
                            </div>
                            <div className="truncate text-[var(--text-secondary)] text-xs mt-0.5">{g.prompt.slice(0, 110)}…</div>
                            <div className="flex gap-2 mt-1 items-center">
                              <span className="text-[8px] text-[var(--accent)]">click row to copy prompt</span>
                              {g.imageDataUrl && <span className="text-[8px] text-[var(--text-muted)]">has local PNG</span>}
                              {g.imageDataUrl && g.templateId != null && (
                                <button
                                  className="ml-auto text-[8px] px-1.5 py-px rounded border border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const key = String(g.templateId);
                                    setTemplateExampleOverride(key, g.imageDataUrl!);
                                    const tmplName = templates.find(tt => tt.id === g.templateId)?.name || 'template';
                                    toast.success('Library updated', { description: `Using this image as the example for "${tmplName}"` });
                                  }}
                                >
                                  Use as library example
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Edit Existing Image mode (full panel) */}
          {mode === 'edit-existing' && (
            <>
              <div className="inspector-header">
                <div className="name">Edit Existing Image</div>
                <div className="summary">Preserve / Change pattern recommended by the source article for reliable local edits.</div>
              </div>
              <div className="inspector-body">
                <div className="section">
                  <div className="section-title">Preserve (exact elements to keep)</div>
                  <textarea
                    className="w-full min-h-[90px] font-mono text-sm border rounded p-2"
                    placeholder="original color palette, pose, background objects, typography style, layout, paper texture..."
                    value={preserveText}
                    onChange={(e) => setPreserveText(e.target.value)}
                  />
                </div>
                <div className="section">
                  <div className="section-title">Change (only these things)</div>
                  <textarea
                    className="w-full min-h-[90px] font-mono text-sm border rounded p-2"
                    placeholder="specific text on the third bullet, make the title 15% larger, swap the accent color to teal..."
                    value={changeText}
                    onChange={(e) => setChangeText(e.target.value)}
                  />
                </div>

                <div className="section">
                  <div className="section-title">Edit instruction (ready to paste)</div>
                  <div className="prompt-output text-xs">{editInstruction || 'Fill in Preserve and/or Change above to generate the instruction.'}</div>
                  {editInstruction && (
                    <button className="copy-btn mt-2" onClick={() => handleCopyPrompt(editInstruction, 'Edit instruction')}>
                      <Copy size={15} /> Copy edit instruction
                    </button>
                  )}
                </div>

                <div className="text-[10px] text-[var(--text-muted)] mt-3">
                  Tip: Also paste the original full prompt (or a description of the image) into your image model along with this edit instruction for best results.
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Series builder strip — upgraded with consistency lock, divergence indicators, per-slide notes, and rich exports.
          This is the "really satisfying" series builder from the high-value roadmap. */}
      {(mode === 'series' || series.length > 0) && (
        <div className="series-strip border-t">
          <div className="flex items-center gap-2 pr-3 text-xs font-medium text-[var(--text-secondary)] flex-shrink-0">
            SERIES ({series.length})
            <button className="text-[var(--text-muted)] hover:text-red-500" onClick={clearSeries} title="Clear entire series">
              <X size={14} />
            </button>
            <span className="ml-1 text-[9px] text-[var(--text-muted)] hidden sm:inline">Drag to reorder • “S” = structured/custom • style lock keeps carousels consistent</span>

            {/* High-value series tools */}
            {series.length >= 2 && (
              <button
                className="ml-2 text-[10px] px-2 py-0.5 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-light)]"
                onClick={() => {
                  lockStyleFromFirst();
                  toast.success('Style locked from first slide', {
                    description: 'Color, typography, and style copied to all other slides for visual consistency.',
                  });
                }}
                title="Copy color / typography / style from the first (cover) slide to every other slide. This is the key production consistency feature."
              >
                Lock style from first
              </button>
            )}
          </div>

          {series.length === 0 && (
            <div className="text-xs text-[var(--text-muted)] px-2 py-1">Click cards in the library (or use “Add this structured version to series”) to build a carousel or multi-slide set.</div>
          )}

          {/* Horizontal draggable series */}
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
            {seriesTemplates.map((t, idx) => {
              const sid = series[idx]; // the actual id (number or custom string) for this position
              const idStr = String(sid);
              const isCustom = idStr.startsWith('custom-');
              const hasStructured = isCustom || !!structuredEdits[(t as any).id];
              const isDragging = draggedSeriesId != null && String(draggedSeriesId) === idStr;
              const divergence = getDivergence(sid);
              const note = seriesNotes[idStr] || '';

              const isSelected = isCustom
                ? (usePromptStore.getState() as any).selectedCustomId === idStr
                : selectedId === (t as any).id;

              // Role labels for the magic 4-slide data story (and reasonable fallbacks for other lengths)
              let roleLabel = '';
              if (series.length === 4) {
                roleLabel = idx === 0 ? 'Cover' : idx === 1 ? 'Hero' : idx === 2 ? 'Insights' : 'CTA';
              } else if (idx === 0) {
                roleLabel = 'Cover';
              } else if (idx === series.length - 1 && series.length >= 3) {
                roleLabel = 'CTA';
              } else {
                roleLabel = `Slide ${idx + 1}`;
              }

              return (
                <div
                  key={idStr}
                  className={`series-item ${isDragging ? 'opacity-40' : ''} ${isSelected ? 'ring-1 ring-[var(--accent)]' : ''}`}
                  style={{ position: 'relative' }}
                  draggable
                  onDragStart={() => setDraggedSeriesId(sid)}
                  onDragEnd={() => setDraggedSeriesId(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedSeriesId == null || String(draggedSeriesId) === idStr) return;
                    const from = series.findIndex((x) => String(x) === String(draggedSeriesId));
                    const to = idx;
                    if (from > -1 && to > -1 && from !== to) {
                      const newSeries = [...series];
                      const [moved] = newSeries.splice(from, 1);
                      newSeries.splice(to, 0, moved);
                      setSeries(newSeries);
                    }
                    setDraggedSeriesId(null);
                  }}
                  onClick={() => {
                    if (isCustom) {
                      handleSelectCustom(idStr);
                    } else {
                      selectTemplate((t as any).id);
                      (usePromptStore.getState() as any).selectedCustomId = null;
                    }
                  }}
                  title="Drag to reorder • Click to inspect/edit"
                >
                  {/* Role badge — makes the 4-slide story feel like a real structured deliverable */}
                  {roleLabel && (
                    <div className="absolute -top-1 -left-1 z-10 text-[7px] px-1 rounded bg-[var(--accent)] text-white shadow">
                      {roleLabel}
                    </div>
                  )}

                  {isCustom ? (
                    <div className="thumbnail-container" data-ratio="4:5" style={{ background: '#f1f5f9' }}>
                      <div className="thumbnail text-[6px] p-1.5 flex flex-col">
                        <div className="text-[8px] font-semibold mb-0.5">Custom</div>
                        <div className="line-clamp-3 text-[5.5px] opacity-70">{(t as any).name}</div>
                      </div>
                    </div>
                  ) : (
                    <PromptThumbnail template={t} size="sm" />
                  )}

                  <div className="px-1.5 py-1 text-[10px] truncate flex flex-col gap-0.5">
                    <div className="flex justify-between items-center gap-1">
                      <span className="flex-1 truncate font-medium">{(t as any).name}</span>
                      {hasStructured && (
                        <span className="text-[8px] px-1 rounded bg-[var(--accent-light)] text-[var(--accent)]" title={isCustom ? 'Custom CMS template — exports with its saved structured prompt' : 'This slide uses structured 6-part edits'}>
                          S
                        </span>
                      )}
                      <button
                        className="text-[var(--text-muted)] hover:text-red-500 flex-shrink-0"
                        onClick={(e) => { e.stopPropagation(); removeFromSeries(sid); }}
                        title="Remove from series"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    {/* Divergence indicator — visual enforcement cue */}
                    {divergence && (
                      <div
                        className="text-[8px] px-1 rounded self-start"
                        style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}
                        title={`Differs from first slide in: ${divergence.join(', ')}. Use "Lock style from first" to enforce consistency.`}
                      >
                        style ≠ #{idx + 1 === 1 ? 'cover' : 'first'}
                      </div>
                    )}

                    {/* Per-slide production note (high-value for real workflows) */}
                    <input
                      className="text-[9px] border rounded px-1 py-0.5 w-full bg-white/70"
                      placeholder="note for this slide (private)"
                      value={note}
                      onChange={(e) => setSeriesNote(sid, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      title="Private production note for this slide. Included in Markdown export."
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Carousel preview strip — the "this actually feels like a deliverable" view.
              Shows the current series as a real horizontal carousel using the live structured previews.
              You see exactly what the 4 slides will look like together, with the exact structured values + thumbnail fidelity. */}
          {series.length > 0 && (
            <div className="mt-2 mb-1">
              <div className="text-[9px] text-[var(--text-muted)] px-1 mb-1 flex items-center gap-2">
                Carousel preview <span className="text-[var(--text-muted)]/60">— live from your structured edits</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {series.map((sid, i) => {
                  const idStr = String(sid);
                  const isCustom = idStr.startsWith('custom-');
                  let tmpl: any = null;
                  let structForSlide: any = {};
                  if (isCustom) {
                    const c = customTemplates.find((ct) => ct.id === idStr);
                    tmpl = c?.baseTemplateId ? templates.find((tt) => tt.id === c.baseTemplateId) : templates[0];
                    const liveKey = `custom:${idStr}` as any;
                    structForSlide = structuredEdits[liveKey] || c?.structured || {};
                  } else {
                    tmpl = templates.find((tt) => tt.id === (sid as number)) || templates[0];
                    structForSlide = structuredEdits[sid as number] || {};
                  }
                  return (
                    <div key={i} className="flex-shrink-0 w-28 border border-[var(--border)] rounded overflow-hidden bg-white" style={{ aspectRatio: tmpl?.aspect_ratio === '1:1' ? '1 / 1' : tmpl?.aspect_ratio === '16:9' ? '16 / 9' : '4 / 5' }}>
                      <div style={{ transform: 'scale(0.48)', transformOrigin: 'top left', width: '210%', height: '210%' }}>
                        <LiveStructuredPreview template={tmpl} structured={structForSlide} size="md" />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-[8px] text-[var(--text-muted)] px-1">This is the exact visual system + content that will be exported as PNGs. Re-order or edit any slide above and it updates live.</div>
            </div>
          )}

          {/* Rich export actions — now with real production asset export (the thing users actually need after building a series) */}
          {series.length > 0 && (
            <div className="flex items-center gap-2 mt-1 ml-1 flex-wrap">
              <button
                className="text-xs px-3 py-1 rounded bg-[var(--accent)] text-white flex items-center gap-1"
                onClick={() => {
                  const pack = buildSeriesPack(series, templates, variableValues, structuredEdits, customTemplates, seriesNotes);
                  const json = JSON.stringify({ series: pack, exportedAt: new Date().toISOString() }, null, 2);
                  handleCopyPrompt(json, 'Series pack');
                }}
              >
                <Copy size={14} /> Copy series pack (JSON)
              </button>

              <button
                className="text-xs px-3 py-1 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-light)] flex items-center gap-1"
                onClick={() => {
                  const pack = buildSeriesPack(series, templates, variableValues, structuredEdits, customTemplates, seriesNotes);
                  const md = pack.map((item: any) => {
                    const noteBlock = item.note ? `\n**Production note:** ${item.note}\n` : '';
                    return `## ${item.order}. ${item.name}\n\n${noteBlock}\`\`\`\n${item.prompt}\n\`\`\`\n`;
                  }).join('\n---\n\n');
                  const header = `# DeckMint Series Pack — ${new Date().toISOString().slice(0, 10)}\n\n${series.length} slides • order matters • structured edits and notes included where present\n\n`;
                  handleCopyPrompt(header + md, 'Series Markdown');
                }}
              >
                <Copy size={14} /> Copy as Markdown (ready to paste)
              </button>

              <button
                className="text-xs px-3 py-1 rounded bg-emerald-600 text-white flex items-center gap-1"
                onClick={() => {
                  const suggested = `Carousel ${new Date().toLocaleDateString()}`;
                  const name = prompt('Name for this saved series pack?', suggested);
                  if (name) {
                    saveCurrentSeriesAsPack(name);
                    toast.success('Series saved as pack', { description: 'You can load it later from the sidebar.' });
                  }
                }}
              >
                Save as pack
              </button>

              {/* The high-value "I built it, now give me the actual files" button */}
              <button
                className="text-xs px-3 py-1 rounded bg-emerald-700 text-white flex items-center gap-1 shadow-sm active:scale-[0.985]"
                onClick={() => exportSeriesAsProductionAssets()}
                title="Render real PNGs for every slide using the live structured previews, plus a self-contained Markdown file with the exact prompts, your notes, and image references. This is the deliverable."
              >
                ⬇ Export PNGs + Markdown pack
              </button>

              <div className="text-[10px] text-[var(--text-muted)] ml-1">
                PNGs are rendered from your live structured visuals. Markdown has the exact prompts + notes.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Command Palette — the power-user heart of a real desktop creative tool.
          ⌘K / Ctrl+K from anywhere. Fast nav + high-leverage actions on the current CMS + series state. */}
      {commandOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/40 flex items-start justify-center pt-[10vh] sm:pt-[12vh]"
          onClick={() => setCommandOpen(false)}
        >
          <div
            className="w-[min(640px,92vw)] rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <Command
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[var(--text-muted)] [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:pb-1"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setCommandOpen(false);
              }}
            >
              <div className="flex items-center gap-2 border-b border-[var(--border)] px-3">
                <Command.Input
                  autoFocus
                  placeholder="Search templates, customs, saved packs, or actions..."
                  className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-[var(--text-muted)]"
                />
                <div className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)]">ESC</div>
              </div>

              <Command.List className="max-h-[460px] overflow-auto p-1 text-sm">
                <Command.Empty className="px-3 py-6 text-center text-xs text-[var(--text-muted)]">
                  No matches. Try searching by name, tag, or action.
                </Command.Empty>

                {/* Fast navigation to any production template */}
                <Command.Group heading="Templates">
                  {templates.map((t) => (
                    <Command.Item
                      key={t.id}
                      value={`${t.name} ${t.category} ${t.summary} ${t.tags.join(' ')}`}
                      onSelect={() => {
                        handleSelect(t.id);
                        setCommandOpen(false);
                      }}
                      className="cmdk-item px-3 py-1.5 rounded flex items-center gap-2 cursor-pointer data-[selected=true]:bg-[var(--accent-light)] data-[selected=true]:text-[var(--accent)]"
                    >
                      <span className="font-mono text-[10px] w-[42px] text-[var(--text-muted)]">{t.aspect_ratio}</span>
                      <span className="font-medium truncate">{t.name}</span>
                      <span className="ml-auto text-[10px] text-[var(--text-muted)] truncate max-w-[140px]">{t.category.replace('IG ', '')}</span>
                    </Command.Item>
                  ))}
                </Command.Group>

                {/* Customs are first-class — jump straight into editing a saved recipe */}
                {customTemplates.length > 0 && (
                  <Command.Group heading="Custom templates (your CMS recipes)">
                    {customTemplates.map((c) => (
                      <Command.Item
                        key={c.id}
                        value={`custom ${c.name} ${c.structured.subject} ${c.structured.useCase}`}
                        onSelect={() => {
                          handleSelectCustom(c.id);
                          setCommandOpen(false);
                        }}
                        className="cmdk-item px-3 py-1.5 rounded flex items-center gap-2 cursor-pointer data-[selected=true]:bg-[var(--accent-light)] data-[selected=true]:text-[var(--accent)]"
                      >
                        <span className="text-[10px] px-1.5 rounded bg-[var(--accent-light)] text-[var(--accent)]">Custom</span>
                        <span className="font-medium truncate">{c.name}</span>
                        <span className="ml-auto text-[10px] text-[var(--text-muted)] truncate max-w-[160px]">{c.structured.subject.slice(0, 60)}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* High-leverage actions that operate on the live CMS + series state */}
                <Command.Group heading="Actions">
                  <Command.Item
                    onSelect={() => {
                      const activeCustom = (usePromptStore.getState() as any).selectedCustomId as string | null;
                      const idToAdd = activeCustom || selectedId!;
                      addToSeries(idToAdd as any);
                      setCommandOpen(false);
                      toast.info('Added to series');
                    }}
                    className="cmdk-item px-3 py-1.5 rounded cursor-pointer data-[selected=true]:bg-[var(--accent-light)] data-[selected=true]:text-[var(--accent)]"
                  >
                    Add current selection to series
                  </Command.Item>

                  <Command.Item
                    onSelect={() => {
                      setMode('series');
                      setCommandOpen(false);
                    }}
                    className="cmdk-item px-3 py-1.5 rounded cursor-pointer data-[selected=true]:bg-[var(--accent-light)] data-[selected=true]:text-[var(--accent)]"
                  >
                    Switch to Build Series mode
                  </Command.Item>

                  {series.length >= 2 && (
                    <Command.Item
                      onSelect={() => {
                        lockStyleFromFirst();
                        setCommandOpen(false);
                        toast.success('Style locked from first slide', { description: 'Color, typography & style propagated for consistency.' });
                      }}
                      className="cmdk-item px-3 py-1.5 rounded cursor-pointer data-[selected=true]:bg-[var(--accent-light)] data-[selected=true]:text-[var(--accent)]"
                    >
                      Lock style from first slide (carousel consistency)
                    </Command.Item>
                  )}

                  {series.length > 0 && (
                    <Command.Item
                      onSelect={() => {
                        applyCurrentStructuredToSeries();
                        setCommandOpen(false);
                        toast.success('Applied structured edits to series');
                      }}
                      className="cmdk-item px-3 py-1.5 rounded cursor-pointer data-[selected=true]:bg-[var(--accent-light)] data-[selected=true]:text-[var(--accent)]"
                    >
                      Apply current structured edits to entire series
                    </Command.Item>
                  )}

                  {series.length > 0 && (
                    <Command.Item
                      onSelect={() => {
                        const suggested = `Carousel ${new Date().toLocaleDateString()}`;
                        const name = prompt('Name for this saved series pack?', suggested);
                        if (name) {
                          saveCurrentSeriesAsPack(name);
                          toast.success('Series saved as pack');
                        }
                        setCommandOpen(false);
                      }}
                      className="cmdk-item px-3 py-1.5 rounded cursor-pointer data-[selected=true]:bg-[var(--accent-light)] data-[selected=true]:text-[var(--accent)]"
                    >
                      Save current series as pack (collection)
                    </Command.Item>
                  )}

                  {series.length > 0 && (
                    <Command.Item
                      onSelect={async () => {
                        setCommandOpen(false);
                        // small delay so the palette closes cleanly before downloads start
                        setTimeout(() => {
                          exportSeriesAsProductionAssets();
                        }, 60);
                      }}
                      className="cmdk-item px-3 py-1.5 rounded cursor-pointer data-[selected=true]:bg-[var(--accent-light)] data-[selected=true]:text-[var(--accent)]"
                    >
                      Export production assets (PNGs + Markdown pack)
                    </Command.Item>
                  )}

                  {/* Workspace portability from the keyboard */}
                  <Command.Item
                    onSelect={() => {
                      const json = exportWorkspace();
                      const blob = new Blob([json], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `deckmint-workspace-${new Date().toISOString().slice(0,10)}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      setCommandOpen(false);
                      toast.success('Workspace exported');
                    }}
                    className="cmdk-item px-3 py-1.5 rounded cursor-pointer data-[selected=true]:bg-[var(--accent-light)] data-[selected=true]:text-[var(--accent)]"
                  >
                    Export full workspace backup
                  </Command.Item>

                  <Command.Item
                    onSelect={() => {
                      // Trigger a hidden file input for import from the palette
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'application/json,.json';
                      input.onchange = async () => {
                        const file = input.files?.[0];
                        if (!file) return;
                        const text = await file.text();
                        const res = importWorkspace(text, { merge: true });
                        if (res.success) {
                          toast.success('Workspace imported', { description: res.message });
                          setMode('library');
                        } else {
                          toast.error('Import failed', { description: res.message });
                        }
                        setCommandOpen(false);
                      };
                      input.click();
                    }}
                    className="cmdk-item px-3 py-1.5 rounded cursor-pointer data-[selected=true]:bg-[var(--accent-light)] data-[selected=true]:text-[var(--accent)]"
                  >
                    Import workspace backup…
                  </Command.Item>

                  {/* Real AI generation from the keyboard — only shown when the user has configured a key */}
                  {ai.openaiApiKey && (
                    <Command.Item
                      onSelect={async () => {
                        setCommandOpen(false);
                        const activeCustom = (usePromptStore.getState() as any).selectedCustomId as string | null;
                        const promptToUse = activeCustom
                          ? (structuredEdits[`custom:${activeCustom}` as any] ? assembledStructuredPrompt : generatedPrompt)
                          : (inspectorTab === 'structured' ? assembledStructuredPrompt : generatedPrompt);
                        const tId = activeCustom ? null : selectedId;
                        try {
                          await generateRealImage(promptToUse, tId, inspectorTab === 'structured' ? 'structured' : 'variables');
                          toast.success('Real image generated via ⌘K');
                        } catch (e: any) {
                          toast.error('Generation failed', { description: String(e?.message || e) });
                        }
                      }}
                      className="cmdk-item px-3 py-1.5 rounded cursor-pointer data-[selected=true]:bg-[var(--accent-light)] data-[selected=true]:text-[var(--accent)]"
                    >
                      Generate real image with AI (current prompt)
                    </Command.Item>
                  )}

                  {series.length > 0 && (
                    <Command.Item
                      onSelect={() => {
                        clearSeries();
                        setCommandOpen(false);
                      }}
                      className="cmdk-item px-3 py-1.5 rounded cursor-pointer data-[selected=true]:bg-[var(--accent-light)] data-[selected=true]:text-[var(--accent)]"
                    >
                      Clear series
                    </Command.Item>
                  )}

                  <Command.Item
                    onSelect={() => {
                      const suggested = `${selected.name} (custom)`;
                      const name = prompt('Name for this custom template?', suggested);
                      if (name) {
                        saveAsCustomTemplate(name, selectedId!, currentStructured);
                        const latest = (usePromptStore.getState() as any).customTemplates.slice(-1)[0];
                        if (latest?.id) {
                          (usePromptStore.getState() as any).selectCustomTemplate?.(latest.id);
                        }
                        toast.success('Custom template saved');
                      }
                      setCommandOpen(false);
                    }}
                    className="cmdk-item px-3 py-1.5 rounded cursor-pointer data-[selected=true]:bg-[var(--accent-light)] data-[selected=true]:text-[var(--accent)]"
                  >
                    Save current as custom template
                  </Command.Item>
                </Command.Group>

                {/* Saved packs become instantly loadable from the keyboard */}
                {savedPacks.length > 0 && (
                  <Command.Group heading="Saved series packs">
                    {savedPacks.slice().reverse().map((pack: any) => (
                      <Command.Item
                        key={pack.id}
                        value={`pack ${pack.name}`}
                        onSelect={() => {
                          loadSavedPack(pack.id);
                          setMode('series');
                          setCommandOpen(false);
                          toast.success('Loaded saved pack', { description: pack.name });
                        }}
                        className="cmdk-item px-3 py-1.5 rounded cursor-pointer data-[selected=true]:bg-[var(--accent-light)] data-[selected=true]:text-[var(--accent)]"
                      >
                        <span>{pack.name}</span>
                        <span className="ml-auto text-[10px] text-[var(--text-muted)]">{pack.series.length} slides</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>

              <div className="border-t border-[var(--border)] px-3 py-1.5 text-[10px] text-[var(--text-muted)] flex items-center justify-between bg-[var(--bg)]">
                <div>↑↓ navigate • ↵ select • ⌘K / Ctrl+K toggle</div>
                <div className="font-medium text-[var(--text-secondary)]">DeckMint</div>
              </div>
            </Command>
          </div>
        </div>
      )}

      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
