/**
 * DX7 Sysex Utility
 * Supports 32-Voice Bank (Cartridge) format for maximum compatibility with Dexed.
 */

export interface OperatorParams {
  r1: number; r2: number; r3: number; r4: number;
  l1: number; l2: number; l3: number; l4: number;
  out: number;
  f_coarse: number;
  f_fine: number;
  detune: number; // 0-14, 7 is center
}

export interface DX7Patch {
  name: string;
  algorithm: number; // 1-32
  feedback: number; // 0-7
  ops: OperatorParams[]; // OP6 to OP1
}

export function createDefaultPatch(): DX7Patch {
  return {
    name: "INIT VOICE",
    algorithm: 1,
    feedback: 0,
    ops: Array(6).fill(null).map(() => ({
      r1: 99, r2: 99, r3: 99, r4: 99,
      l1: 99, l2: 99, l3: 99, l4: 0,
      out: 99,
      f_coarse: 1,
      f_fine: 0,
      detune: 7
    }))
  };
}

/**
 * Packs a single patch into the 128-byte format used in 32-voice banks.
 */
function packVoice128(patch: DX7Patch): Uint8Array {
  const data = new Uint8Array(128);

  // Pack 6 Operators (OP6 to OP1)
  for (let i = 0; i < 6; i++) {
    const op = patch.ops[i];
    const offset = i * 17;

    data[offset + 0] = op.r1;
    data[offset + 1] = op.r2;
    data[offset + 2] = op.r3;
    data[offset + 4] = op.r4; // Wait, R4 is often skipped or moved in some packed formats? 
    // No, standard is R1, R2, R3, R4, L1, L2, L3, L4...
    data[offset + 3] = op.r4;
    data[offset + 4] = op.l1;
    data[offset + 5] = op.l2;
    data[offset + 6] = op.l3;
    data[offset + 7] = op.l4;
    
    data[offset + 8] = 0x1B; // BP
    data[offset + 9] = 0;    // LD
    data[offset + 10] = 0;   // RD
    data[offset + 11] = 0;   // RC/LC

    data[offset + 12] = (op.detune & 0x0F) << 3; 
    data[offset + 13] = 0; // KVS/AMS
    data[offset + 14] = op.out;
    data[offset + 15] = (op.f_coarse & 0x3F) << 1; 
    data[offset + 16] = op.f_fine;
  }

  // Common Data (Starts at 102)
  // Pitch EG
  data[102] = 99; data[103] = 99; data[104] = 99; data[105] = 99;
  data[106] = 50; data[107] = 50; data[108] = 50; data[109] = 50;

  data[110] = (patch.algorithm - 1) & 0x1F;
  data[111] = (patch.feedback & 0x07) | 0x08; // Feedback + Key Sync

  // LFO
  data[112] = 35; data[113] = 0; data[114] = 0; data[115] = 0; data[116] = 1;
  data[117] = 0; // PMS
  data[118] = 24; // Transpose

  // Name (118-127)
  const name = (patch.name + "          ").substring(0, 10).toUpperCase();
  for (let i = 0; i < 10; i++) {
    data[118 + i] = name.charCodeAt(i);
  }

  return data;
}

/**
 * Creates a 32-voice bank Sysex file (Cartridge).
 * Format: F0 43 00 09 20 00 [4096 bytes] [Checksum] F7
 */
export function createBankSysex(patch: DX7Patch): Uint8Array {
  const sysex = new Uint8Array(4104);
  sysex[0] = 0xF0;
  sysex[1] = 0x43;
  sysex[2] = 0x00; // Substatus
  sysex[3] = 0x09; // Format ID (32 voices)
  sysex[4] = 0x20; // Byte count MSB (4096)
  sysex[5] = 0x00; // Byte count LSB

  const bankData = new Uint8Array(4096);
  
  // Slot 1: Our generated patch
  const mainVoice = packVoice128(patch);
  bankData.set(mainVoice, 0);

  // Slots 2-32: INIT VOICE
  const initVoice = packVoice128(createDefaultPatch());
  for (let i = 1; i < 32; i++) {
    bankData.set(initVoice, i * 128);
  }

  sysex.set(bankData, 6);

  // Checksum
  let sum = 0;
  for (let i = 0; i < 4096; i++) {
    sum += bankData[i];
  }
  sysex[4102] = (128 - (sum & 127)) & 127;
  sysex[4103] = 0xF7;

  return sysex;
}
