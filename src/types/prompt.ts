export type AspectRatio = "1:1" | "4:5" | "16:9" | "3:4" | "A4" | string;

export type VisualType =
  | "knowledge-card"
  | "cheatsheet"
  | "comparison-card"
  | "step-card"
  | "contrast-card"
  | "data-card"
  | "carousel-cover"
  | "carousel-interior"
  | "carousel-closing"
  | "blog-hero"
  | "infographic"
  | "mockup"
  | "before-after"
  | "quote-card"
  | "planner"
  | "recipe"
  | "itinerary";

export interface PromptVariable {
  key: string;
  label: string;
  example: string;
  inputType?: "text" | "textarea";
  help?: string;
}

export interface StructuredParts {
  subject: string;
  useCase: string;
  layout: string;
  color: string;
  typography: string;
  style: string;
  onImageText: string; // human-readable labeled list of exact strings
}

export interface PromptTemplate {
  id: number;
  category: string;
  name: string;
  summary: string;
  use_case: string;
  platforms: string[];
  aspect_ratio: AspectRatio;
  layout: string;
  color: string;
  typography: string;
  style: string;
  on_image_text_structure: string[];
  variables: PromptVariable[];
  defaults: Record<string, string>;
  base_prompt: string;        // Honed, production-ready template with [var] placeholders
  original_prompt: string;    // Exact wording from source article for reference
  visual_type: VisualType;
  thumbnail_visual: string;   // Rich description used to drive visual mock + future image gen seed
  series_role?: "cover" | "interior" | "closing" | "standalone";
  consistency_guidance?: string;
  tags: string[];

  // Model-specific tuning notes (for power users who will paste the final prompt into different image models)
  // These are not auto-injected into the prompt by default (to keep it model-agnostic), but are shown in the UI
  // and can be used to create alternate base_prompt variants if needed.
  model_tuning?: {
    general?: string;   // Advice that applies to most strong models (Flux, Grok Images, SD3, etc.)
    flux?: string;      // Specific tips for Flux / Black Forest Labs models
    grok?: string;      // Specific tips for Grok / xAI image models
    openai?: string;    // Specific tips for gpt-image-1 / DALL·E family
  };
}

export const CATEGORIES = [
  "IG Knowledge Cards",
  "IG Carousels",
  "Article Covers / Blog Heroes",
  "Infographics",
  "Product & Service Mockups",
  "Before / After Comparisons",
  "Quote Cards",
  "Other High-Traffic Scenarios",
] as const;

export type Category = (typeof CATEGORIES)[number];
