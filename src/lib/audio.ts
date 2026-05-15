import { HexterSynth } from './HexterNode';

let audioContext: AudioContext | null = null;
let globalAnalyser: AnalyserNode | null = null;

let globalHexter: HexterSynth | null = null;

export const initHexter = async () => {
  const ctx = initAudio();
  if (!globalHexter) {
    globalHexter = new HexterSynth(ctx);
    await globalHexter.init();
    
    // Connect Hexter output to the global analyser
    const analyser = getAnalyser();
    if (analyser) {
      globalHexter.getOutputNode().connect(analyser);
    }
  }
  return globalHexter;
};

export const getHexter = () => globalHexter;

export const initAudio = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  if (!globalAnalyser && audioContext) {
    globalAnalyser = audioContext.createAnalyser();
    globalAnalyser.fftSize = 2048;
    globalAnalyser.connect(audioContext.destination);
  }

  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
};

export const getAudioContext = () => audioContext;
export const getAnalyser = () => {
  if (!globalAnalyser && audioContext) {
    initAudio();
  }
  return globalAnalyser;
};
