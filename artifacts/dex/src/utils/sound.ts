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
 * Play a pleasant fill notification sound
 * Creates a two-tone "ding" sound using oscillators
 */
export function playFillSound() {
  try {
    const ctx = getAudioContext();
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
 * Test the fill sound - useful for settings preview
 */
export function testFillSound() {
  playFillSound();
}
