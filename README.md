# FM AI Engineer (Studio Edition)

**FM AI Engineer** ist ein hochmodernes, KI-gestütztes Sounddesign-Tool für die legendäre Yamaha DX7 Architektur. Durch die Nutzung von Google Gemini werden musikalische Text-Beschreibungen (z.B. "ein warmer, kristallklarer E-Piano Sound aus den 80ern") direkt in präzise FM-Synthese-Parameter übersetzt.

Mit der neuesten Version hat sich das Tool von einem einfachen Generator zu einer voll ausgestatteten **Studio-Workstation** entwickelt – komplett mit RAM-Cartridge, MIDI-Integration und intelligenten Sound-Breeding-Fähigkeiten im authentischen Retro-Design.

## 🚀 Kern-Features

- 🧠 **KI-Patch-Generation & Evolution**: Erzeugt DX7 Sounds aus einfachen Text-Prompts und mutiert bestehende Sounds in gezielte Richtungen (z.B. "Dreckiger", "Mehr 80s-Chorus").
- 💾 **RAM Cartridge System**: Speichere bis zu 32 Sounds direkt im Browser-LocalStorage ab. Exportiere die komplette Cartridge als 32-Voice `.syx` Bank für deinen DX7, Dexed oder FM8.
- 🧬 **Cartridge Breeding**: Kreuze zwei gespeicherte Sounds miteinander! Wähle zwischen *Algorithmic Cross* (schnell, unvorhersehbar) oder *AI Merge* (intelligente Verschmelzung der Sound-Eigenschaften durch KI).
- 🎹 **Web MIDI API Integration**: Schließe dein USB-MIDI-Keyboard an und spiele die generierten Patches direkt im Browser (inklusive Anschlagdynamik).
- 🎛️ **Advanced Tweaking Panel**: Greife in Echtzeit mit 8 Makro-Reglern (Helligkeit, Attack, Decay, Release, Feedback, Fatness, Vibrato, Harmonics) in die Tiefe der Synthese ein.
- 🔄 **Interaktiver Algorithmus-Wechsler**: Schalte live durch alle 32 Algorithmen, um die Oszillator-Routings zu verändern und ungeahnte Klangfarben zu entdecken.
- 🔍 **AI Sound-Analyse**: Lass dir von der KI auf Knopfdruck erklären, *warum* dein aktueller Patch so klingt, wie er klingt – ideal um FM-Synthese zu lernen.
- 🔊 **2-OP WebAudio Preview**: Höre dir deinen generierten Sound ohne Export direkt in der App über die integrierte WebAudio-Engine an.

## 📺 Design & Tech Stack
- **Design**: Authentisches DX7 Retro-Interface mit LCD-Fonts (`VT323` und `Share Tech Mono`), Membran-Tasten und Yamaha-Farbschema.
- **Frontend**: React, TypeScript, Vite, Tailwind CSS 4.
- **Animationen**: Motion (Framer Motion).
- **KI-Integration**: Google Generative AI SDK (`gemini-flash-latest`).

## 🛠️ Installation & Setup

1.  Repository klonen:
    ```bash
    git clone https://github.com/kolkrabeofdoom/FM-AI-Engineer.git
    cd FM-AI-Engineer
    ```
2.  Abhängigkeiten installieren:
    ```bash
    npm install
    ```
3.  Umgebungsvariablen konfigurieren:
    Erstelle eine `.env` Datei im Hauptverzeichnis und füge deinen Gemini API Key hinzu:
    ```env
    VITE_GEMINI_API_KEY=DEIN_API_KEY
    ```
4.  Development Server starten:
    ```bash
    npm run dev
    ```

## 🎹 Kompatibilität
Die exportierten `.syx` Dateien sind 100% kompatibel mit:
- Yamaha DX7 / DX7II / TX802 / TX81Z
- Dexed (VST / Standalone)
- FM8 (Native Instruments)
- Korg Volca FM (1 & 2)

## 📜 Lizenz
Dieses Projekt ist unter der **GNU General Public License v3.0 (GPL-3.0)** lizenziert.
