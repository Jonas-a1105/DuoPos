/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Web Synthesized Sound Engine for DuoPOS
 * Generates custom synthesized sounds on all modern browsers (iOS/Android/Desktop)
 * completely offline with zero static download overhead.
 */
export const playSound = (type: 'click' | 'success' | 'kaching' | 'levelup' | 'error' | 'swoosh') => {
  try {
    // Check if the user has muted sounds in current session
    const isMuted = localStorage.getItem('duo_pos_muted') === 'true';
    if (isMuted) return;

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    switch (type) {
      case 'click': {
        // Satisfaction touch bubble click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(580, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);
        
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        osc.start(now);
        osc.stop(now + 0.09);
        break;
      }
      case 'success': {
        // Duolingo "Bing-Bing!" double correct chime
        // First note (C5, 523.25 Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now);
        
        gain1.gain.setValueAtTime(0.12, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
        
        osc1.start(now);
        osc1.stop(now + 0.15);

        // Second note (G5, 783.99 Hz)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(783.99, now + 0.09);
        
        gain2.gain.setValueAtTime(0, now + 0.09);
        gain2.gain.linearRampToValueAtTime(0.12, now + 0.11);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
        
        osc2.start(now + 0.09);
        osc2.stop(now + 0.3);
        break;
      }
      case 'kaching': {
        // Vintage POS cash drawer opening thump + stacked ring of coins
        // Drawer thump (Low frequency triangle)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.frequency.setValueAtTime(140, now);
        osc1.type = 'triangle';
        gain1.gain.setValueAtTime(0.12, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc1.start(now);
        osc1.stop(now + 0.06);

        // Core gold coin ring (1900 Hz)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.setValueAtTime(1900, now);
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.2, now);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc2.start(now);
        osc2.stop(now + 0.46);

        // Harmonic silver coin ring (2300 Hz)
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.connect(gain3);
        gain3.connect(ctx.destination);
        osc3.frequency.setValueAtTime(2300, now + 0.05);
        osc3.type = 'sine';
        gain3.gain.setValueAtTime(0.16, now + 0.05);
        gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
        osc3.start(now + 0.05);
        osc3.stop(now + 0.42);
        break;
      }
      case 'levelup': {
        // Energetic victory arpeggio: Do - Mi - Sol - Do (Arpegio Triunfal)
        const notes = [261.63, 329.63, 392.00, 523.25];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.11);
          
          gain.gain.setValueAtTime(0, now + idx * 0.11);
          gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.11 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.11 + 0.22);
          
          osc.start(now + idx * 0.11);
          osc.stop(now + idx * 0.11 + 0.26);
        });
        break;
      }
      case 'error': {
        // Sawtooth frequency buzzer (stock warnings, insufficient payments)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(130, now);
        gain1.gain.setValueAtTime(0.12, now);
        gain1.gain.linearRampToValueAtTime(0.12, now + 0.1);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
        osc1.start(now);
        osc1.stop(now + 0.18);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(133, now + 0.02);
        gain2.gain.setValueAtTime(0.12, now + 0.02);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
        osc2.start(now + 0.02);
        osc2.stop(now + 0.18);
        break;
      }
      case 'swoosh': {
        // Fast triangle frequency slide down (Trash clearing)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.16);
        
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
        
        osc.start(now);
        osc.stop(now + 0.18);
        break;
      }
    }
  } catch (err) {
    console.warn('Audio synthesized blocked or unsupported in current device viewport settings:', err);
  }
};
