import { create } from 'zustand';
import type { PromptTemplate } from '../types/prompt';
import { promptTemplates } from '../data/prompts';

interface PromptState {
  // Data
  templates: PromptTemplate[];

  // Selection & editing
  selectedId: number | null;
  variableValues: Record<number, Record<string, string>>; // per-template overrides

  // UI mode
  mode: 'library' | 'series' | 'edit-existing';

  // Series builder — supports base template ids (number) and custom template ids (string like "custom-123")
  // This connects the CMS custom templates directly into production series/carousels.
  series: (number | string)[];
  // Per-slide production notes (keyed by the same id used in series). Private to this session/pack.
  seriesNotes: Record<string, string>;

  // Edit-existing mode state
  preserveText: string;
  changeText: string;

  // Structured 6-part edits (per template) — this is the powerful "prompt CMS" layer
  structuredEdits: Record<number, {
    subject: string;
    useCase: string;
    layout: string;
    color: string;
    typography: string;
    style: string;
    onImageText: string;
  }>;

  // User-created custom templates (the CMS part)
  customTemplates: Array<{
    id: string;
    name: string;
    baseTemplateId: number | null;
    structured: {
      subject: string;
      useCase: string;
      layout: string;
      color: string;
      typography: string;
      style: string;
      onImageText: string;
    };
    createdAt: string;
  }>;

  // Selection for custom templates (separate from base template IDs)
  selectedCustomId: string | null;

  // Saved series packs (collections) — high-value for real production workflows (multiple carousels in flight)
  savedPacks: Array<{
    id: string;
    name: string;
    series: (number | string)[];
    seriesNotes: Record<string, string>;
    createdAt: string;
  }>;

  // Image generation foundation — now with local visual assets (PNG data URLs from the live structured preview).
  // This gives immediate "actually produce and keep the graphic" value without requiring any external model.
  // When real AI image generation is plugged in later, the same shape can hold real images.
  lastGenerated: {
    prompt: string;
    templateId: number | null;
    source: 'variables' | 'structured' | 'edit';
    at: string;
    imageDataUrl?: string;
  } | null;
  generations: Array<{
    id: string;
    prompt: string;
    templateId: number | null;
    source: 'variables' | 'structured' | 'edit';
    at: string;
    imageDataUrl?: string; // local PNG of the visual that was produced for this prompt
  }>;

  recordGeneration: (prompt: string, templateId: number | null, source: 'variables' | 'structured' | 'edit', imageDataUrl?: string) => void;

  // Actions
  selectTemplate: (id: number) => void;
  setVariableValue: (templateId: number, key: string, value: string) => void;
  resetVariables: (templateId: number) => void;

  setMode: (mode: 'library' | 'series' | 'edit-existing') => void;

  addToSeries: (id: number | string) => void;
  removeFromSeries: (id: number | string) => void;
  reorderSeries: (from: number, to: number) => void;
  setSeries: (newSeries: (number | string)[]) => void;
  clearSeries: () => void;

  // High-value series consistency + notes (makes the builder "really satisfying" for production carousels)
  lockStyleFromFirst: () => void; // copies color/typography/style from first slide to all others (structured)
  setSeriesNote: (id: number | string, note: string) => void;

  setPreserveText: (text: string) => void;
  setChangeText: (text: string) => void;

  // Structured editor actions (first-class, powers the deep editor + series export)
  setStructuredEdit: (templateId: number, field: keyof PromptState['structuredEdits'][number], value: string) => void;
  resetStructuredEdit: (templateId: number) => void;

  // Custom template CMS actions
  selectCustomTemplate: (id: string) => void;
  saveAsCustomTemplate: (name: string, baseTemplateId: number | null, structured: PromptState['customTemplates'][number]['structured']) => void;
  deleteCustomTemplate: (id: string) => void;
  renameCustomTemplate: (id: string, newName: string) => void;
  duplicateCustomTemplate: (id: string) => void;

  // Apply current inspector structured values across the live series (powerful CMS → production consistency)
  applyCurrentStructuredToSeries: () => void;

  // Saved packs / collections (multiple named series you can switch between)
  saveCurrentSeriesAsPack: (name: string) => void;
  loadSavedPack: (id: string) => void;
  deleteSavedPack: (id: string) => void;

  // Optional real AI image generation (bring your own key, pluggable, results land in the exact same history as local assets)
  ai: {
    provider: 'openai' | 'none';
    openaiApiKey?: string;
    model?: string; // e.g. 'gpt-image-1' or 'dall-e-3'
  };
  setAiConfig: (partial: Partial<PromptState['ai']>) => void;
  clearAiKey: () => void;

