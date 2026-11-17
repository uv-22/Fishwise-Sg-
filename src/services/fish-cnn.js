/**
 * FishWise v4 browser inference.
 *
 * The ONNX model and the selected photo stay in the browser. The model returns
 * 17 logits: 16 supported fish classes plus `not_a_fish`. `unknown_fish` is a
 * threshold decision rather than a trained visual class.
 */

const MODEL_URL = new URL('../../models/fishwise_v4.onnx', import.meta.url).href;
const METADATA_URL = new URL('../../models/fishwise_v4_metadata.json', import.meta.url).href;
const ORT_DIST = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';

let runtimePromise = null;

export function cnnAvailable() {
  return Boolean(globalThis.ort?.InferenceSession);
}

async function loadRuntime() {
  if (!cnnAvailable()) throw new Error('The on-device AI runtime did not load. Check your connection and try again.');
  if (!runtimePromise) {
    runtimePromise = (async () => {
      // GitHub Pages does not send cross-origin isolation headers, so one WASM
      // thread is the reliable default across desktop and mobile browsers.
      globalThis.ort.env.wasm.numThreads = 1;
      globalThis.ort.env.wasm.wasmPaths = ORT_DIST;
      const [metadata, session] = await Promise.all([
        fetch(METADATA_URL).then((response) => {
          if (!response.ok) throw new Error('Fish ID metadata could not be loaded.');
          return response.json();
        }),
        globalThis.ort.InferenceSession.create(MODEL_URL, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        }),
      ]);
      return { metadata, session };
    })().catch((error) => {
      runtimePromise = null;
      throw error;
    });
  }
  return runtimePromise;
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The selected photo could not be prepared for Fish ID.'));
    image.src = dataUrl;
  });
}

async function imageTensor(dataUrl, metadata) {
  const image = await loadImage(dataUrl);
  const shorter = metadata.input.resize_shorter_side;
  const crop = metadata.input.shape[2];
  const scale = shorter / Math.min(image.naturalWidth, image.naturalHeight);
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);

  const resized = document.createElement('canvas');
  resized.width = width;
  resized.height = height;
  const resizeContext = resized.getContext('2d', { willReadFrequently: false });
  resizeContext.imageSmoothingEnabled = true;
  resizeContext.imageSmoothingQuality = 'high';
  resizeContext.drawImage(image, 0, 0, width, height);

  const canvas = document.createElement('canvas');
  canvas.width = crop;
  canvas.height = crop;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const sourceX = Math.max(0, Math.floor((width - crop) / 2));
  const sourceY = Math.max(0, Math.floor((height - crop) / 2));
  context.drawImage(resized, sourceX, sourceY, crop, crop, 0, 0, crop, crop);

  const rgba = context.getImageData(0, 0, crop, crop).data;
  const pixels = crop * crop;
  const values = new Float32Array(3 * pixels);
  const mean = metadata.input.rgb_mean;
  const std = metadata.input.rgb_std;
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const rgbaOffset = pixel * 4;
    values[pixel] = (rgba[rgbaOffset] / 255 - mean[0]) / std[0];
    values[pixels + pixel] = (rgba[rgbaOffset + 1] / 255 - mean[1]) / std[1];
    values[2 * pixels + pixel] = (rgba[rgbaOffset + 2] / 255 - mean[2]) / std[2];
  }
  return new globalThis.ort.Tensor('float32', values, metadata.input.shape);
}

function softmax(logits) {
  const maximum = Math.max(...logits);
  const exponentials = Array.from(logits, (value) => Math.exp(value - maximum));
  const total = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => value / total);
}

