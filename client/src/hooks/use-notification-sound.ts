import { useCallback, useRef } from "react";

export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      // Create AudioContext on demand (browser requires user interaction first)
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      
      const now = ctx.currentTime;
      
      // Play a longer, more attention-grabbing sound - repeated alert pattern
      // Pattern: beep-beep-beep (3 times) with pauses
      const playBeepSequence = (startOffset: number) => {
        const baseFreq = 880; // A5 - higher, more attention-grabbing
        
        for (let beep = 0; beep < 3; beep++) {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          oscillator.type = "square"; // More piercing sound
          oscillator.frequency.value = baseFreq;
          
          const beepStart = now + startOffset + beep * 0.2;
          const beepDuration = 0.15;
          
          gainNode.gain.setValueAtTime(0, beepStart);
          gainNode.gain.linearRampToValueAtTime(0.25, beepStart + 0.02);
          gainNode.gain.setValueAtTime(0.25, beepStart + beepDuration - 0.02);
          gainNode.gain.linearRampToValueAtTime(0, beepStart + beepDuration);
          
          oscillator.start(beepStart);
          oscillator.stop(beepStart + beepDuration);
        }
      };
      
      // Play 3 sequences with pauses between them (total ~3 seconds)
      playBeepSequence(0);      // First sequence at 0s
      playBeepSequence(0.8);    // Second sequence at 0.8s
      playBeepSequence(1.6);    // Third sequence at 1.6s
      
      // Add a final rising tone to signal importance
      const finalOsc = ctx.createOscillator();
      const finalGain = ctx.createGain();
      
      finalOsc.connect(finalGain);
      finalGain.connect(ctx.destination);
      
      finalOsc.type = "sine";
      finalOsc.frequency.setValueAtTime(440, now + 2.4);
      finalOsc.frequency.linearRampToValueAtTime(880, now + 2.8);
      finalOsc.frequency.linearRampToValueAtTime(1760, now + 3.2);
      
      finalGain.gain.setValueAtTime(0, now + 2.4);
      finalGain.gain.linearRampToValueAtTime(0.3, now + 2.5);
      finalGain.gain.setValueAtTime(0.3, now + 3.1);
      finalGain.gain.linearRampToValueAtTime(0, now + 3.3);
      
      finalOsc.start(now + 2.4);
      finalOsc.stop(now + 3.3);
      
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  }, []);

  return { playNotificationSound };
}
