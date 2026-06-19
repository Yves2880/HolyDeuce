# 🥕 Snap & Cook

Snap a photo of your ingredients (or just type them in) and get **easy recipes
you can actually make** with what you have.

**Live app:** `https://<your-username>.github.io/snap-and-cook/`
*(available once GitHub Pages is enabled — see Deployment below)*

## How it works

1. **Snap or upload a photo** of your ingredients. A small machine-learning model
   ([COCO-SSD](https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd))
   runs **entirely in your browser** via [TensorFlow.js](https://www.tensorflow.org/js)
   — no server, no API key, nothing uploaded anywhere.
2. **Refine the ingredient list.** Detections become editable tags; add anything
   else by typing it in (comma-separated works too).
3. **Find recipes.** The app matches your ingredients against
   [TheMealDB](https://www.themealdb.com) and shows the best matches first, with
   full ingredients and step-by-step instructions.

### Good to know
- On-device detection only recognises a handful of common foods (banana, apple,
  orange, broccoli, carrot, and a few more). It's a convenience to *seed* the
  list — typing ingredients is the main way to use the app.
- Recipes come from TheMealDB's free public API using the shared test key.

## Run locally

No build step — it's plain HTML/CSS/JS. Serve the folder with any static server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

A server (not `file://`) is needed so the browser allows the CDN scripts and API
requests.

## Deployment (GitHub Pages)

This repo ships a workflow at `.github/workflows/deploy.yml` that publishes the
site on every push to `main`. To turn it on:

1. Go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.

The next push to `main` (or a manual *Run workflow*) deploys to
`https://<your-username>.github.io/snap-and-cook/`.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page shell and CDN/script includes |
| `style.css`  | Mobile-first styling |
| `vision.js`  | In-browser photo → ingredient detection |
| `tags.js`    | Ingredient tag state (source of truth) |
| `recipes.js` | TheMealDB client, matching & ranking |
| `app.js`     | Wires the UI together |

## License

MIT
