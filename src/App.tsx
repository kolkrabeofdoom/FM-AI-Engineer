import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Download, Music, Settings, Cpu, Info, HelpCircle, X, Dna, Upload, BookOpen, HardDrive, ChevronLeft, ChevronRight, Search, Image as ImageIcon, Mic, Ghost } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createDefaultPatch, createBankSysex, parseSysex } from './utils/dx7';
import type { DX7Patch } from './utils/dx7';
import { cn } from './lib/utils';
import { AlgorithmDiagram } from './components/AlgorithmDiagram';
import { EnvelopeDiagram } from './components/EnvelopeDiagram';
import { VirtualKeyboard } from './components/VirtualKeyboard';
import { Documentation } from './components/Documentation';
import { Cartridge } from './components/Cartridge';
import { Oscilloscope } from './components/Oscilloscope';
import { savePatchToCartridge } from './lib/storage';
import { initHexter, getHexter } from './lib/audio';

const PENTATONIC = [48, 51, 53, 55, 58, 60, 63, 65, 67, 70, 72];
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");

const HELP_TEXTS: Record<string, { title: string; desc: string }> = {
  brightness: {
    title: "Helligkeit (Brightness)",
    desc: "Dieser Regler skaliert das Output-Level (Out) aller Operatoren. In der FM-Synthese steuern die Modulator-Level die Intensität der Obertöne. Ein höherer Wert führt zu einem helleren, metallischeren Klang."
  },
  attack: {
    title: "Attack-Zeit",
    desc: "Steuert die Einschwingzeit (Rate 1) aller Operatoren. Ein positiver Wert verlängert die Attack-Phase (langsam), ein negativer Wert beschleunigt sie (perkussiv)."
  },
  release: {
    title: "Release-Zeit",
    desc: "Steuert die Ausklingzeit (Rate 4) aller Operatoren, nachdem die Taste losgelassen wurde. Positiv = längerer Ausklang."
  },
  vibrato: {
    title: "Vibrato (LFO)",
    desc: "Erhöht die Pitch-Modulation (PMD) und die LFO-Geschwindigkeit. Bringt Bewegung und Wackeln in statische Sounds."
  },
  feedback: {
    title: "Feedback (Intensität)",
    desc: "Erhöht oder verringert das Feedback des selbstmodulierenden Operators. Höhere Werte klingen rauer und rauschender."
  },
  detune: {
    title: "Fatness (Detune)",
    desc: "Verstimmt die Operatoren leicht gegeneinander. Sorgt für Schwebungen und den typischen analogen, breiten 80s-Chorus-Effekt."
  },
  decay: {
    title: "Decay (Pluckiness)",
    desc: "Verändert Rate 2 und Rate 3. Macht aus endlos anhaltenden Flächensounds kurze, gezupfte (perkussive) Sounds."
  },
  harmonics: {
    title: "Harmonics (Inharmonicity)",
    desc: "Verschiebt die Frequenz (f_coarse) der Modulatoren. Ungerade Verschiebungen erzeugen unmusikalische, glockige oder schräge Klangfarben."
  }
};

