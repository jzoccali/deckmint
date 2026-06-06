# DeckMint Icons

The primary brand asset right now is `favicon.svg` (in this folder).

It is a clean, modern mark: a small stacked deck of cards with a fresh mint-green accent bar and a tiny mint leaf detail. It works great at small favicon sizes and scales reasonably for an app icon.

## Using it

### Web / Vite dev
- Already referenced in `index.html` as `/favicon.svg`.
- Works in modern browsers (Safari, Chrome, Firefox, Edge).

### Tauri native app icons (recommended)

1. Make sure you have a high-res source. The SVG is vector, so the easiest is to rasterize it:

   - Open `public/favicon.svg` in a design tool (Figma, Sketch, Illustrator, Affinity, or even a browser + export) and export a clean **1024×1024 PNG** with transparent background.
   - Or use a command-line tool like `rsvg-convert` / ImageMagick / `inkscape`.

2. From the project root, run:

   ```bash
   npx tauri icon public/favicon.svg
   ```

   or (if you have a 1024 PNG):

   ```bash
   npx tauri icon path/to/deckmint-1024.png
   ```

   This will overwrite `src-tauri/icons/` with all the required files (various PNG sizes, `icon.icns` for macOS, `icon.ico` for Windows).

3. Rebuild with `npm run tauri build` and you should have proper app icons in the native bundle.

## Future logo work

When you're ready for a real logo:
- The current mark can serve as the "app icon" / favicon.
- A wordmark "DeckMint" or "deckmint" with a custom typeface + the icon mark would be nice for marketing, website, etc.
- Keep the mint (#14b8a6 / #0ea47a) + cool neutral slate as the core palette for a fresh, clean, production-oriented feel.

Let me know if you want variations (monochrome, different leaf treatment, more "deck" emphasis, etc.).
