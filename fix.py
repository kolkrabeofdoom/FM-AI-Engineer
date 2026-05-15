import sys

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { initAudio, FMSynthVoice } from './lib/audio';", "import { initHexter, getHexter } from './lib/audio';")

content = content.replace("""    let localCtx: AudioContext | null = null;
    try {
      localCtx = initAudio();
    } catch (e) {}""", "")

content = content.replace("""    // Arpeggiator
    const arpInterval = setInterval(() => {
      if (!localCtx) return;
      try {
        if (ghostVoiceRef.current) {
           ghostVoiceRef.current.stop(localCtx.currentTime + 1.0);
        }
        const note = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
        const finalNote = note + (Math.random() > 0.5 ? -12 : 0);
        const voice = new FMSynthVoice(localCtx, finalNote, patch);
        voice.start(localCtx.currentTime);
        ghostVoiceRef.current = voice;
      } catch (e) {}
    }, 4000);""", """    // Arpeggiator
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
    }, 4000);""")

content = content.replace("""      if (ghostVoiceRef.current && localCtx) {
         ghostVoiceRef.current.stop(localCtx.currentTime);
      }""", """      if (ghostVoiceRef.current !== null && ghostVoiceRef.current !== undefined) {
         getHexter()?.noteOff(ghostVoiceRef.current);
         ghostVoiceRef.current = null;
      }""")

content = content.replace("2-OP WEBAUDIO SYNTH", "6-OP WASM ENGINE")

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