  // Promoted real example images for the library grid.
  // Allows users to take a high-quality PNG they generated (local or via their own AI key)
  // and make it the canonical visual shown for that template/custom in the browse grid.
  // Key: for base templates use the numeric id as string (e.g. "6"), for customs use the custom id (e.g. "custom-xxx").
  templateExampleOverrides: Record<string, string>;
  setTemplateExampleOverride: (key: string, dataUrl: string) => void;
  clearTemplateExampleOverride: (key: string) => void;

  // High-level action: take the current assembled prompt and (if configured) call a real model.
  // Always records via recordGeneration so the result appears in "Latest" + history with full actions.
  generateRealImage: (prompt: string, templateId: number | null, source: 'variables' | 'structured' | 'edit') => Promise<void>;

  // Full workspace portability — export / import everything so the app is truly usable "on any box".
  // Includes: custom templates (your CMS recipes), saved series packs, full generation history (with embedded images), current series + notes, and AI config (without the raw key for safety).
  exportWorkspace: () => string; // returns a JSON string the user can save
  importWorkspace: (jsonString: string, options?: { merge?: boolean }) => { success: boolean; message: string };
}

export const usePromptStore = create<PromptState>((set, get) => ({
  templates: promptTemplates,
  selectedId: 1, // start with the first one selected
  selectedCustomId: null,
  variableValues: {},
  mode: 'library',
  series: [],
  seriesNotes: {},
  preserveText: '',
  changeText: '',
  structuredEdits: {},
  customTemplates: [],
  savedPacks: [],
  lastGenerated: null,
  generations: [],

  // AI is off by default. When the user adds a key it becomes a first-class (but optional) path.
  ai: { provider: 'none', openaiApiKey: undefined, model: 'gpt-image-1' },

  templateExampleOverrides: {},

  selectTemplate: (id) => set({ selectedId: id }),

  setVariableValue: (templateId, key, value) =>
    set((state) => ({
      variableValues: {
        ...state.variableValues,
        [templateId]: {
          ...(state.variableValues[templateId] || {}),
          [key]: value,
        },
      },
    })),

  resetVariables: (templateId) =>
    set((state) => {
      const next = { ...state.variableValues };
      delete next[templateId];
      return { variableValues: next };
    }),

  setMode: (mode) => set({ mode }),

  addToSeries: (id) =>
    set((state) => {
      if (state.series.includes(id as any)) return {};
      return { series: [...state.series, id as any] };
    }),

  removeFromSeries: (id) =>
    set((state) => {
      const idStr = String(id);
      const nextNotes = { ...state.seriesNotes };
      delete nextNotes[idStr];
      return {
        series: state.series.filter((s) => String(s) !== idStr),
        seriesNotes: nextNotes,
      };
    }),

  reorderSeries: (from, to) =>
    set((state) => {
      const arr = [...state.series];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return { series: arr };
    }),

  clearSeries: () => set({ series: [], seriesNotes: {} }),

  // === Series consistency lock (the "lock style from first/cover" feature) ===
  // This is one of the explicitly called-out high-value behaviors for reliable IG carousels.
  lockStyleFromFirst: () =>
    set((state) => {
      if (state.series.length < 2) return {};

      const firstId = state.series[0];
      // Resolve the reference structured for the first slide (custom or base)
      let refStructured: any = null;
      if (typeof firstId === 'string' && firstId.startsWith('custom-')) {
        const customKey = `custom:${firstId}` as any;
        refStructured = state.structuredEdits[customKey] || state.customTemplates.find((c) => c.id === firstId)?.structured;
      } else {
        refStructured = state.structuredEdits[firstId as number] || null;
      }
      if (!refStructured) return {}; // nothing to lock from

      const nextEdits = { ...state.structuredEdits };

      state.series.forEach((sid, idx) => {
        if (idx === 0) return; // leave the reference alone

        const targetKey: any = (typeof sid === 'string' && sid.startsWith('custom-')) ? `custom:${sid}` : sid;
        const current = nextEdits[targetKey] || { subject: '', useCase: '', layout: '', color: '', typography: '', style: '', onImageText: '' };

        nextEdits[targetKey] = {
          ...current,
          color: refStructured.color ?? current.color,
          typography: refStructured.typography ?? current.typography,
          style: refStructured.style ?? current.style,
        };
      });

      return { structuredEdits: nextEdits };
    }),

  setSeriesNote: (id, note) =>
    set((state) => ({
      seriesNotes: {
        ...state.seriesNotes,
        [String(id)]: note,
      },
    })),

  setPreserveText: (text) => set({ preserveText: text }),
  setChangeText: (text) => set({ changeText: text }),

  setSeries: (newSeries) => set({ series: newSeries }),

  setStructuredEdit: (templateId, field, value) =>
    set((state) => ({
      structuredEdits: {
        ...state.structuredEdits,
        [templateId]: {
          ...(state.structuredEdits[templateId] || {
            subject: '', useCase: '', layout: '', color: '', typography: '', style: '', onImageText: '',
          }),
          [field]: value,
        },
      },
    })),

  resetStructuredEdit: (templateId) =>
    set((state) => {
      const next = { ...state.structuredEdits };
      delete next[templateId];
      return { structuredEdits: next };
    }),

  // Custom template selection + CMS actions (single definition)
  selectCustomTemplate: (id: string) =>
    set((state) => {
      const custom = state.customTemplates.find((c) => c.id === id);
      if (!custom) return {};

      const customKey = `custom:${id}` as any;

      return {
        selectedCustomId: id,
        selectedId: null,
        structuredEdits: {
          ...state.structuredEdits,
          [customKey]: { ...custom.structured },
        },
      };
    }),

  saveAsCustomTemplate: (name: string, baseTemplateId: number | null, structured: PromptState['structuredEdits'][number]) => {
    const newTemplate = {
      id: `custom-${Date.now()}`,
      name: name || 'Untitled custom template',
      baseTemplateId,
      structured,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      customTemplates: [...state.customTemplates, newTemplate],
    }));
  },

  deleteCustomTemplate: (id: string) =>
    set((state) => ({
      customTemplates: state.customTemplates.filter((t) => t.id !== id),
      selectedCustomId: state.selectedCustomId === id ? null : state.selectedCustomId,
    })),

  renameCustomTemplate: (id, newName) =>
    set((state) => ({
      customTemplates: state.customTemplates.map((c) =>
        c.id === id ? { ...c, name: newName.trim() || c.name } : c
      ),
    })),

  duplicateCustomTemplate: (id) =>
    set((state) => {
      const original = state.customTemplates.find((c) => c.id === id);
      if (!original) return {};
      const liveKey = `custom:${id}` as any;
      const liveStructured = state.structuredEdits[liveKey] || original.structured;
      const newId = `custom-${Date.now()}`;
      const copy = {
        id: newId,
        name: `${original.name} (copy)`,
        baseTemplateId: original.baseTemplateId,
        structured: { ...liveStructured },
        createdAt: new Date().toISOString(),
      };
      const customKey = `custom:${newId}` as any;
      return {
        customTemplates: [...state.customTemplates, copy],
        // Immediately make the duplicate the active custom so the user sees the result of their action
        selectedCustomId: newId,
        selectedId: null,
        structuredEdits: {
          ...state.structuredEdits,
          [customKey]: { ...liveStructured },
        },
      };
    }),

  // Apply the currently inspected structured values (custom or base) to every slide in the live series.
  // This is a killer "CMS power move": refine one, propagate to the whole carousel in one click.
  applyCurrentStructuredToSeries: () =>
    set((state) => {
      if (state.series.length === 0) return {};
      const isCustom = !!state.selectedCustomId;
      let sourceStructured: any = null;

      if (isCustom && state.selectedCustomId) {
        const liveKey = `custom:${state.selectedCustomId}` as any;
        sourceStructured = state.structuredEdits[liveKey] ||
          state.customTemplates.find((c) => c.id === state.selectedCustomId)?.structured;
      } else if (state.selectedId != null) {
        sourceStructured = state.structuredEdits[state.selectedId] || null;
      }

      if (!sourceStructured) return {};

      const nextEdits = { ...state.structuredEdits };

      state.series.forEach((sid) => {
        const key: any = (typeof sid === 'string' && sid.startsWith('custom-')) ? `custom:${sid}` : sid;
        const current = nextEdits[key] || {
          subject: '', useCase: '', layout: '', color: '', typography: '', style: '', onImageText: '',
        };
        nextEdits[key] = { ...current, ...sourceStructured };
      });

      return { structuredEdits: nextEdits };
    }),

  // Saved packs (collections of series)
  saveCurrentSeriesAsPack: (name) => {
    if (name.trim().length === 0) return;
    set((state) => {
      const pack = {
        id: `pack-${Date.now()}`,
        name: name.trim(),
        series: [...state.series],
        seriesNotes: { ...state.seriesNotes },
        createdAt: new Date().toISOString(),
      };
      return { savedPacks: [...state.savedPacks, pack] };
    });
  },

  loadSavedPack: (id) =>
    set((state) => {
      const pack = state.savedPacks.find((p) => p.id === id);
      if (!pack) return {};
      return {
        series: [...pack.series],
        seriesNotes: { ...pack.seriesNotes },
        // Do not auto-clear selection; user can click items in the strip to inspect
      };
    }),

  deleteSavedPack: (id) =>
    set((state) => ({
      savedPacks: state.savedPacks.filter((p) => p.id !== id),
    })),

  // Generation action — now records the prompt + an optional local visual (PNG data URL produced from the live structured preview).
  // This turns "Generate preview" into a real local asset workflow: you get the exact prompt you can paste anywhere + a matching visual you can keep/download.
  recordGeneration: (prompt: string, templateId: number | null, source: 'variables' | 'structured' | 'edit', imageDataUrl?: string) => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      prompt,
      templateId,
      source,
      at: new Date().toISOString(),
      imageDataUrl,
    };
    set((state) => ({
      lastGenerated: {
        prompt,
        templateId,
        source,
        at: entry.at,
        imageDataUrl,
      },
      generations: [entry, ...state.generations].slice(0, 30),
    }));
  },

  // AI config (local only)
  setAiConfig: (partial) =>
    set((state) => ({
      ai: { ...state.ai, ...partial },
    })),

  clearAiKey: () =>
    set((state) => ({
      ai: { ...state.ai, openaiApiKey: undefined, provider: 'none' },
    })),

  setTemplateExampleOverride: (key, dataUrl) =>
    set((state) => ({
      templateExampleOverrides: {
        ...state.templateExampleOverrides,
        [key]: dataUrl,
      },
    })),

  clearTemplateExampleOverride: (key) =>
    set((state) => {
      const next = { ...state.templateExampleOverrides };
      delete next[key];
      return { templateExampleOverrides: next };
    }),

  // The money action for real AI image generation.
  //
  // Two paths (this is the key UX decision for "internal/shared AI vs user key"):
  // - If the user has pasted their own OpenAI key → we call OpenAI directly from the browser (private, uses *their* quota/billing, no limits from us).
  // - If no personal key → we call our serverless proxy /api/generate-image (uses a key we control on Vercel).
  //   This is what lets casual users experience "it just works" without pasting anything.
  //
  // Future iterations will need proper quotas, auth, and cost controls on the hosted path.
  // For now this gives us the "what would a normal person experience?" demo the user asked for.
  generateRealImage: async (prompt, templateId, source) => {
    const state = usePromptStore.getState();
    const key = state.ai.openaiApiKey;

    // Pick a reasonable size based on the template (helps carousels and tall graphics look better).
    let size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024';
    if (templateId != null) {
      const tmpl = state.templates.find((t) => t.id === templateId);
      if (tmpl) {
        if (tmpl.aspect_ratio === '16:9' || tmpl.aspect_ratio === '3:2') size = '1792x1024';
        else if (tmpl.aspect_ratio === '9:16' || tmpl.aspect_ratio === '2:3' || tmpl.aspect_ratio === '3:4') size = '1024x1792';
      }
    }

    const model = state.ai.model || 'gpt-image-1';

    if (key) {
      // === Path A: User's own key (private, unlimited from our perspective) ===
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          prompt,
          n: 1,
          size,
          response_format: 'url',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        const message = err?.error?.message || `OpenAI error ${res.status}`;
        throw new Error(message);
      }

      const data = await res.json();
      const url: string | undefined = data?.data?.[0]?.url;
      if (!url) throw new Error('No image returned from the model');

      const imgRes = await fetch(url);
      const blob = await imgRes.blob();
      const imageDataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      state.recordGeneration(prompt, templateId, source, imageDataUrl);
      return;
    }

    // === Path B: No personal key → use our hosted / internal AI (the "what a normal user would experience") ===
    // This calls the Vercel serverless function which holds OPENAI_API_KEY in the environment.
    // The key never leaves the server. The user gets a real generated image with zero setup.
    const hostedRes = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, size, model }),
    });

    if (!hostedRes.ok) {
      const err = await hostedRes.json().catch(() => ({} as any));
      throw new Error(err?.error || `Hosted AI error ${hostedRes.status}`);
    }

    const hostedData = await hostedRes.json();
    const imageDataUrl: string | undefined = hostedData?.imageDataUrl;

    if (!imageDataUrl) {
      throw new Error('Hosted AI did not return an image');
    }

    // Record exactly like a personal-key or local generation so the rest of the app (Latest, history, promote-to-library, etc.) works unchanged.
    state.recordGeneration(prompt, templateId, source, imageDataUrl);
  },

  // === Workspace export / import (the "take my entire prompt CMS to any other computer" feature) ===
  exportWorkspace: (): string => {
    const state = get();
    const payload = {
      type: 'deckmint-workspace',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        customTemplates: state.customTemplates,
        structuredEdits: state.structuredEdits,
        savedPacks: state.savedPacks,
        generations: state.generations,
        series: state.series,
        seriesNotes: state.seriesNotes,
        // We intentionally do NOT export the raw OpenAI key for safety.
        // We do export the provider + model choice so the receiving side knows the preference.
        ai: { provider: state.ai.provider, model: state.ai.model },
        // Promoted real example images chosen by the user for the library grid.
        templateExampleOverrides: state.templateExampleOverrides,
      },
    };
    return JSON.stringify(payload, null, 2);
  },

  importWorkspace: (jsonString, options = { merge: true }) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || parsed.type !== 'deckmint-workspace' || !parsed.data) {
        return { success: false, message: 'Not a valid DeckMint workspace file.' };
      }

      const { data } = parsed;
      const merge = options.merge !== false;

      set((state) => {
        const next: any = {};

        // Customs
        if (Array.isArray(data.customTemplates)) {
          next.customTemplates = merge
            ? [...state.customTemplates, ...data.customTemplates.filter((c: any) => !state.customTemplates.some((existing) => existing.id === c.id))]
            : data.customTemplates;
        }

        // Structured edits (deep merge is friendly)
        if (data.structuredEdits && typeof data.structuredEdits === 'object') {
          next.structuredEdits = merge
            ? { ...state.structuredEdits, ...data.structuredEdits }
            : data.structuredEdits;
        }

        // Saved packs
        if (Array.isArray(data.savedPacks)) {
          next.savedPacks = merge
            ? [...state.savedPacks, ...data.savedPacks.filter((p: any) => !state.savedPacks.some((existing) => existing.id === p.id))]
            : data.savedPacks;
        }

        // Generations (keep newest first, dedupe by id)
        if (Array.isArray(data.generations)) {
          const existingIds = new Set(state.generations.map((g) => g.id));
          const incoming = data.generations.filter((g: any) => !existingIds.has(g.id));
          next.generations = merge ? [...incoming, ...state.generations] : data.generations;
          if (next.generations.length > 0) next.lastGenerated = next.generations[0];
        }

        // Current series + notes (usually you want to load the last working state)
        if (Array.isArray(data.series)) next.series = data.series;
        if (data.seriesNotes && typeof data.seriesNotes === 'object') next.seriesNotes = { ...(merge ? state.seriesNotes : {}), ...data.seriesNotes };

        // AI preference (not the key)
        if (data.ai) {
          next.ai = {
            ...state.ai,
            provider: data.ai.provider || state.ai.provider,
            model: data.ai.model || state.ai.model,
          };
        }

        // Promoted library example images
        if (data.templateExampleOverrides && typeof data.templateExampleOverrides === 'object') {
          next.templateExampleOverrides = merge
            ? { ...state.templateExampleOverrides, ...data.templateExampleOverrides }
            : data.templateExampleOverrides;
        }

        return next;
      });

      return { success: true, message: merge ? 'Workspace merged successfully.' : 'Workspace imported (replaced current data).' };
    } catch (e: any) {
      return { success: false, message: 'Failed to parse workspace file: ' + (e?.message || 'unknown error') };
    }
  },
}));

