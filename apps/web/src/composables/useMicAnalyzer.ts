import { ref } from 'vue';
import { createUint8Summer } from '../lib/wasm/uint-sum';

const levelBars = ref([14, 18, 16, 22]);
const levelText = ref('Ready');

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let source: MediaStreamAudioSourceNode | null = null;
let animationFrame = 0;

export function useMicAnalyzer() {
  async function attach(stream: MediaStream) {
    cleanup();

    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const buffer = new Uint8Array(analyser.frequencyBinCount);
    const sum = await createUint8Summer();

    const tick = () => {
      if (!analyser) return;
      analyser.getByteFrequencyData(buffer);

      const chunkSize = Math.max(1, Math.floor(buffer.length / 4));
      const nextBars = [0, 1, 2, 3].map((index) => {
        const slice = buffer.slice(index * chunkSize, (index + 1) * chunkSize);
        const average = slice.length > 0 ? sum(slice) / slice.length : 0;
        return Math.max(12, Math.min(38, Math.round((average / 255) * 38)));
      });

      const average = Math.round(nextBars.reduce((total, value) => total + value, 0) / nextBars.length);
      levelBars.value = nextBars;
      levelText.value = average > 24 ? 'Hot mic' : average > 16 ? 'Speaking' : 'Listening';
      animationFrame = requestAnimationFrame(tick);
    };

    tick();
  }

  function cleanup() {
    cancelAnimationFrame(animationFrame);
    source?.disconnect();
    analyser?.disconnect();
    source = null;
    analyser = null;
    if (audioContext) {
      void audioContext.close().catch(() => {});
      audioContext = null;
    }
    levelBars.value = [14, 18, 16, 22];
    levelText.value = 'Ready';
  }

  return {
    levelBars,
    levelText,
    attach,
    cleanup,
  };
}
