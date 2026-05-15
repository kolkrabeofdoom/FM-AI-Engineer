import type { DX7Patch } from '../utils/dx7';
import { createBankSysex } from '../utils/dx7';

export class HexterSynth {
  private ctx: AudioContext;
  private processor: ScriptProcessorNode | null = null;
  private synthInstance: any = null;
  private eventContainer: any = null;
  private sampleContainer: any = null;
  private moduleInstance: any = null;
  private isReady = false;
  private dryGain: GainNode;
  private wetGain: GainNode;
  
  // FX Nodes
  private splitter: ChannelSplitterNode;
  private merger: ChannelMergerNode;
  private delayL: DelayNode;
  private delayR: DelayNode;
  private lfo: OscillatorNode;
  private lfoGainL: GainNode;
  private lfoGainR: GainNode;
  private convolver: ConvolverNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 2.5; // Healthy safe level

    // Dry/Wet Setup
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.dryGain.gain.value = 1.0;
    this.wetGain.gain.value = 0.0;
    this.dryGain.connect(this.masterGain);
    this.wetGain.connect(this.masterGain);

    // --- 80s STEREO CHORUS ---
    this.splitter = ctx.createChannelSplitter(2);
    this.merger = ctx.createChannelMerger(2);
    
    this.delayL = ctx.createDelay();
    this.delayR = ctx.createDelay();
    this.delayL.delayTime.value = 0.02; // 20ms base delay
    this.delayR.delayTime.value = 0.022; // 22ms base delay (slight offset)
    
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.6; // 0.6Hz sweep
    
    this.lfoGainL = ctx.createGain();
    this.lfoGainR = ctx.createGain();
    this.lfoGainL.gain.value = 0.002; // 2ms depth
    this.lfoGainR.gain.value = -0.002; // inverted phase for ultra-wide stereo
    
    this.lfo.connect(this.lfoGainL);
    this.lfo.connect(this.lfoGainR);
    this.lfoGainL.connect(this.delayL.delayTime);
    this.lfoGainR.connect(this.delayR.delayTime);
    this.lfo.start();

    // The single mono channel from WASM connects to both L and R of the splitter
    this.splitter.connect(this.delayL, 0);
    this.splitter.connect(this.delayR, 0); // Both read from the same mono input
    
    this.delayL.connect(this.merger, 0, 0);
    this.delayR.connect(this.merger, 0, 1);

    // --- REVERB ---
    this.convolver = ctx.createConvolver();
    // Generate synthetic impulse response (2.5s tail)
    const length = ctx.sampleRate * 2.5;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let i = 0; i < length; i++) {
      const decay = Math.exp(-i / (ctx.sampleRate * 0.4)); 
      impulse.getChannelData(0)[i] = (Math.random() * 2 - 1) * decay;
      impulse.getChannelData(1)[i] = (Math.random() * 2 - 1) * decay;
    }
    this.convolver.buffer = impulse;

    // Chain: Splitter -> Delay -> Merger -> Convolver -> WetGain
    this.merger.connect(this.convolver);
    this.convolver.connect(this.wetGain);
  }

  toggle80sFX(enabled: boolean) {
    if (enabled) {
      this.dryGain.gain.setTargetAtTime(0.7, this.ctx.currentTime, 0.1);
      this.wetGain.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.1);
    } else {
      this.dryGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.1);
      this.wetGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.1);
    }
  }

  async init() {
    return new Promise<void>((resolve, reject) => {
        try {
        const HexterModule = (window as any).Module;
        if (!HexterModule) throw new Error("Global HexterModule not found");

        const initSynth = () => {
          this.moduleInstance = HexterModule;
          const blockSize = 512;
          this.synthInstance = new HexterModule.HexterJs();
          this.synthInstance.startUp(this.ctx.sampleRate, blockSize);
          
          this.eventContainer = new HexterModule.EventContainer();
          this.sampleContainer = new HexterModule.SampleContainer(blockSize);

          this.processor = this.ctx.createScriptProcessor(blockSize, 0, 1);
          
          this.processor.onaudioprocess = (e) => {
            if (!this.isReady) return;
            const outBuffer = e.outputBuffer.getChannelData(0);
            this.synthInstance.render(this.sampleContainer, this.eventContainer, blockSize);
            
            for (let i = 0; i < blockSize; i++) {
              outBuffer[i] = this.sampleContainer.get(i);
            }
            
            this.eventContainer.clear();
          };

          this.processor.connect(this.dryGain);
          this.processor.connect(this.splitter);
          this.isReady = true;
          resolve();
        };

        if (HexterModule.calledRun) {
           initSynth();
        } else {
           HexterModule.onRuntimeInitialized = () => {
             initSynth();
           };
        }
      } catch (e) {
        console.error("Failed to load Hexter WASM:", e);
        reject(e);
      }
    });
  }

  getOutputNode() {
    return this.masterGain;
  }

  noteOn(note: number, velocity: number = 100) {
    if (!this.isReady) return;
    this.eventContainer.addNoteOn(0, note, velocity);
  }

  noteOff(note: number) {
    if (!this.isReady) return;
    this.eventContainer.addNoteOff(0, note, 0);
  }

  loadPatch(patch: DX7Patch) {
    if (!this.isReady || !this.moduleInstance) return;
    
    // Create a 32-voice bank (4104 bytes) with our patch at index 0
    const sysexData = createBankSysex(patch);
    
    const byteContainer = new this.moduleInstance.ByteContainer(sysexData.length);
    for (let i = 0; i < sysexData.length; i++) {
      byteContainer.set(i, sysexData[i]);
    }
    
    this.synthInstance.sendSysex(byteContainer);
    byteContainer.__destroy__();
  }

  stop() {
    if (this.processor) {
      this.processor.disconnect();
    }
  }
}

