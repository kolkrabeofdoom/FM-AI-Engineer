# FM AI Engineer

**FM AI Engineer** ist ein KI-gestütztes Tool zur Generierung von Yamaha DX7-kompatiblen Patches. Durch die Nutzung von KI-Modellen werden musikalische Text-Beschreibungen (z.B. "ein warmer, kristallklarer E-Piano Sound aus den 80ern") direkt in technisch präzise FM-Synthese-Parameter übersetzt.

Die Benutzeroberfläche wurde kürzlich komplett überarbeitet und bietet nun eine authentische Retro-Ästhetik, die vom ikonischen Design des originalen Yamaha DX7 Synthesizers inspiriert ist – inklusive authentischer Farbpalette (DX7 Teal und Magenta), Membran-Tasten und digitaler LCD-Anzeigen!

## Features
- 🧠 **KI-Patch-Generation**: Erzeugt komplexe Sounds aus einfachen Text-Prompts.
- 📺 **Authentisches DX7 Retro-Design**: Ein immersives User-Interface mit 80er-Jahre Charme, Membran-Schaltern und LCD-Fonts (`VT323` und `Share Tech Mono`).
- 📉 **Visuelle Diagramme & Formeln**: Zeigt DX7-Algorithmen und Operator-Hüllkurven (Envelopes) grafisch an. Zusätzlich wird nun die genaue mathematische Operator-Formel (z.B. `(OP2 → OP1) + (OP4 → OP3)`) direkt unter dem Algorithmus eingeblendet!
- 💾 **Sysex Bank Export**: Exportiert 32-Voice Cartridges (`.syx`), die direkt in **Dexed**, FM8 oder originale Hardware geladen werden können.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS 4.
- **Animationen**: Motion (ehemals Framer Motion).
- **KI-Integration**: Google Generative AI SDK (`gemini-flash-latest`).
- **Icons**: Lucide React.
- **Fonts**: Google Fonts (`VT323`, `Share Tech Mono`).

## Installation & Setup

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
    Erstelle eine `.env` Datei im Hauptverzeichnis und füge deinen API Key hinzu:
    ```env
    VITE_GEMINI_API_KEY=DEIN_API_KEY
    ```
4.  Development Server starten:
    ```bash
    npm run dev
    ```

## DX7 Kompatibilität
Das Tool exportiert Standard MIDI Sysex Files im 32-Voice Bank Format (Cartridge). Die generierten Sounds werden in Slot 1 abgelegt. Das Export-Format ist voll kompatibel mit:
- Yamaha DX7 / DX7II / TX802 / TX81Z
- Dexed (VST/Standalone)
- FM8 (Native Instruments)
- Korg Volca FM

## Lizenz
MIT
