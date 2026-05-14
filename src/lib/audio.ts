import type { DX7Patch } from '../utils/dx7';

let audioContext: AudioContext | null = null;

// Convert DX7 rate (0-99) to seconds
const rateToSeconds = (rate: number) => {
  const normalized = Math.max(0, Math.min(99, rate));
  // 99 -> ~0.01s, 0 -> ~8.0s
  return 8.0 * Math.pow(1 - (normalized / 99), 3) + 0.01;
};

// Convert DX7 level (0-99) to linear gain (0.0 to 1.0)
const levelToGain = (level: number) => {
  return Math.max(0, Math.min(99, level)) / 99.0;
};

export const noteToFreq = (note: number) => {
  return 440 * Math.pow(2, (note - 69) / 12);
};

export class FMSynthVoice {
  private carrier: OscillatorNode;
  private modulator: OscillatorNode;
  private carrierGain: GainNode;
  private modGain: GainNode;
  private patch: DX7Patch;
  private ctx: AudioContext;

  constructor(ctx: AudioContext, note: number, patch: DX7Patch) {
    this.ctx = ctx;
    this.patch = patch;
    
    // Simplification: We use OP1 as Carrier and OP6 as Modulator to get the "flavor"
    const carrierOp = patch.ops[5]; // OP1 (index 5)
    const modOp = patch.ops[0];     // OP6 (index 0)

    const freq = noteToFreq(note);
    const carrierRatio = carrierOp.f_coarse === 0 ? 0.5 : carrierOp.f_coarse;
    const modRatio = modOp.f_coarse === 0 ? 0.5 : modOp.f_coarse;

    this.carrier = ctx.createOscillator();
    this.modulator = ctx.createOscillator();
    this.carrierGain = ctx.createGain();
    this.modGain = ctx.createGain();

    // Master volume roughly adjusted to prevent clipping
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.3;

    // Routing
    this.modulator.connect(this.modGain);
    this.modGain.connect(this.carrier.frequency);
    this.carrier.connect(this.carrierGain);
    this.carrierGain.connect(masterGain);
    masterGain.connect(ctx.destination);

    this.carrier.type = 'sine';
    this.modulator.type = 'sine';
    
    this.carrier.frequency.value = freq * carrierRatio;
    this.modulator.frequency.value = freq * modRatio;

    // Modulation Index based on modulator out level and feedback
    const modOutLevel = levelToGain(modOp.out);
    const feedbackBoost = 1.0 + (patch.feedback * 0.2); // feedback 0-7 adds extra brightness
    const maxModIndex = freq * modOutLevel * 4.0 * feedbackBoost; 

    // Envelopes
    const now = ctx.currentTime;
    
    // Carrier Envelope (Volume)
    const cAttack = rateToSeconds(carrierOp.r1);
    const cDecay = rateToSeconds(carrierOp.r2);
    const cSustainLevel = levelToGain(carrierOp.l3);
    
    this.carrierGain.gain.setValueAtTime(0, now);
    this.carrierGain.gain.linearRampToValueAtTime(1.0, now + cAttack);
    this.carrierGain.gain.linearRampToValueAtTime(cSustainLevel, now + cAttack + cDecay);

    // Modulator Envelope (Brightness)
    const mAttack = rateToSeconds(modOp.r1);
    const mDecay = rateToSeconds(modOp.r2);
    const mSustainLevel = levelToGain(modOp.l3);
    
    this.modGain.gain.setValueAtTime(0, now);
    this.modGain.gain.linearRampToValueAtTime(maxModIndex, now + mAttack);
    this.modGain.gain.linearRampToValueAtTime(maxModIndex * mSustainLevel, now + mAttack + mDecay);
  }

  start(time: number) {
    this.carrier.start(time);
    this.modulator.start(time);
  }

  stop(time: number) {
    const cRelease = rateToSeconds(this.patch.ops[5].r4);
    
    // Smooth release for modulation
    this.modGain.gain.cancelScheduledValues(time);
    this.modGain.gain.linearRampToValueAtTime(0, time + cRelease * 0.5);

    // Smooth release for volume
    this.carrierGain.gain.cancelScheduledValues(time);
    this.carrierGain.gain.setValueAtTime(this.carrierGain.gain.value, time);
    this.carrierGain.gain.linearRampToValueAtTime(0, time + cRelease);

    this.carrier.stop(time + cRelease + 0.1);
    this.modulator.stop(time + cRelease + 0.1);
  }
}

export const initAudio = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
};

export const getAudioContext = () => audioContext;
