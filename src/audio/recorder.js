import { requestRecordingPermissionsAsync, useAudioStream } from 'expo-audio';
import { useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { detectPitch, extractHitWindow } from './pitchDetect';

// Слушаем микрофон потоком сырых PCM-сэмплов: не нужно ни писать файл,
// ни разбирать WAV — формат одинаково доступен и на iOS, и на Android.
const SAMPLE_RATE = 44100;
const CHANNELS = 1;

let permissionGranted = false;

async function ensurePermission() {
  if (permissionGranted) return true;
  const { status } = await requestRecordingPermissionsAsync();
  permissionGranted = status === 'granted';
  return permissionGranted;
}

function appendChunk(chunks, buffer) {
  const data = new Float32Array(buffer.data);
  const channels = buffer.channels || 1;
  if (channels === 1) {
    chunks.push(data);
    return;
  }
  // Просили моно, но на всякий случай сводим каналы в один.
  const frames = Math.floor(data.length / channels);
  const mono = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) sum += data[i * channels + c];
    mono[i] = sum / channels;
  }
  chunks.push(mono);
}

function joinChunks(chunks) {
  let total = 0;
  for (const chunk of chunks) total += chunk.length;
  const samples = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    samples.set(chunk, offset);
    offset += chunk.length;
  }
  return samples;
}

// Хук создаёт поток с микрофона и возвращает функцию, которая слушает
// ~durationMs звука, ждёт удар и определяет его высоту тона.
// Функция возвращает { freq, confidence } или { error: '...' }.
export function useHitRecorder() {
  const chunksRef = useRef([]);
  const sampleRateRef = useRef(SAMPLE_RATE);

  const { stream } = useAudioStream({
    sampleRate: SAMPLE_RATE,
    channels: CHANNELS,
    encoding: 'float32',
    onBuffer: (buffer) => {
      sampleRateRef.current = buffer.sampleRate || sampleRateRef.current;
      appendChunk(chunksRef.current, buffer);
    },
  });

  return useCallback(
    async ({ durationMs = 1800, minFreq = 40, maxFreq = 500 } = {}) => {
      if (Platform.OS === 'web') {
        return { error: 'unsupported' };
      }

      const ok = await ensurePermission();
      if (!ok) return { error: 'permission' };

      chunksRef.current = [];
      sampleRateRef.current = SAMPLE_RATE;

      try {
        await stream.start();
        await new Promise((resolve) => setTimeout(resolve, durationMs));
        stream.stop();

        const sampleRate = sampleRateRef.current;
        const samples = joinChunks(chunksRef.current);
        chunksRef.current = [];

        const hitWindow = extractHitWindow(samples, sampleRate);
        if (!hitWindow) return { error: 'no_hit' };

        const pitch = detectPitch(hitWindow, sampleRate, { minFreq, maxFreq });
        if (!pitch) return { error: 'no_pitch' };

        return { freq: pitch.freq, confidence: pitch.confidence };
      } catch (e) {
        try {
          stream.stop();
        } catch (_e) {
          // поток уже остановлен — не критично
        }
        return { error: 'recording', message: String(e?.message || e) };
      }
    },
    [stream]
  );
}
