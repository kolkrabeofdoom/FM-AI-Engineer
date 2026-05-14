import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Download, Music, Settings, Cpu, Layers, Info, HelpCircle, X } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createDefaultPatch, createBankSysex } from './utils/dx7';
import type { DX7Patch } from './utils/dx7';
import { cn } from './lib/utils';
import { AlgorithmDiagram } from './components/AlgorithmDiagram';
import { EnvelopeDiagram } from './components/EnvelopeDiagram';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");

const HELP_TEXTS: Record<string, { title: string; desc: string }> = {
  brightness: {
    title: "Helligkeit (Brightness)",
    desc: "Dieser Regler skaliert das Output-Level (Out) aller Operatoren. In der FM-Synthese steuern die Modulator-Level die Intensität der Obertöne. Ein höherer Wert führt zu einem helleren, metallischeren Klang, während niedrigere Werte den Sound weicher und dumpfer machen."
  },
  attack: {
    title: "Attack-Zeit",
    desc: "Steuert die Einschwingzeit (Rate 1) aller Operatoren. Ein positiver Wert verlängert die Attack-Phase (der Sound baut sich langsamer auf, gut für Pads). Ein negativer Wert beschleunigt die Attack-Phase (der Sound ist sofort da, ideal für Bässe und Plucks)."
  },
  release: {
    title: "Release-Zeit",
    desc: "Steuert die Ausklingzeit (Rate 4) aller Operatoren, nachdem die Taste losgelassen wurde. Ein positiver Wert sorgt für einen längeren Ausklang (ähnlich einem Hall-Effekt), während ein negativer Wert den Sound beim Loslassen abrupt abschneidet."
  }
};