// Helper to get the effective values for a template (defaults + user overrides)
export function getEffectiveValues(template: PromptTemplate, overrides: Record<string, string>) {
  return { ...template.defaults, ...overrides };
}

// Simple but robust variable replacement
export function generatePrompt(template: PromptTemplate, values: Record<string, string>): string {
  let prompt = template.base_prompt;

  // Replace all [key] with the value (case-sensitive on our keys)
  Object.entries(values).forEach(([key, val]) => {
    const token = `[${key}]`;
    // Escape special regex chars in value? For now simple global replace is fine because we control the templates
    prompt = prompt.split(token).join(val);
  });

  return prompt;
}

// Build the preserve / change edit instruction
export function buildEditInstruction(preserve: string, change: string): string {
  const p = preserve.trim();
  const c = change.trim();
  if (!p && !c) return '';
  let out = 'Edit the existing image with the following instructions.\n\n';
  if (p) out += `Please preserve: ${p}.\n\n`;
  if (c) out += `Please change: ${c}.\n`;
  out += '\nKeep all other visual qualities (layout, typography style, color palette, composition) identical unless explicitly listed in the change instructions.';
  return out.trim();
}

// === Structured prompt builder (the heart of the "prompt CMS") ===
export function buildStructuredPrompt(
  template: PromptTemplate,
  edits: PromptState['structuredEdits'][number] | undefined
): string {
  const e = edits || {
    subject: template.name,
    useCase: template.use_case,
    layout: template.layout,
    color: template.color,
    typography: template.typography,
    style: template.style,
    onImageText: template.on_image_text_structure.join('\n'),
  };

  const lines = [
    `Create a ${template.aspect_ratio} ${template.visual_type.replace(/-/g, ' ')} visual.`,
    '',
    `Subject: ${e.subject}`,
    `Use case: ${e.useCase}`,
    '',
    `Layout & zones: ${e.layout}`,
    `Color & palette: ${e.color}`,
    `Typography: ${e.typography}`,
    `Style & treatment: ${e.style}`,
    '',
    'On-image text — render these strings EXACTLY, with no additions, omissions, or rephrasing:',
  ];

  const textLines = e.onImageText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `• ${l}`);

  if (textLines.length > 0) {
    lines.push(...textLines);
  } else {
    lines.push('• (no explicit on-image strings provided — model should infer clean hierarchy only)');
  }

  lines.push(
    '',
    'Production requirements — NON-NEGOTIABLE (models frequently fail these):',
    '- Every single on-image string listed above must appear in the image VERBATIM — exact spelling, capitalization, punctuation, and line breaks. DO NOT add, remove, rephrase, translate, quote, or "improve" any of them.',
    '- Count the specified strings. The final image must contain exactly that many distinct text elements (plus any minimal supporting hierarchy the layout requires). No extra sentences, no decorative text, no model-invented labels.',
    '- All text must be fully contained inside its designated zone with comfortable internal padding (at least ~8-12% of the zone). Zero text overflow, cutoff at edges, or running into other elements.',
    '- Text must remain highly legible when the entire image is viewed at small social sizes (feed thumbnails, mobile). Use high contrast and avoid thin weights for critical numbers/labels.',
    '- Strictly follow the Layout & zones description for proportions, ordering, alignment, and spacing. Do not "creatively reinterpret" the composition.',
    '- Crisp vector-sharp text rendering. No blurry, aliased, or low-contrast text.',
  );

  if (template.consistency_guidance) {
    lines.push('', `SERIES CONSISTENCY (MANDATORY for carousels): ${template.consistency_guidance} If generating any slide in this series, you must use the exact same background color, accent colors, font families, type scale/weights, margin system, and overall visual density as the cover slide.`);
  } else {
    lines.push('', 'If this is part of a multi-slide series or carousel, use identical color palette, typography system, margin rhythm, and density as sibling slides. Visual continuity is required.');
  }

  lines.push(
    '',
    'FINAL MODEL INSTRUCTION (read this twice):',
    'This is a production-grade prompt for text-heavy, layout-precise graphics (knowledge cards, carousels, data visualizations, infographics). The listed on-image strings are sacred. Prioritize perfect verbatim text fidelity, correct proportions, and clean professional execution over artistic flair. If there is any conflict between "making it look nice" and "rendering the specified text exactly as written in the specified zones", choose exact text rendering.',
    'After generating, mentally verify: (1) Are all the bullet-listed strings present and identical? (2) Is the layout proportional to the description? (3) Is every piece of text fully inside bounds with breathing room?'
  );

  return lines.join('\n');
}

