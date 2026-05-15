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
  private masterGain: GainNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 2.5; // Healthy safe level
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

          this.processor.connect(this.masterGain);
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

