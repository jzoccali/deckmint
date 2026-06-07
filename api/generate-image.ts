import type { VercelRequest, VercelResponse } from '@vercel/node';

// This is a serverless function that runs on Vercel.
// It holds the real API key in process.env.OPENAI_API_KEY (never exposed to the browser).
// This lets us offer a "just works" hosted generation experience for casual users / library seeding,
// while still supporting full BYOK (bring your own key) for power users who want unlimited + private calls.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { prompt, size = '1024x1024', model = 'gpt-image-1' } = req.body || {};

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Missing prompt' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ 
      error: 'Hosted AI is not configured on this deployment. Set OPENAI_API_KEY in Vercel environment variables.' 
    });
    return;
  }

  // Basic abuse throttle (very crude in-memory for demo).
  // In a real product this would be per-user with auth + proper quotas.
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  // We keep it extremely simple here — just a note for the future.

  try {
    // Call OpenAI Images API (supports gpt-image-1 and dall-e-3).
    // We request b64_json so we can return a data URL directly (matches the rest of the app).
    const openaiRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        size,
        response_format: 'b64_json',
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error('OpenAI image error:', errText);
      res.status(502).json({ error: 'Upstream image generation failed', details: errText });
      return;
    }

    const data = await openaiRes.json();
    const b64 = data?.data?.[0]?.b64_json;

    if (!b64) {
      res.status(502).json({ error: 'No image data returned from provider' });
      return;
    }

    const imageDataUrl = `data:image/png;base64,${b64}`;

    res.status(200).json({
      success: true,
      imageDataUrl,
      revised_prompt: data?.data?.[0]?.revised_prompt || undefined,
      // In the future we can return usage / cost info here for the free tier UI.
    });
  } catch (err: any) {
    console.error('Hosted generation error:', err);
    res.status(500).json({ error: 'Failed to generate image via hosted AI', message: String(err?.message || err) });
  }
}