// Enhanced series pack exporter — supports base templates + custom CMS templates,
// prefers live structured edits, and includes per-slide notes.
// This is the "production ready pack" for carousels and multi-slide sets.
export function buildSeriesPack(
  series: (number | string)[],
  templates: PromptTemplate[],
  variableValues: Record<number, Record<string, string>>,
  structuredEdits: PromptState['structuredEdits'],
  customTemplates: PromptState['customTemplates'],
  seriesNotes: Record<string, string>
) {
  return series.map((sid, index) => {
    const idStr = String(sid);
    const isCustom = idStr.startsWith('custom-');
    let name: string;
    let aspect_ratio = '4:5';
    let prompt: string;
    let source: 'structured' | 'variables' | 'custom-structured' = 'variables';

    if (isCustom) {
      const custom = customTemplates.find((c) => c.id === idStr);
      const liveKey = `custom:${idStr}` as any;
      const live = structuredEdits[liveKey];
      const baseStruct = custom?.structured || { subject: '', useCase: '', layout: '', color: '', typography: '', style: '', onImageText: '' };
      const effective = live || baseStruct;

      name = custom?.name || 'Custom template';
      // Prefer base template's aspect if we have a base link
      const baseT = custom?.baseTemplateId ? templates.find((tt) => tt.id === custom.baseTemplateId) : null;
      aspect_ratio = baseT?.aspect_ratio || '4:5';

      // For customs we always treat as structured (the whole point of the CMS)
      prompt = buildStructuredPrompt(
        baseT || (templates[0] as any),
        effective as any
      );
      source = 'custom-structured';
    } else {
      const numId = Number(sid);
      const t = templates.find((tt) => tt.id === numId)!;
      const hasStructured = !!structuredEdits[numId];
      prompt = hasStructured
        ? buildStructuredPrompt(t, structuredEdits[numId])
        : generatePrompt(t, getEffectiveValues(t, variableValues[numId] || {}));
      name = t.name;
      aspect_ratio = t.aspect_ratio;
      source = hasStructured ? 'structured' : 'variables';
    }

    return {
      order: index + 1,
      id: sid,
      name,
      source,
      aspect_ratio,
      prompt,
      note: seriesNotes[idStr] || '',
    };
  });
}

