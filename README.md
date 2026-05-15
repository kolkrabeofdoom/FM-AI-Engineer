![FM-AI-Engineer Banner](https://raw.githubusercontent.com/kolkrabeofdoom/FM-AI-Engineer/main/fm_ai_banner_1778788294687.png)

# FM-AI-Engineer 🎹 v3.0.0 (The Hexter WASM Update)

**The Ultimate Multimodal AI-Powered Yamaha DX7 Synthesizer Assistant & WebAssembly Emulator**

Der **FM-AI-Engineer** revolutioniert die Sound-Programmierung für den legendären Yamaha DX7 Synthesizer (und kompatible Emulatoren wie Dexed oder Arturia DX7 V). Anstatt stundenlang hunderte von kryptischen FM-Parametern zu studieren, nutzt diese Web-App die Kraft der **Google Gemini AI**, um aus rein textuellen Prompts, Audio-Uploads oder sogar Bildern komplett fertige und musikalisch nutzbare SysEx-Patches zu generieren!

Mit dem neuen **v3.0.0 Update** durchbricht das Projekt die bisherigen Grenzen: Die App enthält nun eine voll funktionsfähige, native **6-Operator WebAssembly Engine** (Hexter DX7 Emulator) direkt im Browser. Keine vereinfachten 2-OP WebAudio-Previews mehr – du hörst exakt das, was die Hardware ausgeben würde!

---

## 🌟 The V3.0 Multimodal & WASM Features

### 🎛️ Echte 6-OP WASM Engine (NEU in v3.0)
Die größte Neuerung dieses Releases! Die App nutzt das `hexterjs`-Paket, einen C++ Port des bekannten Hexter DX7-Emulators, der mittels Emscripten zu WebAssembly (.wasm) kompiliert wurde. 
* **Authentischer Sound**: Die KI generiert im Hintergrund 4104-Byte `Sysex`-Cartridges. Diese werden binär direkt in den RAM (`ByteContainer`) der C++ Engine geschrieben. Das Resultat ist 100% authentischer FM-Sound mit allen 32 Algorithmen, Feedbacks und komplexen 6-stufigen Hüllkurven.
* **Audio-Routing**: Das Audiosignal der WASM-Engine wird frame-genau über einen `ScriptProcessorNode` in den Web-Audio-Context eingespeist und an ein visuelles Echtzeit-Oszilloskop sowie den Master-Ausgang geroutet.

### 🎵 Audio-to-Patch (Reverse Engineering)
Lade eine `.wav` oder `.mp3` Datei hoch. Gemini Flash analysiert das Audio-Frequenzspektrum, die Transienten und Hüllkurven und generiert einen 6-OP DX7 Patch, der die Charakteristik dieses Sounds exakt in der FM-Synthese-Architektur nachbildet. Perfekt, um Synths aus bekannten Tracks nachzubauen!

### 🖼️ Image-to-Patch (Synästhesie)
Lade Bilder (`.jpg`, `.png`) hoch. Die multimodale KI übersetzt die visuelle Stimmung, Farbpaletten und Texturen in ein klangliches Gegenstück. Ein düsterer Wald? Du bekommst ein tiefes, resonantes FM-Pad. Eine Neon-Stadtkrone? Ein greller, perkussiver Synth-Pluck.

### 👻 Ghost in the Machine (Ambient Mode)
Lass die KI für dich spielen! Dieser Modus feuert automatisch atmosphärische Noten (Arpeggiator) auf das Hexter-WASM-Modul ab. Ideal zum endlosen "Tweaken" und Zuhören. Die KI mutiert den Sound im Hintergrund weiter, um einen sich endlos verändernden, generativen Soundtrack zu erschaffen.

### 🧠 AI Sound-Analyse ("Warum klingt das so?")
Auf Knopfdruck analysiert Gemini deinen aktuellen Sound und erklärt dir als Musiker die genaue Funktion der Algorithmen, Ratios und Hüllkurven deines aktuellen Patches.

### 💾 Cartridge Database & SysEx Export
Speichere deine besten KI-Patches in der lokalen IndexedDB-Datenbank ab. Lade sie später wieder, baue dir eigene Banken und exportiere die Resultate als standardisierte `.syx` Cartridges für deinen Hardware-DX7 oder Dexed.

### 🎹 Virtuelles MIDI-Keyboard & WebMIDI
Teste deine Sounds direkt über das integrierte On-Screen-Keyboard oder schließe dein eigenes USB-MIDI-Keyboard an (WebMIDI Support wird nahtlos an die WASM-Engine weitergereicht).

---

## 🛠️ Technologie-Stack

*   **Frontend-Framework:** React 19, TypeScript, Vite
*   **Styling & Design:** Tailwind CSS (mit Custom DX7-Retro Theme, Custom Fonts)
*   **Audio Engine:** WebAudio API, `ScriptProcessorNode`, `AnalyserNode`
*   **Synthesizer-Kern:** `hexterjs` (WebAssembly C++ Port)
*   **Künstliche Intelligenz:** `@google/generative-ai` (Gemini 1.5 Pro & Flash Models)
*   **Datenspeicher:** LocalStorage & IndexedDB (via Dexie.js)
*   **Animationen:** Framer Motion (`motion/react`)

---

## 📦 Installation & Start

1.  **Repository klonen**
    ```bash
    git clone https://github.com/kolkrabeofdoom/FM-AI-Engineer.git
    cd FM-AI-Engineer
    ```

2.  **Dependencies installieren**
    ```bash
    npm install
    ```

3.  **Environment Variables setzen**
    Kopiere die `.env.example` zu `.env` und füge deinen Gemini API Key ein:
    ```env
    VITE_GEMINI_API_KEY="DEIN_API_KEY_HIER"
    ```

4.  **Entwicklungsserver starten**
    ```bash
    npm run dev
    ```
    Die App läuft standardmäßig unter `http://localhost:5173`.

---

## 👨‍💻 Entwickler-Hinweise zur Architektur

Der FM-AI-Engineer nutzt einen stark iterativen Prompting-Ansatz:
1. **Der System-Prompt**: Weist Gemini an, ausschließlich sauberes JSON-Format in einer exakten Schema-Struktur zurückzugeben. Das Schema erzwingt alle Parameter (Rates, Levels, Algorithmus, Operator-Frequenzen etc.) im zulässigen Wertebereich des DX7 (0-99).
2. **Die Sysex-Factory (`utils/dx7.ts`)**: Konvertiert das JSON-Ergebnis bitgenau in das proprietäre Yamaha SysEx-Format.
3. **Hexter Integration (`lib/HexterNode.ts`)**: Der C++ Emulator wird als Singleton via asynchronem Promise initialisiert, wobei die kompilierte `hexter.wasm` aus dem statischen `public`-Verzeichnis geladen wird. Ein `ByteContainer` injiziert die 4104 Bytes direkt in den C++ RAM.

---

## 📄 Lizenz & Danksagung

Dieses Projekt ist Open Source. 
Die Synthese-Engine basiert auf dem exzellenten `hexter` Projekt, portiert nach WebAssembly via `hexterjs`.
UI inspiriert vom legendären Yamaha DX7 Synthesizer (1983).

Made with ❤️ by kolkrabeofdoom & AI.
