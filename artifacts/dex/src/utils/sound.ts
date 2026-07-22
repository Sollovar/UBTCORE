/**
 * Sound utility for playing notification sounds
 */

// We'll use the Web Audio API to generate a pleasant notification sound
// This avoids needing to load external audio files
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Resume a suspended AudioContext (required on mobile after page load before
 * any user-gesture-gated audio interaction).
 */
async function resumeContext(ctx: AudioContext) {
  if (ctx.state === "suspended") {
    try { await ctx.resume(); } catch (_) { /* ignore */ }
  }
}

/**
 * Play a pleasant fill notification sound
 * Creates a two-tone "ding" sound using oscillators
 */
export async function playFillSound() {
  try {
    const ctx = getAudioContext();
    await resumeContext(ctx);
    const now = ctx.currentTime;

    // Create a gain node for volume control
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    
    // Set volume envelope - start at 0, ramp up quickly, then fade out
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    // First tone (higher pitch)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(800, now); // E5 note
    osc1.connect(gainNode);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Second tone (slightly lower, creates a pleasant interval)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1000, now + 0.08); // B5 note
    osc2.connect(gainNode);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.5);

  } catch (error) {
    console.error('Failed to play fill sound:', error);
  }
}

/**
 * Play a distinctive three-tone price alert sound.
 * Uses an ascending major triad (C5→E5→G5) with a punchy attack so it
 * cuts through on mobile speakers.
 */
export async function playPriceAlertSound() {
  try {
    const ctx = getAudioContext();
    await resumeContext(ctx);
    const now = ctx.currentTime;

    // Three ascending tones: C5 (523Hz) → E5 (659Hz) → G5 (784Hz)
    const tones: [number, number][] = [
      [523, now + 0.00],
      [659, now + 0.18],
      [784, now + 0.36],
    ];

    tones.forEach(([freq, start]) => {
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      // Punchy attack, quick decay → tail
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.45, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc.connect(gain);
      osc.start(start);
      osc.stop(start + 0.30);

      // Subtle harmonic layer (triangle, half volume) for warmth
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, start);

      const gain2 = ctx.createGain();
      gain2.connect(ctx.destination);
      gain2.gain.setValueAtTime(0, start);
      gain2.gain.linearRampToValueAtTime(0.12, start + 0.012);
      gain2.gain.exponentialRampToValueAtTime(0.001, start + 0.20);

      osc2.connect(gain2);
      osc2.start(start);
      osc2.stop(start + 0.22);
    });

  } catch (error) {
    console.error('Failed to play price alert sound:', error);
  }
}

/**
 * Test the fill sound - useful for settings preview
 */
export function testFillSound() {
  playFillSound();
}