const MUTATIONS = [
  { id: '80s', icon: '🪩', label: 'Mehr 80s-Feeling', prompt: 'Mache den Sound breiter, mit mehr Chorus-Charakter und klassischem 80er Jahre FM-Vibe.' },
  { id: 'harder', icon: '🔨', label: 'Perkussiver & Härter', prompt: 'Mache den Attack knackiger, füge mehr FM-Punch hinzu, ideal für Bässe oder Plucks.' },
  { id: 'pad', icon: '☁️', label: 'Weicher & Pad-artiger', prompt: 'Verlängere Attack und Release, reduziere hartes Feedback und mache den Sound wärmer und fließender.' },
  { id: 'glass', icon: '🧊', label: 'Metallischer & Gläserner', prompt: 'Erhöhe die Carrier/Modulator Frequenzen leicht, füge mehr glockige und gläserne Obertöne hinzu.' },
  { id: 'lofi', icon: '👾', label: 'Lo-Fi & Vintage', prompt: 'Füge leichtes Detuning hinzu, erhöhe das Noise/Feedback leicht für einen analogen und instabilen Charakter.' },
  { id: 'dirty', icon: '🎸', label: 'Dreckiger & Aggressiver', prompt: 'Erhöhe das Feedback stark, nutze starkes Detuning und schneidende Obertöne für einen aggressiven Sound.' },
  { id: 'sub', icon: '🌌', label: 'Tiefer & Sub-bassiger', prompt: 'Oktaviere die Carrier nach unten (f_coarse anpassen), fokussiere auf den Grundton für tiefe Bässe.' },
  { id: 'random', icon: '🎲', label: 'Zufällige Mutation', prompt: 'Überrasch mich! Verändere den Charakter subtil aber hörbar in eine zufällige Richtung.' }
];

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
  const [macros, setMacros] = useState({ 
    brightness: 0, attack: 0, release: 0,
    vibrato: 0, feedback: 0, detune: 0, decay: 0, harmonics: 0
  });
  const [activeHelp, setActiveHelp] = useState<string | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'synth' | 'docs' | 'cartridge'>('synth');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<{ data: string, mimeType: string, url: string } | null>(null);
  const [isGhostMode, setIsGhostMode] = useState(false);
  const ghostVoiceRef = useRef<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = (event.target?.result as string).split(',')[1];
      setMediaFile({
        data: base64Data,
        mimeType: file.type,
        url: URL.createObjectURL(file)
      });
    };
    reader.readAsDataURL(file);

    if (mediaInputRef.current) {
      mediaInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const buffer = await file.arrayBuffer();
      const importedPatch = parseSysex(buffer);
      setOriginalPatch(importedPatch);
      setMacros({ brightness: 0, attack: 0, release: 0, vibrato: 0, feedback: 0, detune: 0, decay: 0, harmonics: 0 });
      setPrompt(`Imported Patch: ${importedPatch.name}`);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(`Import Error: ${err.message || "Failed to parse Sysex file."}`);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  const patch = useMemo(() => {
    if (!originalPatch) return null;
    const lfo_speed = Math.max(0, Math.min(99, (originalPatch.lfo_speed ?? 35) + macros.vibrato * 2));
    const lfo_pmd = Math.max(0, Math.min(99, (originalPatch.lfo_pmd ?? 0) + macros.vibrato));
    const feedback = Math.max(0, Math.min(7, originalPatch.feedback + Math.floor(macros.feedback / 10)));

    return {
      ...originalPatch,
      feedback,
      lfo_speed,
      lfo_pmd,
      ops: originalPatch.ops.map((op, i) => {
        const out = Math.max(0, Math.min(99, op.out + macros.brightness));
        const r1 = Math.max(0, Math.min(99, op.r1 - macros.attack));
        const r4 = Math.max(0, Math.min(99, op.r4 - macros.release));
        const r2 = Math.max(0, Math.min(99, op.r2 + macros.decay));
        const r3 = Math.max(0, Math.min(99, op.r3 + macros.decay));
        const detune = Math.max(0, Math.min(14, op.detune + Math.floor(macros.detune / 4)));
        
        let f_coarse = op.f_coarse;
        if (i < 5 && macros.harmonics !== 0) {
           f_coarse = Math.max(0, Math.min(31, op.f_coarse + Math.floor(macros.harmonics / 10)));
        }

        return { ...op, out, r1, r2, r3, r4, detune, f_coarse };
      })
    };
  }, [originalPatch, macros]);

  // Ghost Mode Logic
  useEffect(() => {
    if (!isGhostMode || !patch) return;



    // Arpeggiator
    const arpInterval = setInterval(async () => {
      try {
        const synth = await initHexter();
        const note = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
        const finalNote = note + (Math.random() > 0.5 ? -12 : 0);
        
        if (ghostVoiceRef.current !== null && ghostVoiceRef.current !== undefined) {
           synth.noteOff(ghostVoiceRef.current);
        }

        synth.loadPatch(patch);
        synth.noteOn(finalNote, 80);
        ghostVoiceRef.current = finalNote;
      } catch (e) {}
    }, 4000);

    // Algorithmic Drift
    const driftInterval = setInterval(() => {
      setMacros(prev => ({
        ...prev,
        brightness: Math.max(-50, Math.min(50, prev.brightness + Math.floor(Math.random() * 10 - 5))),
        vibrato: Math.max(-50, Math.min(50, prev.vibrato + Math.floor(Math.random() * 6 - 3))),
        harmonics: Math.max(-50, Math.min(50, prev.harmonics + Math.floor(Math.random() * 8 - 4))),
        feedback: Math.max(-50, Math.min(50, prev.feedback + Math.floor(Math.random() * 10 - 5))),
      }));
    }, 8000);

    return () => {
      clearInterval(arpInterval);
      clearInterval(driftInterval);
      if (ghostVoiceRef.current !== null && ghostVoiceRef.current !== undefined) {
         getHexter()?.noteOff(ghostVoiceRef.current);
         ghostVoiceRef.current = null;
      }
    };
  }, [isGhostMode, patch]);

  const generatePatch = async () => {
    if (!prompt && !mediaFile) return;
    setIsGenerating(true);
    setError(null);

    try {
      console.log("Starting generation with gemini-flash-latest...");
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      
      let finalPrompt = `Create a DX7 patch for: ${prompt}`;
      const parts: any[] = [{ text: SYSTEM_PROMPT }];

      if (mediaFile) {
        if (mediaFile.mimeType.startsWith('audio/')) {
           finalPrompt = `Analysiere dieses Audio. Generiere den exakten DX7 Patch, um diese Klangfarbe nachzubauen. Achte auf Hüllkurven und Algorithmus. ${prompt ? 'Zusätzliche Info: ' + prompt : ''}`;
        } else if (mediaFile.mimeType.startsWith('image/')) {
           finalPrompt = `Analysiere die Stimmung, Farben und Textur dieses Bildes. Generiere einen DX7 Patch, der dieses Bild klanglich perfekt repräsentiert. ${prompt ? 'Zusätzliche Info: ' + prompt : ''}`;
        }
        parts.push({
          inlineData: {
            data: mediaFile.data,
            mimeType: mediaFile.mimeType
          }
        });
      }
      
      parts.push({ text: finalPrompt });

      const result = await model.generateContent(parts);
      
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
      setMacros({ brightness: 0, attack: 0, release: 0, vibrato: 0, feedback: 0, detune: 0, decay: 0, harmonics: 0 });
      setAnalysisResult(null); // Reset analysis on new patch
    } catch (err: any) {
      console.error(err);
      setError(`Error: ${err.message || "Failed to generate patch."}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const mutatePatch = async (mutationId: string, mutationPrompt: string) => {
    if (!originalPatch) return;
    setMutatingId(mutationId);
    setError(null);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      
      const MUTATION_SYSTEM_PROMPT = `You are a Yamaha DX7 FM Synthesis Engineer.
You are given an existing DX7 patch JSON. Your task is to apply a specific mutation requested by the user, while keeping the general character intact.
Output ONLY the modified JSON object. Do not include markdown or explanations.
Existing Patch:
${JSON.stringify(originalPatch, null, 2)}`;

      const result = await model.generateContent([
        { text: MUTATION_SYSTEM_PROMPT },
        { text: `Mutation instruction: ${mutationPrompt}` }
      ]);
      
      const text = result.response.text();
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const data = JSON.parse(cleaned);

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
      setMacros({ brightness: 0, attack: 0, release: 0, vibrato: 0, feedback: 0, detune: 0, decay: 0, harmonics: 0 }); // Reset macros after mutation
      setAnalysisResult(null);
    } catch (err: any) {
      console.error(err);
      setError(`Mutation Error: ${err.message || "Failed to mutate patch."}`);
    } finally {
      setMutatingId(null);
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
    const blob = new Blob([sysex.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const analyzePatch = async () => {
    if (!originalPatch) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      const promptText = `Du bist ein DX7 Experte. Analysiere diesen DX7 Patch und erkläre kurz und prägnant auf Deutsch, warum er so klingt, wie er klingt. Fokussiere dich auf den gewählten Algorithmus, das Feedback und auffällige Frequenzen/Hüllkurven. Erkläre es so, dass es ein Musiker versteht. Halte dich extrem kurz (max. 4-5 Sätze).\n\nPatch: ${JSON.stringify(originalPatch, null, 2)}`;
      
      const result = await model.generateContent([{ text: promptText }]);
      setAnalysisResult(result.response.text());
    } catch (err: any) {
      console.error(err);
      setError(`Analyse Error: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const breedAI = async (patchA: DX7Patch, patchB: DX7Patch) => {
    setIsGenerating(true);
    setError(null);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      const promptText = `Du bist ein Yamaha DX7 Experte. Der User möchte zwei Patches "kreuzen" (Breeding).
Patch A:
${JSON.stringify(patchA, null, 2)}

Patch B:
${JSON.stringify(patchB, null, 2)}

Kombiniere die besten Eigenschaften beider Patches zu einem neuen, genialen Sound. Nutze das exakte JSON-Format. Output ONLY das fertige JSON, keine Erklärungen.`;
      
      const result = await model.generateContent([{ text: promptText }]);
      const text = result.response.text();
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const data = JSON.parse(cleaned);

      const defaultPatch = createDefaultPatch();
      const newPatch: DX7Patch = {
        ...defaultPatch,
        ...data,
        name: data.name ? data.name.substring(0, 10).toUpperCase() : "AI_HYBRID",
        ops: data.ops.map((op: any, i: number) => ({
          ...defaultPatch.ops[i],
          ...op
        }))
      };

      setOriginalPatch(newPatch);
      setMacros({ brightness: 0, attack: 0, release: 0, vibrato: 0, feedback: 0, detune: 0, decay: 0, harmonics: 0 });
      setAnalysisResult(null);
      setPrompt(`Bred from ${patchA.name} and ${patchB.name}`);
      setActiveTab('synth');
    } catch (err: any) {
      console.error(err);
      setError(`Breeding Error: ${err.message || "Failed to breed patches."}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-dx7-bg text-slate-100 font-sans p-6 md:p-12 selection:bg-dx7-teal/30">
      <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-dx7-teal rounded-sm border-2 border-dx7-panel flex items-center justify-center shadow-lg shadow-dx7-teal/20">
              <Cpu className="text-dx7-bg" size={24} />
            </div>
            <h1 className="text-3xl font-lcd tracking-widest text-white uppercase italic">FM AI ENGINEER</h1>
          </div>
          <p className="text-slate-400 font-mono-tech tracking-tight">The ultimate Yamaha DX7 Patch Designer</p>
        </div>
        
        <div className="flex flex-col items-end gap-4">
          <div className="px-4 py-1 bg-dx7-magenta rounded-sm border-2 border-[#cc0066] text-[10px] font-mono-tech uppercase tracking-widest text-white font-bold">v3.0.0 Stable</div>
          
          <div className="flex gap-2 bg-slate-900 p-1 rounded-md border border-slate-800">
            <button 
              onClick={() => setActiveTab('synth')}
              className={cn(
                "px-4 py-2 rounded-sm text-xs font-mono-tech uppercase tracking-widest flex items-center gap-2 transition-all",
                activeTab === 'synth' ? "bg-dx7-panel text-dx7-teal shadow-md" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <Settings size={14} /> Generator
            </button>
            <button 
              onClick={() => setActiveTab('cartridge')}
              className={cn(
                "px-4 py-2 rounded-sm text-xs font-mono-tech uppercase tracking-widest flex items-center gap-2 transition-all",
                activeTab === 'cartridge' ? "bg-dx7-panel text-dx7-teal shadow-md" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <HardDrive size={14} /> Cartridge
            </button>
            <button 
              onClick={() => setActiveTab('docs')}
              className={cn(
                "px-4 py-2 rounded-sm text-xs font-mono-tech uppercase tracking-widest flex items-center gap-2 transition-all",
                activeTab === 'docs' ? "bg-dx7-panel text-dx7-teal shadow-md" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <BookOpen size={14} /> Handbuch
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'docs' ? (
        <Documentation />
      ) : activeTab === 'cartridge' ? (
        <Cartridge 
          onLoadPatch={(p) => {
            setOriginalPatch(p);
            setMacros({ brightness: 0, attack: 0, release: 0, vibrato: 0, feedback: 0, detune: 0, decay: 0, harmonics: 0 });
            setPrompt(`Loaded from Cartridge: ${p.name}`);
            setActiveTab('synth');
          }} 
          onBreedAI={breedAI}
        />
      ) : (
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
              className="w-full h-32 bg-dx7-bg border-2 border-slate-800 rounded-sm p-6 text-lg font-mono-tech text-dx7-teal focus:outline-none focus:border-dx7-teal/50 transition-all resize-none placeholder:text-slate-600 mb-4"
            />
            
            {/* Media Upload Area */}
            <div className="flex gap-4">
              <button 
                onClick={() => mediaInputRef.current?.click()}
                className="flex-1 py-3 border-2 border-dashed border-slate-700 bg-slate-900/50 hover:bg-slate-800 rounded-sm flex items-center justify-center gap-3 text-slate-400 hover:text-dx7-teal transition-all font-mono-tech text-xs tracking-widest uppercase"
              >
                {mediaFile ? (
                   <span className="text-dx7-teal flex items-center gap-2">
                     {mediaFile.mimeType.startsWith('image/') ? <ImageIcon size={16} /> : <Mic size={16} />}
                     Media geladen. Klicken zum Ändern.
                   </span>
                ) : (
                  <>
                    <Upload size={16} /> Drop Audio/Image (.wav, .mp3, .jpg, .png)
                  </>
                )}
              </button>
              {mediaFile && (
                <button 
                  onClick={() => setMediaFile(null)} 
                  className="px-4 border-2 border-slate-800 bg-slate-900 text-dx7-magenta hover:bg-[#cc0066] hover:text-white rounded-sm transition-all"
                  title="Media entfernen"
                >
                  <X size={16} />
                </button>
              )}
              <input 
                type="file" 
                accept="image/*,audio/*" 
                ref={mediaInputRef} 
                onChange={handleMediaUpload} 
                className="hidden" 
              />
            </div>
            
            {mediaFile && mediaFile.mimeType.startsWith('image/') && (
              <div className="mt-4 border-2 border-slate-800 p-2 rounded-sm bg-slate-900 flex justify-center">
                <img src={mediaFile.url} alt="Uploaded media" className="h-24 object-contain rounded-sm" />
              </div>
            )}
            {mediaFile && mediaFile.mimeType.startsWith('audio/') && (
              <div className="mt-4 border-2 border-slate-800 p-4 rounded-sm bg-slate-900 flex items-center justify-center gap-3 text-dx7-teal font-mono-tech uppercase tracking-widest text-xs">
                <Mic size={20} className="animate-pulse" /> Audio-Referenz geladen
              </div>
            )}
            
            <div className="flex gap-4 mt-6">
              <button
                onClick={generatePatch}
                disabled={isGenerating || (!prompt && !mediaFile)}
                className={cn(
                  "flex-1 py-4 rounded-sm font-mono-tech font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all transform active:translate-y-1 border-b-4",
                  isGenerating || (!prompt && !mediaFile)
                    ? "bg-slate-800 text-slate-500 border-slate-900 cursor-not-allowed" 
                    : "bg-dx7-teal text-dx7-bg border-[#008888] shadow-xl shadow-dx7-teal/20 hover:brightness-110"
                )}
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-3 border-dx7-bg/20 border-t-dx7-bg rounded-full animate-spin" />
                    Konstruiere...
                  </>
                ) : (
                  <>
                    <Settings size={20} /> Generieren
                  </>
                )}
              </button>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-4 rounded-sm font-mono-tech font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all transform active:translate-y-1 border-b-4 bg-slate-800 text-dx7-teal border-slate-900 hover:bg-slate-700 shadow-xl shadow-slate-900/50"
                title="Importiere eine .syx Datei"
              >
                <Upload size={20} /> Import
              </button>
              <input 
                type="file" 
                accept=".syx" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </div>
            
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

          {/* Evolution Panel (Left Column) */}
          <AnimatePresence>
            {originalPatch && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-dx7-panel border-b-4 border-[#151310] rounded-md p-6 shadow-xl relative overflow-hidden"
              >
                <h3 className="text-[10px] font-mono-tech uppercase tracking-widest text-dx7-magenta mb-4 flex items-center gap-2">
                  <Dna size={14} /> Sound-Evolution (Mutate)
                </h3>
                <div className="flex flex-wrap gap-3">
                  {MUTATIONS.map(mut => (
                    <button
                      key={mut.id}
                      onClick={() => mutatePatch(mut.id, mut.prompt)}
                      disabled={mutatingId !== null || isGenerating}
                      className={cn(
                        "px-4 py-2 text-[10px] sm:text-xs font-mono-tech uppercase tracking-wide rounded-sm border-2 transition-all flex items-center gap-2",
                        mutatingId === mut.id 
                          ? "bg-dx7-magenta text-white border-[#cc0066] shadow-[0_0_15px_rgba(204,0,102,0.5)]" 
                          : "bg-dx7-bg text-slate-300 border-slate-700 hover:border-dx7-magenta hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      {mutatingId === mut.id ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <span>{mut.icon}</span>
                      )}
                      {mut.label}
                    </button>
                  ))}
                </div>
                
                <div className="mt-6 pt-6 border-t-2 border-slate-800">
                  <button
                    onClick={() => setIsGhostMode(!isGhostMode)}
                    className={cn(
                      "w-full py-3 border-2 rounded-sm font-mono-tech uppercase tracking-widest text-[10px] transition-all flex justify-center items-center gap-2 mb-4",
                      isGhostMode ? "bg-dx7-teal/20 border-dx7-teal text-dx7-teal shadow-[0_0_15px_rgba(0,255,255,0.3)] animate-pulse" : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300"
                    )}
                  >
                    <Ghost size={14} /> {isGhostMode ? "Ghost Mode: Active (Auto-Evolving)" : "Ghost in the Machine (Auto-Play)"}
                  </button>

                  <button
                    onClick={analyzePatch}
                    disabled={isAnalyzing || isGenerating || mutatingId !== null}
                    className="w-full py-3 bg-slate-900 border-2 border-slate-800 text-dx7-teal font-mono-tech uppercase tracking-widest text-[10px] rounded-sm hover:border-dx7-teal/50 hover:bg-slate-800 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {isAnalyzing ? <div className="w-3 h-3 border-2 border-dx7-teal/30 border-t-dx7-teal rounded-full animate-spin" /> : <Search size={14} />}
                    {isAnalyzing ? "Analysiere Sound-DNA..." : "Warum klingt das so? (Analyse)"}
                  </button>
                  
                  {analysisResult && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 p-4 bg-dx7-teal/10 border border-dx7-teal/20 rounded-sm"
                    >
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-dx7-teal mb-2 flex items-center gap-2">
                        <Search size={12} /> KI-Analyse
                      </h4>
                      <p className="text-xs font-sans text-dx7-teal/80 leading-relaxed italic">
                        "{analysisResult}"
                      </p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Oscilloscope Section */}
          <div className="mt-6">
            <Oscilloscope />
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
                      <div className="font-lcd tracking-[0.2em] text-[#90EE90] bg-[#1a2f23] p-4 rounded-sm shadow-[inset_0_5px_15px_rgba(0,0,0,0.8)] uppercase border-4 border-[#0d1a12] flex flex-col relative overflow-hidden">
                        {/* LCD Grid/Scanline Overlay */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none"></div>
                        
                        <div className="relative z-10 flex justify-between w-full text-2xl md:text-3xl mb-1 text-shadow-glow">
                          <span className="whitespace-pre">{">" + (patch.name || "INIT VOICE").substring(0, 10).padEnd(10, " ")}</span>
                          <span className="opacity-70 whitespace-pre">{" "}</span>
                        </div>
                        <div className="relative z-10 flex justify-between w-full text-2xl md:text-3xl opacity-80 text-shadow-glow">
                          <span className="whitespace-pre">{" ALG:" + patch.algorithm.toString().padStart(2, "0")}</span>
                          <span className="whitespace-pre">{"F:" + patch.feedback}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          try {
                            savePatchToCartridge(patch);
                            alert(`Patch '${patch.name}' wurde erfolgreich in die Cartridge gespeichert!`);
                          } catch (e: any) {
                            alert(e.message);
                          }
                        }}
                        className="p-4 bg-[#2A231F] text-[#D4AF37] border-b-4 border-[#1A1512] rounded-sm hover:brightness-110 transition-all active:translate-y-1 active:border-b-0 group"
                        title="In RAM Cartridge speichern"
                      >
                        <HardDrive size={24} className="group-hover:text-white transition-colors" />
                      </button>
                      <button 
                        onClick={downloadSysex}
                        className="p-4 bg-dx7-magenta text-white border-b-4 border-[#cc0066] rounded-sm hover:brightness-110 transition-all active:translate-y-1 active:border-b-0 group"
                        title="Als einzelne .syx Datei herunterladen"
                      >
                        <Download size={24} className="group-hover:animate-pulse" />
                      </button>
                    </div>
                  </div>

                  {/* Tweaking Panel */}
                  <div className="bg-dx7-bg border-2 border-slate-800 p-6 rounded-sm mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
                    {[
                      { id: 'brightness', label: 'Helligkeit', icon: '☀️' },
                      { id: 'attack', label: 'Attack', icon: '📈' },
                      { id: 'decay', label: 'Decay', icon: '📉' },
                      { id: 'release', label: 'Release', icon: '🌊' },
                      { id: 'feedback', label: 'Feedback', icon: '⚡' },
                      { id: 'detune', label: 'Fatness', icon: '🎸' },
                      { id: 'vibrato', label: 'Vibrato', icon: '〰️' },
                      { id: 'harmonics', label: 'Harmonics', icon: '🔔' },
                    ].map(macro => (
                      <div key={macro.id} className="flex flex-col gap-3">
                        <div className="flex justify-between items-center h-4 text-[10px] font-mono-tech uppercase tracking-widest text-slate-400">
                          <div className="flex items-center gap-2">
                            <span>{macro.icon} {macro.label}</span>
                            <button onClick={() => setActiveHelp(macro.id)} className="hover:text-dx7-teal transition-colors" title={`Info zu ${macro.label}`}><HelpCircle size={12} /></button>
                          </div>
                          <span className={cn(
                            "w-8 text-right shrink-0",
                            (macros as any)[macro.id] > 0 ? "text-dx7-teal" : (macros as any)[macro.id] < 0 ? "text-dx7-magenta" : ""
                          )}>
                            {(macros as any)[macro.id] > 0 ? `+${(macros as any)[macro.id]}` : (macros as any)[macro.id]}
                          </span>
                        </div>
                        <input 
                          type="range" min="-50" max="50" value={(macros as any)[macro.id]}
                          onChange={e => setMacros(m => ({...m, [macro.id]: parseInt(e.target.value)}))}
                          className="w-full accent-[#00ffff] h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
                    <div className="md:col-span-5">
                      <div className="bg-[#151310] border border-slate-800 rounded-sm overflow-hidden flex flex-col h-full">
                        <div className="bg-slate-900 px-4 py-2 flex justify-between items-center border-b border-slate-800">
                           <span className="text-[10px] font-mono-tech uppercase tracking-widest text-slate-500">Algorithm</span>
                           <div className="flex items-center gap-3">
                             <button 
                               onClick={() => setOriginalPatch(p => p ? {...p, algorithm: p.algorithm > 1 ? p.algorithm - 1 : 32} : null)}
                               className="text-dx7-teal hover:text-white transition-colors p-1 bg-slate-800 rounded"
                             >
                               <ChevronLeft size={14} />
                             </button>
                             <span className="font-lcd text-dx7-lcd-red text-xl w-6 text-center">{patch.algorithm}</span>
                             <button 
                               onClick={() => setOriginalPatch(p => p ? {...p, algorithm: p.algorithm < 32 ? p.algorithm + 1 : 1} : null)}
                               className="text-dx7-teal hover:text-white transition-colors p-1 bg-slate-800 rounded"
                             >
                               <ChevronRight size={14} />
                             </button>
                           </div>
                        </div>
                        <div className="flex-1 p-4">
                          <AlgorithmDiagram algorithm={patch.algorithm} />
                        </div>
                      </div>
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
                        
                        <div className="mt-3 flex justify-between items-center font-mono-tech h-4">
                          <div className="flex gap-2 items-center truncate">
                            <span className="text-[10px] text-slate-500 uppercase shrink-0">Freq</span>
                            <span className="text-[12px] font-lcd text-dx7-lcd-red truncate">{op.f_coarse}.{op.f_fine}</span>
                          </div>
                          <div className="text-[10px] text-dx7-teal/70 uppercase shrink-0">
                             {op.f_coarse === 0 ? "FIXED" : "RATIO"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <VirtualKeyboard patch={patch} />
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
      )}

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
