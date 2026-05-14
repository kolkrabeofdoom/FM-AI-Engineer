import { BookOpen, Cpu, Lightbulb, Layers, Waves, Settings2, Keyboard, Upload, Ghost, Activity } from 'lucide-react';
import { motion } from 'motion/react';

export function Documentation() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto space-y-12 pb-24"
    >
      <div className="bg-dx7-panel border-b-4 border-[#151310] rounded-md p-8 md:p-12 shadow-2xl">
        <h2 className="text-3xl font-lcd tracking-widest text-dx7-teal uppercase mb-6 flex items-center gap-4">
          <BookOpen size={32} /> FM-AI-Engineer Handbuch
        </h2>
        <p className="text-slate-300 text-lg leading-relaxed font-sans">
          Willkommen beim <strong className="text-dx7-magenta">FM-AI-Engineer</strong>, dem weltweit ersten KI-gestützten Patch-Designer für die legendäre Yamaha DX7 Architektur. 
          Dieses Tool übersetzt natürliche Sprache mithilfe von Google Gemini direkt in komplexe FM-Synthese-Parameter (.syx Dateien).
        </p>
      </div>

      {/* Workflow Section */}
      <section className="space-y-6">
        <h3 className="text-xl font-mono-tech uppercase tracking-widest text-slate-100 flex items-center gap-3 border-b-2 border-slate-800 pb-2">
          <Lightbulb className="text-dx7-teal" /> 1. Der Workflow
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-dx7-bg border-2 border-slate-800 p-6 rounded-sm hover:border-dx7-teal/30 transition-colors">
            <h4 className="text-dx7-teal font-bold mb-2 uppercase tracking-wider text-sm">A. Generieren & Multimodal</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              Beschreibe den gewünschten Sound im Textfeld oder nutze die <strong>Multimodale Eingabe</strong>.
              <br/><br/>
              • <strong>Audio-Upload:</strong> Lade ein MP3/WAV hoch. Die KI analysiert den Klang und baut den DX7-Patch nach (Reverse Engineering).<br/>
              • <strong>Bild-Upload:</strong> Lade Fotos hoch. Die KI übersetzt Farben und Stimmung in klangliche Texturen (Synästhesie).
            </p>
          </div>
          
          <div className="bg-dx7-bg border-2 border-slate-800 p-6 rounded-sm hover:border-dx7-magenta/30 transition-colors">
            <h4 className="text-dx7-magenta font-bold mb-2 uppercase tracking-wider text-sm">B. Mutieren & Analysieren</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              Wenn der Sound nah dran ist, aber noch nicht perfekt, nutze das <strong>🧬 Mutate-Panel</strong> auf der linken Seite. Es behält die Grundstruktur des Algorithmus bei, verändert aber gezielt Obertöne und Hüllkurven nach vordefinierten Anweisungen (z.B. "Mehr 80s-Chorus").
              <br/><br/>
              Klicke auf die <strong>🔍 Such-Lupe (Warum klingt das so?)</strong>, um dir von der KI erklären zu lassen, wie der Sound technisch aufgebaut ist.
            </p>
          </div>

          <div className="bg-dx7-bg border-2 border-slate-800 p-6 rounded-sm hover:border-[#00ffff]/30 transition-colors">
            <h4 className="text-[#00ffff] font-bold mb-2 uppercase tracking-wider text-sm">C. Vorhören & MIDI (Flavor Preview)</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              Die eingebaute WebAudio-Engine generiert einen vereinfachten 2-Operator-FM-Sound, der die Hüllkurve und Helligkeit imitiert.
              <br/><br/>
              <strong>MIDI-Support:</strong> Schließe ein USB-MIDI-Keyboard an! Die App erkennt es sofort (Grüne LED) und du kannst die generierten Sounds inkl. Anschlagdynamik direkt spielen. Alternativ kannst du auf das virtuelle Keyboard klicken.
            </p>
          </div>

          <div className="bg-dx7-bg border-2 border-slate-800 p-6 rounded-sm hover:border-indigo-400/30 transition-colors">
            <h4 className="text-indigo-400 font-bold mb-2 uppercase tracking-wider text-sm">D. Tweaken & Algorithmus</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              Nutze die 8 Makro-Regler (Attack, Fatness, Harmonics, etc.), um den Sound abzurunden. 
              Du kannst zudem mit den <strong>&lt; / &gt; Pfeilen neben dem Algorithmus-Bild</strong> live durch alle 32 Algorithmen schalten. Dies ändert drastisch das Routing und sorgt für glückliche Unfälle!
            </p>
          </div>

          <div className="bg-dx7-bg border-2 border-slate-800 p-6 rounded-sm hover:border-[#cc0066]/30 transition-colors md:col-span-1">
            <h4 className="text-[#cc0066] font-bold mb-2 uppercase tracking-wider text-sm">E. Cartridge & Breeding</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              Speichere Sounds in deine 32 RAM-Plätze. Nutze den <strong>🧬 Breed Modus</strong>, um zwei Sounds algorithmisch oder per KI-Fusion zu neuen Hybriden zu kreuzen.
            </p>
          </div>

          <div className="bg-dx7-bg border-2 border-slate-800 p-6 rounded-sm hover:border-dx7-teal/30 transition-colors md:col-span-1">
            <h4 className="text-dx7-teal font-bold mb-2 uppercase tracking-wider text-sm">F. Ghost Mode & Oszilloskop</h4>
            <p className="text-slate-400 text-sm leading-relaxed text-xs">
              • <strong>Ghost Mode:</strong> Die KI spielt automatisch Ambient-Noten und mutiert den Patch kontinuierlich im Hintergrund (Ambient Drift).<br/>
              • <strong>Oszilloskop:</strong> Beobachte die FM-Wellenform in Echtzeit im unteren linken Panel.
            </p>
          </div>
        </div>
      </section>

      {/* FM Synthesis Basics */}
      <section className="space-y-6">
        <h3 className="text-xl font-mono-tech uppercase tracking-widest text-slate-100 flex items-center gap-3 border-b-2 border-slate-800 pb-2 mt-12">
          <Waves className="text-dx7-magenta" /> 2. FM-Synthese Basics
        </h3>
        
        <div className="bg-dx7-panel p-8 rounded-md border-b-4 border-[#151310] space-y-8">
          <div>
            <h4 className="text-lg font-bold text-slate-200 mb-3 flex items-center gap-2"><Cpu size={18} className="text-dx7-teal"/> Operatoren (Träger vs. Modulator)</h4>
            <p className="text-slate-400 leading-relaxed text-sm">
              Der DX7 besitzt 6 <strong>Operatoren (OP1 - OP6)</strong>. Ein Operator ist im Grunde ein einfacher Sinus-Oszillator mit einer eigenen Hüllkurve. 
              <br/><br/>
              • <strong>Carrier (Träger):</strong> Operatoren, die am "Boden" des Algorithmus-Diagramms stehen. Sie sind das, was du tatsächlich aus dem Lautsprecher <em>hörst</em>.<br/>
              • <strong>Modulatoren:</strong> Operatoren, die <em>über</em> den Trägern stehen. Du hörst sie nicht direkt, sie modulieren die Frequenz des Trägers. Je höher das "OUT"-Level eines Modulators, desto mehr Obertöne (Helligkeit/Kratzen/Metall) entstehen im Träger.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-bold text-slate-200 mb-3 flex items-center gap-2"><Layers size={18} className="text-dx7-teal"/> Algorithmen (1-32)</h4>
            <p className="text-slate-400 leading-relaxed text-sm">
              Ein Algorithmus ist die <em>Verschaltung</em> der 6 Operatoren. 
              <br/><br/>
              • <strong>Algo 1 & 2:</strong> Ein Carrier (OP1), der von einer langen Kette moduliert wird. Perfekt für komplexe Pianos und lebendige Pads.<br/>
              • <strong>Algo 16-18:</strong> Viele Carrier nebeneinander. Perfekt für Orgeln, Chöre und fette, mehrschichtige Sounds.<br/>
              • <strong>Algo 32:</strong> Keine Modulatoren. Nur 6 simple Sinuswellen nebeneinander (wie eine Hammond-Orgel).
            </p>
          </div>
        </div>
      </section>

      {/* Parameter Reference */}
      <section className="space-y-6">
        <h3 className="text-xl font-mono-tech uppercase tracking-widest text-slate-100 flex items-center gap-3 border-b-2 border-slate-800 pb-2 mt-12">
          <Settings2 className="text-[#00ffff]" /> 3. Parameter-Referenz
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 border-y-2 border-slate-800 font-mono-tech text-[10px] uppercase text-slate-400">
                <th className="py-4 px-6">Parameter</th>
                <th className="py-4 px-6">Bedeutung</th>
                <th className="py-4 px-6">Wertebereich</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-slate-800 hover:bg-slate-800/30">
                <td className="py-4 px-6 font-mono-tech text-dx7-teal">R1, R2, R3, R4</td>
                <td className="py-4 px-6 text-slate-300"><strong>Rates (Geschwindigkeiten).</strong> Achtung: Invertiert! 99 ist sofort da (0 ms). 0 ist extrem langsam (Sekunden). R1 ist Attack, R4 ist Release.</td>
                <td className="py-4 px-6 font-lcd text-dx7-lcd-red">0 - 99</td>
              </tr>
              <tr className="border-b border-slate-800 hover:bg-slate-800/30">
                <td className="py-4 px-6 font-mono-tech text-dx7-teal">L1, L2, L3, L4</td>
                <td className="py-4 px-6 text-slate-300"><strong>Levels (Lautstärken).</strong> Der Zielwert, der mit der entsprechenden Rate angefahren wird. L3 ist typischerweise das Sustain-Level.</td>
                <td className="py-4 px-6 font-lcd text-dx7-lcd-red">0 - 99</td>
              </tr>
              <tr className="border-b border-slate-800 hover:bg-slate-800/30">
                <td className="py-4 px-6 font-mono-tech text-dx7-teal">OUT</td>
                <td className="py-4 px-6 text-slate-300">Output-Lautstärke des Operators. Bei Modulator = Anzahl der Obertöne/Helligkeit. Bei Carrier = Absolute Lautstärke.</td>
                <td className="py-4 px-6 font-lcd text-dx7-lcd-red">0 - 99</td>
              </tr>
              <tr className="border-b border-slate-800 hover:bg-slate-800/30">
                <td className="py-4 px-6 font-mono-tech text-dx7-magenta">F_COARSE</td>
                <td className="py-4 px-6 text-slate-300">Frequenz-Ratio (Oktavierung). 1 = Grundton. 2 = Eine Oktave höher. 0 = Eine Oktave tiefer (Bass). 0 = Fixed Mode in manchen Konfigurationen.</td>
                <td className="py-4 px-6 font-lcd text-dx7-lcd-red">0 - 31</td>
              </tr>
              <tr className="border-b border-slate-800 hover:bg-slate-800/30">
                <td className="py-4 px-6 font-mono-tech text-dx7-magenta">F_FINE / DETUNE</td>
                <td className="py-4 px-6 text-slate-300">Feintuning und Detune (Schwebung). Detune 7 ist perfekt gestimmt. Alles darüber/darunter erzeugt einen lebendigen Chorus-Effekt.</td>
                <td className="py-4 px-6 font-lcd text-dx7-lcd-red">0 - 14</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </motion.div>
  );
}