const SYSTEM_PROMPT = `You are a Yamaha DX7 FM Synthesis Engineer.
Your goal is to create a DX7 patch based on a text prompt.
The DX7 uses 6 operators and 32 algorithms.
Output ONLY a JSON object representing the patch. Do not include markdown or explanations.

JSON Structure:
{
  "name": "MAX10CHARS",
  "algorithm": 1-32,
  "feedback": 0-7,
  "ops": [
    {
      "r1": 0-99, "r2": 0-99, "r3": 0-99, "r4": 0-99,
      "l1": 0-99, "l2": 0-99, "l3": 0-99, "l4": 0-99,
      "out": 0-99, 
      "f_coarse": 0-31, 
      "f_fine": 0-99, 
      "detune": 0-14 (7 is no detune)
    },
    ... (MUST BE 6 operators, Index 0 is OP6, Index 5 is OP1)
  ]
}

Technical Tips:
- Algorithm 1-32: 1-2 are best for pianos, 16-18 for bells, 32 for simple sine layering.
- OP6 is often the first modulator in many algorithms.
- Out level 99 for carriers, 50-80 for modulators.
- Envelopes: r1-r4 are rates (99=instant), l1-l4 are levels (99=max).
- f_coarse 1.0 = standard pitch. 0.5 = octave below. 2.0 = octave above.`;

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [originalPatch, setOriginalPatch] = useState<DX7Patch | null>(null);
  const [macros, setMacros] = useState({ brightness: 0, attack: 0, release: 0 });
  const [activeHelp, setActiveHelp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const patch = useMemo(() => {
    if (!originalPatch) return null;
    return {
      ...originalPatch,
      ops: originalPatch.ops.map(op => {
        const out = Math.max(0, Math.min(99, op.out + macros.brightness));
        const r1 = Math.max(0, Math.min(99, op.r1 - macros.attack));
        const r4 = Math.max(0, Math.min(99, op.r4 - macros.release));
        return { ...op, out, r1, r4 };
      })
    };
  }, [originalPatch, macros]);

  const generatePatch = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setError(null);

    try {
      console.log("Starting generation with gemini-flash-latest...");
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      
      const result = await model.generateContent([
        { text: SYSTEM_PROMPT },
        { text: `Create a DX7 patch for: ${prompt}` }
      ]);
      
      const text = result.response.text();
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const data = JSON.parse(cleaned);

      // Merge with default to ensure all fields exist
      const defaultPatch = createDefaultPatch();
      const newPatch: DX7Patch = {
        ...defaultPatch,
        ...data,
        ops: data.ops.map((op: any, i: number) => ({
          ...defaultPatch.ops[i],
          ...op
        }))
      };

      setOriginalPatch(newPatch);
      setMacros({ brightness: 0, attack: 0, release: 0 });
    } catch (err: any) {
      console.error(err);
      setError(`Error: ${err.message || "Failed to generate patch."}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadSysex = async () => {
    if (!patch) return;
    const sysex = createBankSysex(patch);
    const fileName = `${patch.name.trim() || 'FM_AI_PATCH'}.syx`;

    // Try using File System Access API for "Save As" dialog
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'Yamaha DX7 Sysex File',
            accept: { 'application/octet-stream': ['.syx'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(sysex.buffer);
        await writable.close();
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('File Picker failed, falling back...', err);
      }
    }

    // Fallback: Standard automatic download
    const blob = new Blob([sysex.buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-dx7-bg text-slate-100 font-sans p-6 md:p-12 selection:bg-dx7-teal/30">
      <header className="max-w-6xl mx-auto mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-dx7-teal rounded-sm border-2 border-dx7-panel flex items-center justify-center shadow-lg shadow-dx7-teal/20">
              <Cpu className="text-dx7-bg" size={24} />
            </div>
            <h1 className="text-3xl font-lcd tracking-widest text-white uppercase italic">FM AI ENGINEER</h1>
          </div>
          <p className="text-slate-400 font-mono-tech tracking-tight">The ultimate Yamaha DX7 Patch Designer</p>
        </div>
        
        <div className="flex gap-4 p-1">
          <div className="px-4 py-2 bg-dx7-magenta rounded-sm border-2 border-[#cc0066] text-[10px] font-mono-tech uppercase tracking-widest text-white font-bold">v1.2.0 Stable</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Section */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-dx7-panel border-b-4 border-[#151310] p-8 rounded-md shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Sparkles size={120} />
            </div>
            
            <h2 className="text-xs font-mono-tech font-bold uppercase tracking-[0.2em] text-dx7-teal mb-6 flex items-center gap-2">
              <Sparkles size={14} /> Sound-Spezifikation
            </h2>
            
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Beschreibe den Sound (z.B. 'Ein kristallklares E-Piano mit viel Anschlag und langem Hall...')"
              className="w-full h-40 bg-dx7-bg border-2 border-slate-800 rounded-sm p-6 text-lg font-mono-tech text-dx7-teal focus:outline-none focus:border-dx7-teal/50 transition-all resize-none placeholder:text-slate-600"
            />
            
            <button
              onClick={generatePatch}
              disabled={isGenerating || !prompt}
              className={cn(
                "w-full mt-6 py-4 rounded-sm font-mono-tech font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all transform active:translate-y-1 border-b-4",
                isGenerating || !prompt 
                  ? "bg-slate-800 text-slate-500 border-slate-900 cursor-not-allowed" 
                  : "bg-dx7-teal text-dx7-bg border-[#008888] shadow-xl shadow-dx7-teal/20 hover:brightness-110"
              )}
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-3 border-dx7-bg/20 border-t-dx7-bg rounded-full animate-spin" />
                  Konstruiere Wellenformen...
                </>
              ) : (
                <>
                  <Settings size={20} /> Patch Generieren
                </>
              )}
            </button>
            
            {error && <p className="mt-4 text-dx7-magenta text-xs font-bold text-center font-mono-tech">{error}</p>}
          </div>

          {/* Tips Card */}
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-2xl">
            <div className="flex gap-3">
              <Info className="text-indigo-400 shrink-0" size={20} />
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-2">Pro Tip</h4>
                <p className="text-xs text-indigo-200/70 leading-relaxed">
                  Nutze Begriffe wie "glassy", "metallic", "organic", "brassy" oder referenziere 80s-Pop-Genres für optimale Ergebnisse.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Result Section */}
        <section className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {patch ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Patch Overview */}
                <div className="bg-dx7-panel border-b-4 border-[#151310] rounded-md p-8 shadow-2xl">
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex-1 mr-4">
                      <h3 className="text-[10px] font-mono-tech uppercase tracking-widest text-dx7-teal mb-2">Patch Name</h3>
                      <div className="text-3xl font-lcd tracking-widest text-dx7-lcd-text bg-dx7-lcd-bg p-4 rounded-sm shadow-inner uppercase border-4 border-slate-800 overflow-hidden text-ellipsis whitespace-nowrap">
                        {patch.name || "INIT VOICE"}
                      </div>
                    </div>
                    <button 
                      onClick={downloadSysex}
                      className="p-4 bg-dx7-magenta text-white border-b-4 border-[#cc0066] rounded-sm hover:brightness-110 transition-all active:translate-y-1 active:border-b-0 group"
                    >
                      <Download size={24} className="group-hover:animate-pulse" />
                    </button>
                  </div>

                  {/* Tweaking Panel */}
                  <div className="bg-dx7-bg border-2 border-slate-800 p-6 rounded-sm mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center text-[10px] font-mono-tech uppercase tracking-widest text-slate-400">
                        <div className="flex items-center gap-2">
                          <span>Helligkeit</span>
                          <button onClick={() => setActiveHelp('brightness')} className="hover:text-dx7-teal transition-colors" title="Info zu Helligkeit"><HelpCircle size={12} /></button>
                        </div>
                        <span className={macros.brightness > 0 ? "text-dx7-teal" : macros.brightness < 0 ? "text-dx7-magenta" : ""}>
                          {macros.brightness > 0 ? `+${macros.brightness}` : macros.brightness}
                        </span>
                      </div>
                      <input 
                        type="range" min="-50" max="50" value={macros.brightness}
                        onChange={e => setMacros(m => ({...m, brightness: parseInt(e.target.value)}))}
                        className="w-full accent-[#00ffff] h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center text-[10px] font-mono-tech uppercase tracking-widest text-slate-400">
                        <div className="flex items-center gap-2">
                          <span>Attack (Zeit)</span>
                          <button onClick={() => setActiveHelp('attack')} className="hover:text-dx7-teal transition-colors" title="Info zu Attack"><HelpCircle size={12} /></button>
                        </div>
                        <span className={macros.attack > 0 ? "text-dx7-teal" : macros.attack < 0 ? "text-dx7-magenta" : ""}>
                          {macros.attack > 0 ? `+${macros.attack}` : macros.attack}
                        </span>
                      </div>
                      <input 
                        type="range" min="-50" max="50" value={macros.attack}
                        onChange={e => setMacros(m => ({...m, attack: parseInt(e.target.value)}))}
                        className="w-full accent-[#00ffff] h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center text-[10px] font-mono-tech uppercase tracking-widest text-slate-400">
                        <div className="flex items-center gap-2">
                          <span>Release (Zeit)</span>
                          <button onClick={() => setActiveHelp('release')} className="hover:text-dx7-teal transition-colors" title="Info zu Release"><HelpCircle size={12} /></button>
                        </div>
                        <span className={macros.release > 0 ? "text-dx7-teal" : macros.release < 0 ? "text-dx7-magenta" : ""}>
                          {macros.release > 0 ? `+${macros.release}` : macros.release}
                        </span>
                      </div>
                      <input 
                        type="range" min="-50" max="50" value={macros.release}
                        onChange={e => setMacros(m => ({...m, release: parseInt(e.target.value)}))}
                        className="w-full accent-[#00ffff] h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
                    <div className="md:col-span-5">
                      <AlgorithmDiagram algorithm={patch.algorithm} />
                    </div>
                    
                    <div className="md:col-span-7 grid grid-cols-2 gap-4">
                      <div className="p-4 bg-dx7-bg rounded-sm border-2 border-slate-800 flex flex-col items-center justify-center">
                        <Music size={20} className="text-dx7-teal mb-2" />
                        <span className="text-[10px] font-mono-tech uppercase tracking-widest text-slate-500">Feedback</span>
                        <span className="text-3xl font-lcd text-dx7-lcd-red">{patch.feedback}</span>
                      </div>
                      <div className="p-4 bg-dx7-bg rounded-sm border-2 border-slate-800 flex flex-col items-center justify-center">
                        <Cpu size={20} className="text-dx7-teal mb-2" />
                        <span className="text-[10px] font-mono-tech uppercase tracking-widest text-slate-500">Operators</span>
                        <span className="text-3xl font-lcd text-dx7-lcd-red">6</span>
                      </div>
                      <div className="col-span-2 p-4 bg-dx7-teal/10 border border-dx7-teal/20 rounded-sm flex items-center gap-4">
                         <Info size={16} className="text-dx7-teal shrink-0" />
                         <span className="text-[10px] font-mono-tech text-dx7-teal/80 uppercase">
                           Der Algorithmus bestimmt, wie die Operatoren einander modulieren. Die farbigen Boxen sind Carrier (Hörbar).
                         </span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Feedback for Operators */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {patch.ops.map((op, i) => (
                      <div key={i} className="p-4 bg-dx7-bg border-2 border-slate-800 rounded-sm group hover:border-dx7-teal/50 transition-colors">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[12px] font-mono-tech uppercase text-slate-400 group-hover:text-dx7-teal transition-colors">OP {6 - i}</span>
                          <div className="text-[10px] font-mono-tech text-slate-500">
                             OUT <span className="text-dx7-teal font-lcd text-lg">{op.out}</span>
                          </div>
                        </div>
                        
                        <EnvelopeDiagram 
                          r1={op.r1} r2={op.r2} r3={op.r3} r4={op.r4}
                          l1={op.l1} l2={op.l2} l3={op.l3} l4={op.l4}
                          color={i >= 3 ? "#ff0088" : "#00b4b4"} 
                        />
                        
                        <div className="mt-3 flex justify-between items-center font-mono-tech">
                          <div className="flex gap-2 items-center">
                            <span className="text-[10px] text-slate-500 uppercase">Freq</span>
                            <span className="text-[12px] font-lcd text-dx7-lcd-red">{op.f_coarse}.{op.f_fine}</span>
                          </div>
                          <div className="text-[10px] text-dx7-teal/70 uppercase">
                             {op.f_coarse === 0 ? "FIXED" : "RATIO"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <p className="text-center text-[10px] text-slate-600 font-black uppercase tracking-widest">
                  Patch ist kompatibel mit Yamaha DX7, DX7II, TX802, TX81Z (4-OP Emulation) und FM8
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center p-12 bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-3xl text-slate-600"
              >
                <Music size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-bold tracking-tight uppercase">Warte auf Eingabe...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Help Overlay */}
      <AnimatePresence>
        {activeHelp && HELP_TEXTS[activeHelp] && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
            onClick={() => setActiveHelp(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-dx7-panel border-4 border-[#151310] max-w-md w-full rounded-md shadow-2xl overflow-hidden"
            >
              <div className="bg-dx7-teal p-4 flex justify-between items-center text-dx7-bg">
                <h3 className="font-mono-tech font-bold uppercase tracking-widest flex items-center gap-2 text-sm">
                  <Info size={16} /> {HELP_TEXTS[activeHelp].title}
                </h3>
                <button onClick={() => setActiveHelp(null)} className="hover:bg-black/20 p-1 rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-slate-300 font-sans leading-relaxed text-sm">
                  {HELP_TEXTS[activeHelp].desc}
                </p>
                <button 
                  onClick={() => setActiveHelp(null)} 
                  className="mt-6 w-full py-3 bg-dx7-bg border-2 border-slate-700 rounded-sm font-mono-tech uppercase tracking-widest text-xs text-dx7-teal hover:border-dx7-teal/50 transition-colors shadow-lg shadow-black/50"
                >
                  Verstanden
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
