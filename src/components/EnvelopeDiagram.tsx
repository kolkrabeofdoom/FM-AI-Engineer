import React from 'react';

interface EnvelopeDiagramProps {
  r1: number; r2: number; r3: number; r4: number;
  l1: number; l2: number; l3: number; l4: number;
  color?: string;
}

export const EnvelopeDiagram: React.FC<EnvelopeDiagramProps> = ({ 
  r1, r2, r3, r4, 
  l1, l2, l3, l4,
  color = "#d946ef" 
}) => {
  // Map rates (0-99) to widths (inverse, 99 is fast = short width)
  // Max width for each segment is 25
  const getWidth = (r: number) => Math.max(2, (100 - r) / 4);
  
  const w1 = getWidth(r1);
  const w2 = getWidth(r2);
  const w3 = getWidth(r3);
  const w4 = getWidth(r4);
  
  const totalW = w1 + w2 + w3 + w4;
  
  // Normalize to 100
  const scale = 100 / totalW;
  const sw1 = w1 * scale;
  const sw2 = w2 * scale;
  const sw3 = w3 * scale;
  const sw4 = w4 * scale;

  // Map levels (0-99) to heights (99 is top = 0 in SVG)
  const h = (l: number) => 40 - (l / 99) * 40;

  const points = [
    [0, h(l4)], // Start at L4
    [sw1, h(l1)],
    [sw1 + sw2, h(l2)],
    [sw1 + sw2 + sw3, h(l3)],
    [100, h(l4)] // End at L4
  ];

  const pathData = `M 0 ${points[0][1]} L ${points[1][0]} ${points[1][1]} L ${points[2][0]} ${points[2][1]} L ${points[3][0]} ${points[3][1]} L ${points[4][0]} ${points[4][1]}`;

  return (
    <div className="w-full h-10 bg-dx7-panel rounded-sm overflow-hidden border-2 border-[#151310]">
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
        <path 
          d={pathData} 
          fill="none" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="opacity-80"
        />
        {/* Fill area */}
        <path 
          d={`${pathData} L 100 40 L 0 40 Z`} 
          fill={color} 
          className="opacity-10"
        />
      </svg>
    </div>
  );
};