function safetyHandling(label, danger) {
  if (label === 'pufferfish_group') {
    return ['Do not eat it or use it as bait.', 'Avoid bare-hand contact and keep it away from children and pets.', 'If safe unhooking is uncertain, cut the line close to the hook.'];
  }
  if (danger === 'danger') {
    return ['Do not grip the fish with bare hands.', 'Keep clear of dorsal, pectoral and tail spines or barbs.', 'If you cannot identify a safe grip, cut the line close to the hook.'];
  }
  return ['Keep fingers clear of the mouth, gill plates and fin spines.', 'Use a landing net or fish-grip tool and support the body.', 'If the identification looks wrong, treat the fish as unknown.'];
}

function confidenceLabel(probability, knownThreshold) {
  const level = probability >= 0.85 ? 'high' : probability >= knownThreshold ? 'medium' : 'low';
  return `${level} · ${Math.round(probability * 100)}%`;
}

function resultFromProbabilities(probabilities, metadata, mode) {
  const threshold = metadata.operating_points[mode] || metadata.operating_points.safety_first;
  const notFishIndex = metadata.class_to_index.not_a_fish;
  const rankedFish = probabilities
    .map((probability, index) => ({ label: metadata.classes[index], probability }))
    .filter((item) => item.label !== 'not_a_fish')
    .sort((a, b) => b.probability - a.probability);
  const best = rankedFish[0];
  const notFishProbability = probabilities[notFishIndex];

  if (notFishProbability >= threshold.not_a_fish_threshold && notFishProbability > best.probability) {
    return {
      is_fish: false,
      common_name: '',
      scientific_name: '',
      confidence: confidenceLabel(notFishProbability, threshold.not_a_fish_threshold),
      matched_guide_id: 'none',
      danger: 'caution',
      key_features: [],
      handling: [],
      edible_warning: '',
      look_alikes: [],
      notes: 'The on-device model did not find a supported fish. Try a clear side-on photo containing the whole fish.',
      cnn: { label: 'not_a_fish', probability: notFishProbability, top3: rankedFish.slice(0, 3) },
    };
  }

  if (best.probability < threshold.known_threshold) {
    return {
      is_fish: true,
      common_name: 'Unknown fish',
      scientific_name: '',
      confidence: confidenceLabel(best.probability, threshold.known_threshold),
      matched_guide_id: 'none',
      danger: 'danger',
      key_features: [],
      handling: ['Do not touch it with bare hands.', 'Keep clear of all spines, teeth and tail barbs.', 'Cut the line close to the hook if safe unhooking is uncertain.'],
      edible_warning: 'Do not eat an unidentified fish.',
      look_alikes: rankedFish.slice(0, 3).map((item) => metadata.display_names[item.label]),
      notes: 'The photo did not reach the safety-first identification threshold. Ask an experienced angler or use Guided ID.',
      cnn: { label: 'unknown_fish', probability: best.probability, top3: rankedFish.slice(0, 3) },
    };
  }

  const label = best.label;
  const danger = metadata.danger[label] || 'caution';
  return {
    is_fish: true,
    common_name: metadata.display_names[label],
    scientific_name: '',
    confidence: confidenceLabel(best.probability, threshold.known_threshold),
    matched_guide_id: metadata.matched_guide_ids[label] || 'none',
    danger,
    key_features: [],
    handling: safetyHandling(label, danger),
    edible_warning: label === 'pufferfish_group' ? 'Pufferfish may contain a potentially fatal toxin. Never eat it.' : '',
    look_alikes: rankedFish.slice(1, 3).map((item) => metadata.display_names[item.label]),
    notes: 'On-device CNN result. Group labels are not an exact species diagnosis.',
    cnn: { label, probability: best.probability, top3: rankedFish.slice(0, 3) },
  };
}

export async function identifyFishWithCNN(dataUrl, mode = 'safety_first') {
  const { metadata, session } = await loadRuntime();
  const input = await imageTensor(dataUrl, metadata);
  const output = await session.run({ [metadata.input.name]: input });
  const logits = output[metadata.output.name] || output[session.outputNames[0]];
  if (!logits) throw new Error('The on-device model returned no output.');
  return resultFromProbabilities(softmax(logits.data), metadata, mode);
}

