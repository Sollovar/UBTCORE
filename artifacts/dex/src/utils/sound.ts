/**
 * Sound utility for playing notification sounds
 */

// Shared AudioContext — created once, reused for every sound.
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Call this from a direct user-gesture handler (e.g. a button click) to
 * unlock the AudioContext on iOS/Android before any programmatic sound fires.
 * Safe to call multiple times.
 */
export function warmUpAudioContext() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    // Play a silent buffer — forces WebKit to fully unlock the context.
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch (_) {}
}

/**
 * Play a two-tone "ding" fill notification sound.
 */
export function playFillSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(800, now);
    osc1.connect(gainNode);
    osc1.start(now);
    osc1.stop(now + 0.15);

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1000, now + 0.08);
    osc2.connect(gainNode);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.5);
  } catch (error) {
    console.error("Failed to play fill sound:", error);
  }
}

/**
 * Play a distinctive three-tone price alert sound (C5 → E5 → G5).
 * The AudioContext must already be unlocked via warmUpAudioContext() before
 * this is called from a non-gesture context (e.g. a useEffect).
 */
export function playPriceAlertSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Three ascending tones: C5 (523 Hz) → E5 (659 Hz) → G5 (784 Hz)
    const tones: [number, number][] = [
      [523, now + 0.00],
      [659, now + 0.18],
      [784, now + 0.36],
    ];

    tones.forEach(([freq, start]) => {
      // Primary sine tone
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.45, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      osc.connect(gain);
      osc.start(start);
      osc.stop(start + 0.30);

      // Subtle triangle harmonic for warmth
      const gain2 = ctx.createGain();
      gain2.connect(ctx.destination);
      gain2.gain.setValueAtTime(0, start);
      gain2.gain.linearRampToValueAtTime(0.12, start + 0.012);
      gain2.gain.exponentialRampToValueAtTime(0.001, start + 0.20);

      const osc2 = ctx.createOscillator();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(freq * 2, start);
      osc2.connect(gain2);
      osc2.start(start);
      osc2.stop(start + 0.22);
    });
  } catch (error) {
    console.error("Failed to play price alert sound:", error);
  }
}

/**
 * Test the fill sound — useful for settings preview.
 */
export function testFillSound() {
  warmUpAudioContext();
  playFillSound();
}
