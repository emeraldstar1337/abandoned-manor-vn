// Web Audio API procedural sound engine for the horror visual novel
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterVolume = null;
        this.ambientNode = null;
        this.windNode = null;
        this.heartbeatTimer = null;
        this.heartbeatBpm = 60;
        this.isEnabled = false;
    }

    init() {
        if (this.ctx) return;
        
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        
        this.masterVolume = this.ctx.createGain();
        this.masterVolume.gain.setValueAtTime(0.5, this.ctx.currentTime);
        this.masterVolume.connect(this.ctx.destination);
        this.isEnabled = true;
        
        // Start background ambient loop
        this.startAmbient();
    }

    setVolume(value) {
        if (!this.masterVolume) return;
        this.masterVolume.gain.setValueAtTime(value, this.ctx.currentTime);
    }

    // Spooky ambient drone synthesizer
    startAmbient() {
        if (!this.ctx) return;
        
        // Low frequency drone
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(55, this.ctx.currentTime); // A1 note
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(55.5, this.ctx.currentTime); // detuned

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(150, this.ctx.currentTime);
        filter.Q.setValueAtTime(5, this.ctx.currentTime);

        // LFO to modulate filter frequency (creates swelling effect)
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(0.1, this.ctx.currentTime); // 0.1Hz (10 seconds per sweep)
        lfoGain.gain.setValueAtTime(50, this.ctx.currentTime); // mod depth

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterVolume);

        osc1.start();
        osc2.start();
        lfo.start();

        this.ambientNode = { osc1, osc2, lfo, gain };

        // Start wind ambient
        this.startWind();
    }

    startWind() {
        if (!this.ctx) return;
        
        // Noise buffer for wind
        const bufferSize = 2 * this.ctx.sampleRate;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, this.ctx.currentTime);
        filter.Q.setValueAtTime(2.0, this.ctx.currentTime);

        // LFO to sweep wind frequency
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(0.05, this.ctx.currentTime);
        lfoGain.gain.setValueAtTime(250, this.ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterVolume);

        whiteNoise.start();
        lfo.start();

        this.windNode = { whiteNoise, lfo, gain };
    }

    setHeartbeat(bpm) {
        this.heartbeatBpm = bpm;
        if (bpm === 0) {
            if (this.heartbeatTimer) {
                clearTimeout(this.heartbeatTimer);
                this.heartbeatTimer = null;
            }
            return;
        }
        
        if (!this.heartbeatTimer) {
            this.playHeartbeatStep();
        }
    }

    playHeartbeatStep() {
        if (!this.ctx || this.heartbeatBpm === 0) return;

        const timeBetweenBeats = 60000 / this.heartbeatBpm;
        
        // Synthesize double heartbeat thump
        this.playThump(0);
        this.playThump(0.15); // second beat of the double beat

        this.heartbeatTimer = setTimeout(() => this.playHeartbeatStep(), timeBetweenBeats);
    }

    playThump(delay) {
        if (!this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, this.ctx.currentTime + delay);
        osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + delay + 0.15);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(50, this.ctx.currentTime + delay);

        gain.gain.setValueAtTime(0.0, this.ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + 0.25);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterVolume);

        osc.start(this.ctx.currentTime + delay);
        osc.stop(this.ctx.currentTime + delay + 0.3);
    }

    // Play a creaking wood sound
    playCreak() {
        if (!this.ctx) return;

        const duration = 1.2;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, this.ctx.currentTime);
        // Modulate pitch rapidly to create a "rubbing" creaking effect
        const mod = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();
        mod.frequency.setValueAtTime(12, this.ctx.currentTime);
        modGain.gain.setValueAtTime(30, this.ctx.currentTime);
        
        mod.connect(modGain);
        modGain.connect(osc.frequency);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, this.ctx.currentTime);
        filter.Q.setValueAtTime(3.0, this.ctx.currentTime);

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterVolume);

        osc.start();
        mod.start();
        osc.stop(this.ctx.currentTime + duration);
        mod.stop(this.ctx.currentTime + duration);
    }

    // Play a paper rustling sound
    playRustle() {
        if (!this.ctx) return;

        const duration = 0.5;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2000, this.ctx.currentTime);
        filter.Q.setValueAtTime(1.0, this.ctx.currentTime);

        // Sweeping filter to make it sound like rustling paper
        filter.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterVolume);

        source.start();
    }

    // Jumpscare hit (sudden loud spooky sound)
    playJumpscare() {
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        
        // Massive low thump
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(70, now);
        subOsc.frequency.linearRampToValueAtTime(20, now + 0.8);
        
        subGain.gain.setValueAtTime(0.8, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        
        subOsc.connect(subGain);
        subGain.connect(this.masterVolume);
        subOsc.start(now);
        subOsc.stop(now + 1.5);

        // High frequency metallic screech (detuned saws)
        for (let i = 0; i < 4; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const freq = 120 + Math.random() * 200;
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.linearRampToValueAtTime(freq * 0.5, now + 0.5);

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(800, now);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterVolume);
            
            osc.start(now);
            osc.stop(now + 0.8);
        }

        // Noise blast for impact
        const bufferSize = this.ctx.sampleRate * 0.4;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = buffer;
        
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(1000, now);
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterVolume);
        noiseSource.start(now);
    }

    // Metallic knife slash
    playSlash() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const duration = 0.5;

        // Pitch sweep oscillator (high to mid pitch)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + duration);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        // Noise burst to add friction
        const noiseSize = this.ctx.sampleRate * 0.15;
        const buffer = this.ctx.createBuffer(1, noiseSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < noiseSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(2500, now);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.12, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.masterVolume);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterVolume);

        osc.start(now);
        noise.start(now);
        osc.stop(now + duration);
    }

    // Small UI click sound
    playClick() {
        if (!this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(this.masterVolume);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }
}

// Export global instance
window.soundEngine = new SoundEngine();
