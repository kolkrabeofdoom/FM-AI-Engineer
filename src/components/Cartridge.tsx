import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Download, Trash2, Upload, Database, ChevronRight, HardDrive, Dna, Bot, Zap } from 'lucide-react';
import type { DX7Patch } from '../utils/dx7';
import { createFullBankSysex } from '../utils/dx7';
import { getCartridgeBank, deletePatchFromCartridge } from '../lib/storage';
import { cn } from '../lib/utils';

interface CartridgeProps {
  onLoadPatch: (patch: DX7Patch) => void;
  onBreedAI: (patchA: DX7Patch, patchB: DX7Patch) => void;
}

export function Cartridge({ onLoadPatch, onBreedAI }: CartridgeProps) {
  const [bank, setBank] = useState<(DX7Patch | null)[]>(Array(32).fill(null));
  const [isBreedMode, setIsBreedMode] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);

  useEffect(() => {
    setBank(getCartridgeBank());
  }, []);

  const handleDelete = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Möchtest du diesen Patch wirklich löschen?")) {
      deletePatchFromCartridge(index);
      setBank(getCartridgeBank());
    }
  };

  const downloadBank = () => {
    const sysex = createFullBankSysex(bank);
    const blob = new Blob([sysex.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "FM_AI_ENGINEER_BANK.syx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const usedSlots = bank.filter(p => p !== null).length;

  const toggleBreedMode = () => {
    setIsBreedMode(!isBreedMode);
    setSelectedSlots([]);
  };

  const handleSlotClick = (index: number, patch: DX7Patch | null) => {
    if (!patch) return;
    
    if (isBreedMode) {
      if (selectedSlots.includes(index)) {
        setSelectedSlots(selectedSlots.filter(s => s !== index));
      } else if (selectedSlots.length < 2) {
        setSelectedSlots([...selectedSlots, index]);
      }
    } else {
      onLoadPatch(patch);
    }
  };

  const algorithmicBreed = () => {
    const pA = bank[selectedSlots[0]];
    const pB = bank[selectedSlots[1]];
    if (!pA || !pB) return;

    const hybrid: DX7Patch = {
      ...pA,
      name: "HYBRID_FM",
      algorithm: Math.random() > 0.5 ? pA.algorithm : pB.algorithm,
      feedback: Math.random() > 0.5 ? pA.feedback : pB.feedback,
      ops: pA.ops.map((op, i) => i < 3 ? op : pB.ops[i])
    };
    
    setIsBreedMode(false);
    setSelectedSlots([]);
    onLoadPatch(hybrid);
  };

  const aiBreed = () => {
    const pA = bank[selectedSlots[0]];
    const pB = bank[selectedSlots[1]];
    if (!pA || !pB) return;
    
    setIsBreedMode(false);
    setSelectedSlots([]);
    onBreedAI(pA, pB);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-5xl mx-auto pb-24"
    >
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-lcd tracking-widest text-dx7-teal uppercase flex items-center gap-3">
            <HardDrive size={28} /> RAM Data Cartridge
          </h2>
          <p className="text-slate-400 font-mono-tech uppercase text-xs mt-2 tracking-widest">
            Voice Library ({usedSlots}/32 Slots belegt)
          </p>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={toggleBreedMode}
            className={cn(
              "px-6 py-4 font-mono-tech font-bold uppercase tracking-widest flex items-center gap-3 rounded-sm border-b-4 transition-all shadow-xl",
              isBreedMode 
                ? "bg-dx7-teal text-dx7-bg border-[#008888] shadow-dx7-teal/20" 
                : "bg-[#2A231F] text-dx7-teal border-[#1A1512] hover:brightness-110 active:translate-y-1 active:border-b-0"
            )}
          >
            <Dna size={20} /> {isBreedMode ? "Breeding aktiv" : "Breed Patches"}
          </button>
          <button 
            onClick={downloadBank}
            className="px-6 py-4 bg-[#cc0066] text-white font-mono-tech font-bold uppercase tracking-widest flex items-center gap-3 rounded-sm border-b-4 border-[#880044] hover:brightness-110 active:translate-y-1 active:border-b-0 transition-all shadow-xl shadow-[#cc0066]/20"
          >
            <Download size={20} /> Export Full Bank
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isBreedMode && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-dx7-teal/10 border border-dx7-teal/20 rounded-md p-6 mb-8 flex flex-col items-center justify-center gap-4"
          >
            <h3 className="text-dx7-teal font-mono-tech uppercase tracking-widest text-sm flex items-center gap-2">
              <Dna size={16} /> Wähle 2 Patches aus der Cartridge ({selectedSlots.length}/2)
            </h3>
            
            {selectedSlots.length === 2 && (
              <div className="flex gap-4 mt-2">
                <button 
                  onClick={algorithmicBreed}
                  className="px-4 py-2 bg-slate-800 text-dx7-teal border-2 border-slate-700 rounded-sm font-mono-tech text-xs uppercase tracking-widest hover:border-dx7-teal/50 transition-colors flex items-center gap-2"
                >
                  <Zap size={14} /> Algorithmic Cross (Instant)
                </button>
                <button 
                  onClick={aiBreed}
                  className="px-4 py-2 bg-dx7-magenta text-white border-2 border-[#cc0066] rounded-sm font-mono-tech text-xs uppercase tracking-widest hover:brightness-110 transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(204,0,102,0.4)]"
                >
                  <Bot size={14} /> AI Merge (Smart)
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cartridge Physical Body */}
      <div className="bg-[#2A231F] p-8 md:p-12 rounded-t-3xl border-t-8 border-x-8 border-[#1A1512] shadow-2xl shadow-black/80 relative">
        {/* Grip lines at the top */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-4">
          <div className="w-16 h-2 bg-[#1A1512] rounded-full shadow-inner" />
          <div className="w-16 h-2 bg-[#1A1512] rounded-full shadow-inner" />
          <div className="w-16 h-2 bg-[#1A1512] rounded-full shadow-inner" />
        </div>

        {/* Golden Label Area */}
        <div className="bg-[#D4AF37] p-1.5 rounded-sm shadow-inner mt-8">
          <div className="bg-[#F3E5AB] min-h-[400px] rounded-sm border border-[#8C7326] p-6 text-slate-900">
            
            <div className="border-b-2 border-[#8C7326] pb-4 mb-6 flex justify-between items-end">
              <div>
                <h3 className="font-sans font-black text-3xl tracking-tighter text-[#2A231F] uppercase">Data RAM</h3>
                <p className="font-mono-tech text-xs font-bold text-[#8C7326] tracking-widest">Voice Bank (32 Voice)</p>
              </div>
              <div className="text-right">
                <span className="font-sans font-black text-xl text-[#2A231F] tracking-tighter">AI-1</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2">
              {bank.map((patch, i) => (
                <div 
                  key={i} 
                  onClick={() => handleSlotClick(i, patch)}
                  className={cn(
                    "flex items-center justify-between border-b border-[#8C7326]/30 py-2 group",
                    patch ? "cursor-pointer transition-colors" : "opacity-50",
                    patch && !isBreedMode && "hover:bg-[#D4AF37]/20",
                    isBreedMode && selectedSlots.includes(i) && "bg-dx7-teal/20 border-dx7-teal shadow-[inset_4px_0_0_#00ffff]"
                  )}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="font-mono-tech font-bold text-[#8C7326] text-xs w-5 text-right shrink-0">
                      {(i + 1).toString().padStart(2, '0')}
                    </span>
                    {patch ? (
                      <span className="font-mono-tech font-bold text-[#2A231F] text-sm truncate uppercase tracking-wider">
                        {patch.name}
                      </span>
                    ) : (
                      <span className="font-mono-tech text-[#8C7326] text-xs italic tracking-widest">
                        &lt; LEER &gt;
                      </span>
                    )}
                  </div>
                  
                  {patch && !isBreedMode && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button 
                        className="text-[#2A231F] hover:text-dx7-teal p-1"
                        title="In Generator laden"
                      >
                        <ChevronRight size={16} strokeWidth={3} />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(i, e)}
                        className="text-[#2A231F] hover:text-[#cc0066] p-1"
                        title="Löschen"
                      >
                        <Trash2 size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 text-center border-t-2 border-[#8C7326] pt-4">
              <span className="font-sans font-black text-[#2A231F] text-sm tracking-widest uppercase">
                YAMAHA
              </span>
            </div>
          </div>
        </div>
        
        {/* Cartridge Connector Bottom */}
        <div className="absolute -bottom-4 left-8 right-8 h-8 bg-[#1A1512] rounded-b-lg flex justify-between px-12 pt-2 overflow-hidden">
           {Array(20).fill(0).map((_, i) => (
             <div key={i} className="w-3 h-full bg-[#D4AF37] rounded-t-sm" />
           ))}
        </div>
      </div>
    </motion.div>
  );
}
