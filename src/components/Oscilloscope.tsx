import { useEffect, useRef } from 'react';
import { getAnalyser } from '../lib/audio';
import { Activity } from 'lucide-react';

export function Oscilloscope() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      const analyser = getAnalyser();
      
      // Background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // Draw Grid
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 40) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += 40) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Draw Center Line
      ctx.strokeStyle = 'rgba(30, 41, 59, 1)';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      if (analyser) {
        const bufferLength = analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00ffff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
        
        ctx.beginPath();
        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        // Flat line
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }

      requestRef.current = requestAnimationFrame(draw);
    };

    requestRef.current = requestAnimationFrame(draw);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="bg-dx7-panel border-b-4 border-[#151310] rounded-md p-4 shadow-xl overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <Activity size={14} className="text-dx7-teal" />
        <h3 className="text-[10px] font-mono-tech uppercase tracking-widest text-dx7-teal">Signal Oszilloskop</h3>
      </div>
      
      <div className="bg-[#0f172a] border-2 border-slate-800 rounded-sm relative group overflow-hidden">
        {/* CRT Scanline Effect Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,118,0.06))] z-10 bg-[length:100%_2px,3px_100%]" />
        
        <canvas 
          ref={canvasRef}
          width={400}
          height={160}
          className="w-full h-32 block"
        />
        
        <div className="absolute bottom-2 right-2 flex gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-dx7-teal animate-pulse" />
          <span className="text-[8px] font-mono-tech text-dx7-teal/50 uppercase">Live Output</span>
        </div>
      </div>
    </div>
  );
}
