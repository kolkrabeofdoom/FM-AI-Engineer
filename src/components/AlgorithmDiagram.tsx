import React from 'react';

interface AlgorithmDiagramProps {
  algorithm: number;
  feedbackOp?: number; // Usually OP6
}

// Simple representation of the 32 DX7 algorithms
// Each stack is an array of operator numbers from bottom (carrier) to top
const ALGORITHMS: Record<number, number[][]> = {
  1: [[1, 2], [3, 4], [5, 6]],
  2: [[1, 2], [3, 4], [5, 6]], // 2 is same structure as 1 but different feedback
  3: [[1, 2, 3], [4, 5, 6]],
  4: [[1, 2, 3], [4, 5, 6]],
  5: [[1, 2], [3, 4], [5], [6]],
  6: [[1, 2], [3, 4], [5], [6]],
  7: [[1, 2, 3], [4], [5], [6]],
  8: [[1, 2, 3], [4], [5], [6]],
  9: [[1, 2, 3], [4], [5], [6]],
  10: [[1, 2], [3, 4, 5], [6]],
  11: [[1, 2], [3, 4, 5], [6]],
  12: [[1, 2], [3], [4], [5], [6]],
  13: [[1, 2], [3], [4], [5], [6]],
  14: [[1, 2], [3], [4, 5], [6]],
  15: [[1, 2], [3], [4, 5], [6]],
  16: [[1, 2, 3, 4, 5, 6]],
  17: [[1, 2, 3, 4, 5, 6]],
  18: [[1, 2, 3, 4], [5, 6]],
  19: [[1, 2, 3, 4, 5, 6]], // Actually 19 is quite complex, but let's simplify for now
  20: [[1, 2], [3, 4], [5, 6]],
  21: [[1, 2], [3, 4], [5, 6]],
  22: [[1, 2], [3, 4, 5, 6]],
  23: [[1, 2, 3, 4, 5, 6]],
  24: [[1, 2, 3, 4, 5, 6]],
  25: [[1, 2, 3, 4, 5, 6]],
  26: [[1, 2], [3, 4], [5], [6]],
  27: [[1, 2], [3, 4], [5], [6]],
  28: [[1, 2], [3], [4], [5, 6]],
  29: [[1, 2, 3, 4, 5], [6]],
  30: [[1, 2, 3, 4], [5, 6]],
  31: [[1, 2, 3, 4, 5, 6]],
  32: [[1], [2], [3], [4], [5], [6]], // All carriers
};

export const AlgorithmDiagram: React.FC<AlgorithmDiagramProps> = ({ algorithm }) => {
  const stacks = ALGORITHMS[algorithm] || [[1, 2, 3, 4, 5, 6]];

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-950/50 rounded-2xl border border-slate-800 h-full min-h-[160px]">
      <div className="flex items-end gap-3 h-full">
        {stacks.map((stack, stackIdx) => (
          <div key={stackIdx} className="flex flex-col-reverse items-center gap-1">
            {stack.map((opNum, opIdx) => (
              <div key={opNum} className="relative group">
                {/* Connection line to operator above */}
                {opIdx < stack.length - 1 && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0.5 h-1 bg-fuchsia-500/50" />
                )}
                
                <div className={`
                  w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-black
                  ${opIdx === 0 ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}
                  transition-all group-hover:scale-110
                `}>
                  {opNum}
                </div>

                {/* Feedback line for OP6 if applicable (Simplified) */}
                {opNum === 6 && (
                   <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full border border-indigo-500 opacity-50" title="Feedback" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
        ALGO {algorithm}
      </div>
    </div>
  );
};
