/* vision.js — on-device food detection with TensorFlow.js COCO-SSD.
 *
 * COCO-SSD only knows COCO's 80 classes; the food-ish subset is small, so this
 * is a convenience that *seeds* ingredient tags. Manual tagging is the primary
 * path. Detected labels are mapped to friendlier ingredient names below. */

window.Vision = (function () {
  // COCO label -> ingredient tag we add. Non-food classes are ignored.
  const FOOD_LABEL_MAP = {
    banana: 'banana',
    apple: 'apple',
    orange: 'orange',
    broccoli: 'broccoli',
    carrot: 'carrot',
    'hot dog': 'sausage',
    pizza: 'cheese',
    donut: 'flour',
    cake: 'flour',
    sandwich: 'bread',
  };

  const MIN_SCORE = 0.5;
  let modelPromise = null;

  // Lazily load the model the first time a photo is analysed.
  function loadModel() {
    if (modelPromise) return modelPromise;
    modelPromise = new Promise((resolve, reject) => {
      if (typeof cocoSsd === 'undefined') {
        reject(new Error('Detection library not loaded (offline?).'));
        return;
      }
      cocoSsd.load().then(resolve, reject);
    });
    return modelPromise;
  }

  // Draw the image onto the canvas, scaled to a sane width.
  function drawToCanvas(img, canvas) {
    const maxW = 640;
    const scale = Math.min(1, maxW / img.naturalWidth);
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { ctx, scale };
  }

  function drawBox(ctx, pred, scale) {
    const [x, y, w, h] = pred.bbox.map((v) => v * scale);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#2a9d8f';
    ctx.strokeRect(x, y, w, h);
    const label = pred.class;
    ctx.font = '600 16px sans-serif';
    const tw = ctx.measureText(label).width + 12;
    ctx.fillStyle = '#2a9d8f';
    ctx.fillRect(x, Math.max(0, y - 22), tw, 22);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, x + 6, Math.max(14, y - 6));
  }

  /* Analyse a loaded <img>. Renders the image + boxes onto `canvas` and returns
   * a deduped array of ingredient names for confident food detections. */
  async function detect(img, canvas) {
    const model = await loadModel();
    const { ctx, scale } = drawToCanvas(img, canvas);
    const predictions = await model.detect(img);

    const found = new Set();
    predictions.forEach((p) => {
      if (p.score < MIN_SCORE) return;
      const mapped = FOOD_LABEL_MAP[p.class];
      if (!mapped) return;
      drawBox(ctx, p, scale);
      found.add(mapped);
    });
    return Array.from(found);
  }

  return { detect };
})();
