// Поиск основного тона удара по барабанному пластику.
//
// Удар по пластику — это короткий щелчок-транзиент, за которым следует
// затухающий резонансный тон. Поэтому: 1) сначала находим момент самого
// удара (пик амплитуды), 2) берём окно звука чуть позже этого пика, когда
// щелчок уже стих, а резонанс ещё слышен, 3) ищем в этом окне высоту тона
// через автокорреляцию — она хорошо работает на коротких, не чисто
// синусоидальных сигналах.

export function extractHitWindow(samples, sampleRate, options = {}) {
  const preSkipMs = options.preSkipMs ?? 8;
  const windowMs = options.windowMs ?? 120;
  const minPeakAmplitude = options.minPeakAmplitude ?? 0.02;

  let peakIndex = 0;
  let peakVal = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.abs(samples[i]);
    if (v > peakVal) {
      peakVal = v;
      peakIndex = i;
    }
  }
  if (peakVal < minPeakAmplitude) return null; // похоже, удара не было

  const start = peakIndex + Math.round((preSkipMs / 1000) * sampleRate);
  const length = Math.round((windowMs / 1000) * sampleRate);
  const end = Math.min(samples.length, start + length);

  if (end - start < length * 0.5) {
    const fallbackStart = Math.max(0, samples.length - length);
    return samples.subarray(fallbackStart, samples.length);
  }
  return samples.subarray(start, end);
}

export function detectPitch(samples, sampleRate, options = {}) {
  const minFreq = options.minFreq ?? 40;
  const maxFreq = options.maxFreq ?? 500;
  const minConfidence = options.minConfidence ?? 0.3;

  const minLag = Math.max(1, Math.floor(sampleRate / maxFreq));
  const maxLag = Math.ceil(sampleRate / minFreq);
  const n = samples.length;
  if (n < maxLag * 1.5) return null;

  let mean = 0;
  for (let i = 0; i < n; i++) mean += samples[i];
  mean /= n;

  // окно Ханна, чтобы сгладить края анализируемого отрезка
  const windowed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    windowed[i] = (samples[i] - mean) * w;
  }

  const energyPrefix = new Float64Array(n + 1);
  let energy = 0;
  for (let i = 0; i < n; i++) energy += windowed[i] * windowed[i];
  if (energy / n < 1e-6) return null; // слишком тихо
  for (let i = 0; i < n; i++) {
    energyPrefix[i + 1] = energyPrefix[i] + windowed[i] * windowed[i];
  }

  const corrAtLag = new Float32Array(maxLag + 2);
  let bestLag = -1;
  let bestCorr = 0;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++) {
      sum += windowed[i] * windowed[i + lag];
    }
    const leftEnergy = energyPrefix[n - lag];
    const rightEnergy = energyPrefix[n] - energyPrefix[lag];
    const denominator = Math.sqrt(leftEnergy * rightEnergy);
    const correlation = denominator > 0 ? sum / denominator : 0;
    corrAtLag[lag] = correlation;
    if (correlation > bestCorr) {
      bestCorr = correlation;
      bestLag = lag;
    }
  }
  if (bestLag <= 0) return null;

  if (bestCorr < minConfidence) return null; // нет выраженного тона

  // параболическая интерполяция вокруг лучшего лага — точнее, чем целый отсчёт
  const y0 = corrAtLag[bestLag - 1] || corrAtLag[bestLag];
  const y1 = corrAtLag[bestLag];
  const y2 = corrAtLag[bestLag + 1] || corrAtLag[bestLag];
  const denom = y0 - 2 * y1 + y2;
  const shift = denom !== 0 ? (0.5 * (y0 - y2)) / denom : 0;
  const refinedLag = bestLag + Math.max(-0.5, Math.min(0.5, shift));

  const freq = sampleRate / refinedLag;
  if (freq < minFreq || freq > maxFreq) return null;

  return { freq, confidence: Math.min(1, bestCorr) };
}
