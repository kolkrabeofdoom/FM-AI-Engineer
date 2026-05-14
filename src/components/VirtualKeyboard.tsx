import { useState, useRef, useEffect } from 'react';
import type { DX7Patch } from '../utils/dx7';
import { initAudio, FMSynthVoice, getAudioContext } from '../lib/audio';

const KEYS = [
  { note: 48, type: 'white', label: 'C3' },
  { note: 49, type: 'black', label: '' },
  { note: 50, type: 'white', label: 'D3' },
  { note: 51, type: 'black', label: '' },
  { note: 52, type: 'white', label: 'E3' },
  { note: 53, type: 'white', label: 'F3' },
  { note: 54, type: 'black', label: '' },
  { note: 55, type: 'white', label: 'G3' },
  { note: 56, type: 'black', label: '' },
  { note: 57, type: 'white', label: 'A3' },
  { note: 58, type: 'black', label: '' },
  { note: 59, type: 'white', label: 'B3' },
  { note: 60, type: 'white', label: 'C4' },
  { note: 61, type: 'black', label: '' },
  { note: 62, type: 'white', label: 'D4' },
  { note: 63, type: 'black', label: '' },
  { note: 64, type: 'white', label: 'E4' },
  { note: 65, type: 'white', label: 'F4' },
  { note: 66, type: 'black', label: '' },
  { note: 67, type: 'white', label: 'G4' },
  { note: 68, type: 'black', label: '' },
  { note: 69, type: 'white', label: 'A4' },
  { note: 70, type: 'black', label: '' },
  { note: 71, type: 'white', label: 'B4' },
  { note: 72, type: 'white', label: 'C5' },
];

export function VirtualKeyboard({ patch }: { patch: DX7Patch | null }) {
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const [midiDevice, setMidiDevice] = useState<string | null>(null);
  const voicesRef = useRef<Map<number, FMSynthVoice>>(new Map());

  // Cleanup voices on unmount
  useEffect(() => {
    return () => {
      voicesRef.current.forEach(voice => {
        const ctx = getAudioContext();
        if (ctx) voice.stop(ctx.currentTime);
      });
      voicesRef.current.clear();
    };
  }, []);

  const handleNoteOn = async (note: number) => {
    if (!patch) return;
    try {
      const ctx = await initAudio();
      
      // Stop existing voice for this note if any
      if (voicesRef.current.has(note)) {
        voicesRef.current.get(note)?.stop(ctx.currentTime);
      }

      const voice = new FMSynthVoice(ctx, note, patch);
      voice.start(ctx.currentTime);
      voicesRef.current.set(note, voice);
      
      setActiveNotes(prev => new Set(prev).add(note));
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  };

  const handleNoteOff = (note: number) => {
    const ctx = getAudioContext();
    if (ctx && voicesRef.current.has(note)) {
      voicesRef.current.get(note)?.stop(ctx.currentTime);
      voicesRef.current.delete(note);
    }
    setActiveNotes(prev => {
      const next = new Set(prev);
      next.delete(note);
      return next;
    });
  };

  useEffect(() => {
    let midiAccess: any = null;

    const onMIDIMessage = (message: any) => {
      const command = message.data[0] & 0xf0;
      const note = message.data[1];
      const velocity = message.data.length > 2 ? message.data[2] : 0;

      if (command === 144 && velocity > 0) { // noteOn
        handleNoteOn(note);
      } else if (command === 128 || (command === 144 && velocity === 0)) { // noteOff
        handleNoteOff(note);
      }
    };

    const initMIDI = async () => {
      if (navigator.requestMIDIAccess) {
        try {
          midiAccess = await navigator.requestMIDIAccess();
          
          const inputs = midiAccess.inputs.values();
          for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
            input.value.onmidimessage = onMIDIMessage;
            setMidiDevice(input.value.name || "MIDI Device");
          }

          midiAccess.onstatechange = (e: any) => {
            if (e.port.type === "input") {
              if (e.port.state === "connected") {
                e.port.onmidimessage = onMIDIMessage;
                setMidiDevice(e.port.name || "MIDI Device");
              } else {
                setMidiDevice(null);
              }
            }
          };
        } catch (err) {
          console.log("MIDI access denied or failed", err);
        }
      }
    };

    initMIDI();

    return () => {
      if (midiAccess) {
        const inputs = midiAccess.inputs.values();
        for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
          input.value.onmidimessage = null;
        }
      }
    };
  }, [patch]);

  return (
    <div className="bg-dx7-panel p-6 rounded-sm border-b-4 border-[#151310] relative select-none shadow-xl mt-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-[10px] font-mono-tech uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <span>🔊 Flavor Preview</span>
          {midiDevice ? (
            <span className="px-2 py-1 bg-dx7-teal/10 border border-dx7-teal/30 rounded-sm text-[8px] text-dx7-teal flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-dx7-teal animate-pulse" />
              MIDI: {midiDevice}
            </span>
          ) : (
            <span className="px-2 py-1 bg-slate-800 rounded-sm text-[8px] text-slate-500">2-OP WebAudio Synth</span>
          )}
        </h3>
        <div className="flex items-center gap-2">
           {activeNotes.size > 0 ? (
             <span className="w-2 h-2 rounded-full bg-dx7-teal shadow-[0_0_8px_#00ffff] animate-pulse" />
           ) : (
             <span className="w-2 h-2 rounded-full bg-slate-700" />
           )}
           <span className="text-[10px] font-mono-tech text-slate-500 uppercase">Engine Ready</span>
        </div>
      </div>
      
      <div className="relative h-40 flex shadow-2xl rounded-b-md overflow-hidden bg-black p-1">
        {KEYS.map((key) => {
          if (key.type === 'white') {
            return (
              <div
                key={key.note}
                onMouseDown={() => handleNoteOn(key.note)}
                onMouseUp={() => handleNoteOff(key.note)}
                onMouseLeave={() => handleNoteOff(key.note)}
                onTouchStart={(e) => { e.preventDefault(); handleNoteOn(key.note); }}
                onTouchEnd={(e) => { e.preventDefault(); handleNoteOff(key.note); }}
                className={`flex-1 border-r border-slate-300 rounded-b-sm relative cursor-pointer transition-colors m-[1px]
                  ${activeNotes.has(key.note) ? 'bg-dx7-teal/20 shadow-inner' : 'bg-[#f0f0f0] hover:bg-[#e0e0e0]'}`}
              >
                <div className="absolute bottom-2 w-full text-center text-[10px] text-slate-400 font-mono-tech select-none">
                  {key.label}
                </div>
              </div>
            );
          } else {
            // Black key
            return (
              <div
                key={key.note}
                onMouseDown={() => handleNoteOn(key.note)}
                onMouseUp={() => handleNoteOff(key.note)}
                onMouseLeave={() => handleNoteOff(key.note)}
                onTouchStart={(e) => { e.preventDefault(); handleNoteOn(key.note); }}
                onTouchEnd={(e) => { e.preventDefault(); handleNoteOff(key.note); }}
                className={`absolute top-1 w-8 h-24 -ml-4 z-10 rounded-b-sm border-x border-b border-black cursor-pointer transition-colors shadow-xl
                  ${activeNotes.has(key.note) ? 'bg-dx7-teal shadow-inner' : 'bg-slate-900 hover:bg-slate-800'}`}
                style={{ 
                  left: `${(KEYS.filter(k => k.type === 'white').findIndex(k => k.note > key.note)) * (100 / 15)}%` 
                }}
              />
            );
          }
        })}
      </div>
    </div>
  );
}
