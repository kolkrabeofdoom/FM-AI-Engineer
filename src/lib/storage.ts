import type { DX7Patch } from '../utils/dx7';

const STORAGE_KEY = 'dx7_cartridge_bank';

export function getCartridgeBank(): (DX7Patch | null)[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length === 32) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to load cartridge from localStorage", err);
  }
  return Array(32).fill(null);
}

export function saveCartridgeBank(bank: (DX7Patch | null)[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bank));
  } catch (err) {
    console.error("Failed to save cartridge to localStorage", err);
  }
}

export function savePatchToCartridge(patch: DX7Patch): number {
  const bank = getCartridgeBank();
  
  // Find first empty slot
  const emptyIndex = bank.findIndex(slot => slot === null);
  if (emptyIndex !== -1) {
    bank[emptyIndex] = patch;
    saveCartridgeBank(bank);
    return emptyIndex;
  }
  
  throw new Error("Cartridge is full! Please delete a patch first.");
}

export function deletePatchFromCartridge(index: number) {
  const bank = getCartridgeBank();
  if (index >= 0 && index < 32) {
    bank[index] = null;
    saveCartridgeBank(bank);
  }
}