// === Local visual export — turns the live structured preview into a real PNG you can keep ===
// This is the "actually produce the graphic" piece for the current no-AI-required workflow.
// It uses the same heuristics as LiveStructuredPreview so the exported asset matches what the user saw while editing.
export async function renderStructuredPreviewToDataUrl(
  structured: {
    subject: string;
    useCase: string;
    layout: string;
    color: string;
    typography: string;
    style: string;
    onImageText: string;
  },
  template: PromptTemplate,
  width = 1200
): Promise<string> {
  const aspect = template.aspect_ratio || '4:5';
  const height = Math.round(width / (parseFloat(aspect) || 0.8));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: true })!;

  const colorStr = (structured.color || template.color || '').toLowerCase();

  const bg =
    /black|charcoal|dark slate|deep navy|midnight/i.test(colorStr) ? '#0f1115' :
    /cream|warm off.white|warm white|ivory|paper|beige/i.test(colorStr) ? '#f8f5ef' :
    /white|light grey|soft white|clean white/i.test(colorStr) ? '#fafafa' :
    /slate|cool grey|stone/i.test(colorStr) ? '#f1f5f9' :
    '#f4f4f6';

  const accent =
    /#([0-9a-f]{3,6})/i.exec(structured.color || '')?.[0] ||
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

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const layout = (structured.layout || template.layout || '').toLowerCase();
  const isGrid = /grid|3.?col|2.?col|columns|matrix/i.test(layout);
  const isSplit = /split|two.?column|left.?right|side.?by.?side/i.test(layout);
  const isTimeline = /timeline|steps|vertical flow|numbered/i.test(layout);

  const typo = (structured.typography || template.typography || '').toLowerCase();
  const isSerif = /serif|editorial|classic|garamond|playfair/i.test(typo);
  const isBold = /bold|heavy|black|extrabold/i.test(typo);

  const subject = (structured.subject || template.name || '').trim();
  const textLines = (structured.onImageText || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .slice(0, 6);

  const headline = subject || (textLines[0] ?? 'Your subject');

  const margin = Math.round(width * 0.06);
  const accentAlpha = '22';

  // Density / map mode detection (same logic as the live preview for consistency)
  const layoutLower = (structured.layout || template.layout || '').toLowerCase();
  const isDensityMap = /map|choropleth|density|by state|geographic|regional|us map|united states|states shaded|fill by/i.test(layoutLower) ||
                       /density|choropleth|map of/i.test(subject.toLowerCase());

  if (isDensityMap) {
    // Stylized density map export: 5 labeled tiles with intensity shading (derived from onImageText, or placeholder tiles).
    ctx.fillStyle = accent;
    ctx.font = `${isBold ? '700' : '600'} ${Math.round(width * 0.032)}px ${isSerif ? 'Georgia, serif' : 'system-ui, sans-serif'}`;
    ctx.fillText(headline, margin, margin + Math.round(width * 0.04));

    const entries = textLines.length > 0
      ? textLines.map(l => {
          const m = /(\d+)%/.exec(l);
          const pct = m ? parseInt(m[1], 10) : 35;
          const lbl = (l.split(/[-—:]/)[0] || '').trim().slice(0, 14);
          return { label: lbl || 'State', pct };
        })
      : [
          { label: 'Region A', pct: 48 },
          { label: 'Region B', pct: 37 },
          { label: 'Region C', pct: 31 },
          { label: 'Region D', pct: 25 },
          { label: 'Region E', pct: 18 },
        ];

    const maxP = Math.max(...entries.map(e => e.pct), 50);
    const tileW = Math.floor((width - margin * 2 - 24) / 5);
    const startY = margin + Math.round(width * 0.08);
    const tileH = Math.round(height * 0.48);

    entries.slice(0, 5).forEach((e, i) => {
      const x = margin + i * (tileW + 6);
      const intensity = Math.max(0.18, Math.min(0.9, e.pct / maxP));
      ctx.fillStyle = `rgba(${parseInt(accent.slice(1,3),16)},${parseInt(accent.slice(3,5),16)},${parseInt(accent.slice(5,7),16)},${intensity})`;
      ctx.fillRect(x, startY, tileW, tileH);

      // border
      ctx.strokeStyle = accent + '66';
      ctx.lineWidth = Math.max(1, Math.round(width * 0.003));
      ctx.strokeRect(x, startY, tileW, tileH);

      // big %
      ctx.fillStyle = textColor;
      ctx.font = `700 ${Math.round(width * 0.028)}px system-ui, sans-serif`;
      ctx.fillText(`${e.pct}%`, x + 6, startY + Math.round(tileH * 0.42));

      // state label
      ctx.font = `500 ${Math.round(width * 0.015)}px system-ui, sans-serif`;
      ctx.fillText(e.label, x + 6, startY + Math.round(tileH * 0.72));
    });

    // Footer source / legend
    ctx.fillStyle = textColor;
    ctx.font = `500 ${Math.round(width * 0.014)}px system-ui, sans-serif`;
    const sourceLine = textLines.find(l => /source/i.test(l)) || 'Shading = relative density';
    ctx.fillText(sourceLine, margin, height - margin * 0.55);

    return canvas.toDataURL('image/png');
  }

  if (isGrid) {
    // Top headline
    ctx.fillStyle = accent;
    ctx.font = `${isBold ? '700' : '600'} ${Math.round(width * 0.042)}px ${isSerif ? 'Georgia, serif' : 'system-ui, sans-serif'}`;
    ctx.fillText(headline, margin, margin + Math.round(width * 0.05));

    // 3 column grid
    const colW = Math.floor((width - margin * 2 - 20) / 3);
    const startY = margin + Math.round(width * 0.12);
    for (let i = 0; i < 3; i++) {
      const x = margin + i * (colW + 10);
      ctx.fillStyle = accent + accentAlpha;
      ctx.fillRect(x, startY, colW, Math.round(height * 0.55));
      ctx.fillStyle = textColor;
      ctx.font = `500 ${Math.round(width * 0.018)}px system-ui, sans-serif`;
      const line = textLines[i + 1] || '• detail';
      ctx.fillText(line, x + 12, startY + 28);
    }
  } else if (isSplit) {
    ctx.fillStyle = textColor;
    ctx.font = `${isBold ? '700' : '600'} ${Math.round(width * 0.05)}px ${isSerif ? 'Georgia, serif' : 'system-ui, sans-serif'}`;
    ctx.fillText(headline, margin, margin + Math.round(width * 0.06));

    // Left accent band + right content
    ctx.fillStyle = accent + '18';
    ctx.fillRect(margin, margin + Math.round(width * 0.14), Math.round(width * 0.38), height - margin * 2 - Math.round(width * 0.14));

    ctx.fillStyle = textColor;
    ctx.font = `500 ${Math.round(width * 0.022)}px system-ui, sans-serif`;
    textLines.slice(2, 5).forEach((l, i) => {
      ctx.fillText(l, margin + Math.round(width * 0.42), margin + Math.round(width * 0.22) + i * Math.round(width * 0.05));
    });
  } else if (isTimeline) {
    ctx.fillStyle = accent;
    ctx.font = `${isBold ? '700' : '600'} ${Math.round(width * 0.04)}px ${isSerif ? 'Georgia, serif' : 'system-ui, sans-serif'}`;
    ctx.fillText(headline, margin, margin + Math.round(width * 0.05));

    const startY = margin + Math.round(width * 0.14);
    for (let i = 0; i < 4; i++) {
      const y = startY + i * Math.round(width * 0.12);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(margin + 14, y + 8, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = textColor;
      ctx.font = `500 ${Math.round(width * 0.022)}px system-ui, sans-serif`;
      ctx.fillText(textLines[i] || (i === 0 ? 'Step one' : 'Next step'), margin + 40, y + 14);
    }
  } else {
    // Hero / default treatment
    const heroH = Math.round(height * 0.38);
    ctx.fillStyle = accent + '18';
    ctx.fillRect(0, 0, width, heroH);

    ctx.fillStyle = accent;
    ctx.font = `${isBold ? '700' : '600'} ${Math.round(width * 0.048)}px ${isSerif ? 'Georgia, serif' : 'system-ui, sans-serif'}`;
    ctx.textAlign = 'center';
    ctx.fillText(headline, width / 2, Math.round(heroH * 0.55));

    ctx.textAlign = 'left';
    ctx.fillStyle = textColor;
    ctx.font = `500 ${Math.round(width * 0.024)}px system-ui, sans-serif`;

    const bodyStart = heroH + Math.round(width * 0.06);
    textLines.slice(0, 3).forEach((line, idx) => {
      ctx.fillText(line, margin, bodyStart + idx * Math.round(width * 0.045));
    });
  }

  // Small footer strip with use case
  ctx.fillStyle = accent + '30';
  ctx.fillRect(0, height - Math.round(height * 0.09), width, Math.round(height * 0.09));
  ctx.fillStyle = textColor;
  ctx.font = `500 ${Math.round(width * 0.018)}px system-ui, sans-serif`;
  ctx.fillText(structured.useCase || template.use_case || '', margin, height - Math.round(height * 0.035));

  return canvas.toDataURL('image/png');
}

// Convenience wrapper that also returns the prompt used (for one-shot "generate + asset" flows)
export async function generateLocalVisualAsset(
  prompt: string,
  structured: any,
  template: PromptTemplate
): Promise<{ prompt: string; imageDataUrl: string }> {
  const imageDataUrl = await renderStructuredPreviewToDataUrl(structured, template, 1280);
  return { prompt, imageDataUrl };
}
