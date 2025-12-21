
// Simple Sound Synthesis Service using Web Audio API
// No external assets required.

class SoundService {
    private ctx: AudioContext | null = null;
    private volume: number = 0.3;

    constructor() {
        this.init();
    }

    private init() {
        try {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    private getCtx(): AudioContext | null {
        if (!this.ctx) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }

    playClick() {
        const ctx = this.getCtx();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(this.volume * 0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    }

    playError() {
        const ctx = this.getCtx();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(this.volume * 0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    }

    playAttack(type: 'slash' | 'fire' | 'lightning' = 'slash') {
        const ctx = this.getCtx();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        switch (type) {
            case 'slash':
                // White noise burstish or quick slide
                // Synthesizing noise is complex, using simple sweep
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(this.volume, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
                break;

            case 'fire':
                // Low rumble
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, ctx.currentTime);
                osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.5);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(500, ctx.currentTime);
                filter.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.5);

                gain.gain.setValueAtTime(this.volume, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);

                osc.disconnect();
                osc.connect(filter);
                filter.connect(gain);
                break;

            case 'lightning':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(800, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);

                // Tremolo effect
                const lfo = ctx.createOscillator();
                lfo.type = 'square';
                lfo.frequency.value = 50;
                const lfoGain = ctx.createGain();
                lfoGain.gain.value = 500;
                lfo.connect(lfoGain);
                lfoGain.connect(osc.frequency);
                lfo.start();
                lfo.stop(ctx.currentTime + 0.3);

                gain.gain.setValueAtTime(this.volume, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                break;
        }

        if (type !== 'fire') {
            osc.connect(gain);
        }
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + (type === 'fire' ? 0.6 : 0.3));
    }
}

export const soundService = new SoundService();
