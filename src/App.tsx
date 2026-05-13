import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Download, Music, Settings, Cpu, Layers, Info } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createDefaultPatch, createBankSysex } from './utils/dx7';
import type { DX7Patch } from './utils/dx7';
import { cn } from './lib/utils';
import { AlgorithmDiagram } from './components/AlgorithmDiagram';
import { EnvelopeDiagram } from './components/EnvelopeDiagram';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");

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
  const [patch, setPatch] = useState<DX7Patch | null>(null);
  const [error, setError] = useState<string | null>(null);

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

      setPatch(newPatch);
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
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans p-6 md:p-12 selection:bg-fuchsia-500/30">
      <header className="max-w-6xl mx-auto mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-fuchsia-500/20">
              <Cpu className="text-white" size={24} />
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">FM AI ENGINEER</h1>
          </div>
          <p className="text-slate-400 font-medium tracking-tight">The ultimate Yamaha DX7 Patch Designer powered by Gemini</p>
        </div>
        
        <div className="flex gap-4 p-1 bg-slate-800/50 rounded-lg border border-slate-700/50 backdrop-blur-sm">
          <div className="px-4 py-2 bg-slate-700/50 rounded-md text-[10px] font-black uppercase tracking-widest text-slate-300">v1.0.0 Stable</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Section */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl shadow-2xl backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles size={120} />
            </div>
            
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-fuchsia-500 mb-6 flex items-center gap-2">
              <Sparkles size={14} /> Sound-Spezifikation
            </h2>
            
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Beschreibe den Sound (z.B. 'Ein kristallklares E-Piano mit viel Anschlag und langem Hall...')"
              className="w-full h-40 bg-slate-950/50 border-2 border-slate-800 rounded-2xl p-6 text-lg focus:outline-none focus:border-fuchsia-500/50 transition-all resize-none placeholder:text-slate-600 font-medium"
            />
            
            <button
              onClick={generatePatch}
              disabled={isGenerating || !prompt}
              className={cn(
                "w-full mt-6 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all transform active:scale-[0.98]",
                isGenerating || !prompt 
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                  : "bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-xl shadow-fuchsia-500/20 hover:shadow-fuchsia-500/40 hover:translate-y-[-2px]"
              )}
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                  Konstruiere Wellenformen...
                </>
              ) : (
                <>
                  <Settings size={20} /> Patch Generieren
                </>
              )}
            </button>
            
            {error && <p className="mt-4 text-red-400 text-xs font-bold text-center italic">{error}</p>}
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
                <div className="bg-slate-900/80 border border-slate-700/50 rounded-3xl p-8 shadow-2xl backdrop-blur-xl border-t-slate-600/30">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-1">Patch Name</h3>
                      <div className="text-4xl font-black text-white tracking-tighter uppercase italic bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">
                        {patch.name}
                      </div>
                    </div>
                    <button 
                      onClick={downloadSysex}
                      className="p-4 bg-white text-slate-900 rounded-2xl hover:bg-fuchsia-500 hover:text-white transition-all shadow-xl hover:scale-110 active:scale-95 group"
                    >
                      <Download size={24} className="group-hover:animate-bounce" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
                    <div className="md:col-span-5">
                      <AlgorithmDiagram algorithm={patch.algorithm} />
                    </div>
                    
                    <div className="md:col-span-7 grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800 flex flex-col items-center justify-center">
                        <Music size={20} className="text-indigo-500 mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Feedback</span>
                        <span className="text-3xl font-black text-white">{patch.feedback}</span>
                      </div>
                      <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800 flex flex-col items-center justify-center">
                        <Cpu size={20} className="text-emerald-500 mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Operators</span>
                        <span className="text-3xl font-black text-white">6</span>
                      </div>
                      <div className="col-span-2 p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex items-center gap-4">
                         <Info size={16} className="text-indigo-400" />
                         <span className="text-[9px] font-bold text-indigo-300 leading-tight uppercase tracking-tighter">
                           Der Algorithmus bestimmt, wie die Operatoren einander modulieren. Die violetten Boxen sind Carrier (Hörbar).
                         </span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Feedback for Operators */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {patch.ops.map((op, i) => (
                      <div key={i} className="p-4 bg-slate-950/30 border border-slate-800/50 rounded-xl group hover:border-fuchsia-500/30 transition-colors">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] font-black uppercase text-slate-600 tracking-tighter group-hover:text-fuchsia-500/50 transition-colors">OP {6 - i}</span>
                          <div className="text-[10px] font-black text-slate-500">
                             OUT <span className="text-slate-300">{op.out}</span>
                          </div>
                        </div>
                        
                        <EnvelopeDiagram 
                          r1={op.r1} r2={op.r2} r3={op.r3} r4={op.r4}
                          l1={op.l1} l2={op.l2} l3={op.l3} l4={op.l4}
                          color={i >= 3 ? "#d946ef" : "#6366f1"} 
                        />
                        
                        <div className="mt-3 flex justify-between items-center">
                          <div className="flex gap-1">
                            <span className="text-[9px] font-bold text-slate-500">Freq:</span>
                            <span className="text-[9px] font-black text-slate-300">{op.f_coarse}.{op.f_fine}</span>
                          </div>
                          <div className="text-[9px] font-bold text-slate-600 italic">
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
    </div>
  );
}
