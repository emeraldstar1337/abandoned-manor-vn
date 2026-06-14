// Enhanced procedural horror sound engine
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterVolume = null;
        this.ambientNode = null;
        this.windNode = null;
        this.whisperNode = null;
        this.heartbeatTimer = null;
        this.heartbeatBpm = 0;
        this.isEnabled = false;
    }

    init() {
        if (this.ctx) return;
        
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        
        this.masterVolume = this.ctx.createGain();
        this.masterVolume.gain.setValueAtTime(0.6, this.ctx.currentTime);
        this.masterVolume.connect(this.ctx.destination);
        this.isEnabled = true;
        
        // Start background ambient loops
        this.startAmbient();
        this.startWind();
        this.startWhisperDrone();
    }

    setVolume(value) {
        if (!this.masterVolume) return;
        this.masterVolume.gain.setValueAtTime(value, this.ctx.currentTime);
    }

    // Low spooky drone
    startAmbient() {
        if (!this.ctx) return;
        
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(55, this.ctx.currentTime); // A1
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(55.7, this.ctx.currentTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(120, this.ctx.currentTime);
        filter.Q.setValueAtTime(6, this.ctx.currentTime);

        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(0.08, this.ctx.currentTime);
        lfoGain.gain.setValueAtTime(40, this.ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterVolume);

        osc1.start();
        osc2.start();
        lfo.start();

        this.ambientNode = { osc1, osc2, lfo, gain };
    }

    // Howling wind
    startWind() {
        if (!this.ctx) return;
        
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
        filter.frequency.setValueAtTime(350, this.ctx.currentTime);
        filter.Q.setValueAtTime(2.5, this.ctx.currentTime);

        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(0.04, this.ctx.currentTime);
        lfoGain.gain.setValueAtTime(200, this.ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.06, this.ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterVolume);

        whiteNoise.start();
        lfo.start();

        this.windNode = { whiteNoise, lfo, gain };
    }

    // Spooky background whispering drone (modulating noise)
    startWhisperDrone() {
        if (!this.ctx) return;

        const bufferSize = 2 * this.ctx.sampleRate;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = noiseBuffer;
        source.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, this.ctx.currentTime);
        filter.Q.setValueAtTime(4.0, this.ctx.currentTime);

        // Sweeping LFO to mimic voices muttering
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(1.5, this.ctx.currentTime); // faster modulation
        lfoGain.gain.setValueAtTime(300, this.ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.0, this.ctx.currentTime); // Start muted

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterVolume);

        source.start();
        lfo.start();

        this.whisperNode = { source, lfo, gain };
    }

    setWhispersActive(active) {
        if (!this.whisperNode) return;
        const targetVol = active ? 0.05 : 0.0;
        this.whisperNode.gain.gain.exponentialRampToValueAtTime(targetVol + 0.001, this.ctx.currentTime + 1.0);
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
        
        this.playThump(0);
        this.playThump(0.12);

        this.heartbeatTimer = setTimeout(() => this.playHeartbeatStep(), timeBetweenBeats);
    }

    playThump(delay) {
        if (!this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(55, this.ctx.currentTime + delay);
        osc.frequency.exponentialRampToValueAtTime(5, this.ctx.currentTime + delay + 0.18);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(45, this.ctx.currentTime + delay);

        gain.gain.setValueAtTime(0.0, this.ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.45, this.ctx.currentTime + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + 0.25);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterVolume);

        osc.start(this.ctx.currentTime + delay);
        osc.stop(this.ctx.currentTime + delay + 0.3);
    }

    // Creaking wood / floor
    playCreak() {
        if (!this.ctx) return;

        const duration = 1.4;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(75, this.ctx.currentTime);
        
        const mod = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();
        mod.frequency.setValueAtTime(14, this.ctx.currentTime);
        modGain.gain.setValueAtTime(25, this.ctx.currentTime);
        
        mod.connect(modGain);
        modGain.connect(osc.frequency);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(350, this.ctx.currentTime);
        filter.Q.setValueAtTime(3.5, this.ctx.currentTime);

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.07, this.ctx.currentTime + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterVolume);

        osc.start();
        mod.start();
        osc.stop(this.ctx.currentTime + duration);
        mod.stop(this.ctx.currentTime + duration);
    }

    // Screeching high violin jump
    playScreech() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        
        for (let i = 0; i < 3; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(1500 + (Math.random() * 300), now);
            osc.frequency.linearRampToValueAtTime(1000, now + 1.2);
            
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(1200, now);
            
            gain.gain.setValueAtTime(0.0, now);
            gain.gain.linearRampToValueAtTime(0.06, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterVolume);
            
            osc.start(now);
            osc.stop(now + 1.3);
        }
    }

    // Heavy thud / shockwave
    playThud() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.4);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(80, now);

        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterVolume);

        osc.start(now);
        osc.stop(now + 0.7);
    }

    // Paper rustle
    playRustle() {
        if (!this.ctx) return;

        const duration = 0.6;
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
        filter.frequency.setValueAtTime(2200, this.ctx.currentTime);
        filter.Q.setValueAtTime(1.2, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterVolume);

        source.start();
    }

    // Brutal Jumpscare Hit
    playJumpscare() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Massive sub impact
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(65, now);
        sub.frequency.linearRampToValueAtTime(10, now + 1.2);
        subGain.gain.setValueAtTime(0.9, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        sub.connect(subGain);
        subGain.connect(this.masterVolume);
        sub.start(now);
        sub.stop(now + 1.6);

        // Screeching distorted saws
        for (let i = 0; i < 5; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const freq = 150 + Math.random() * 300;
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.linearRampToValueAtTime(freq * 0.4, now + 0.8);

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.25, now + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(800, now);
            filter.Q.setValueAtTime(2.0, now);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterVolume);
            
            osc.start(now);
            osc.stop(now + 1.0);
        }

        // Noise burst
        const bufferSize = this.ctx.sampleRate * 0.6;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = buffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(500, now);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        gain.connect(this.masterVolume);
        noiseSource.start(now);
    }

    // Knife slash
    playSlash() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const duration = 0.55;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2000, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + duration);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        const noiseSize = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, noiseSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < noiseSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(3000, now);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.15, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.masterVolume);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterVolume);

        osc.start(now);
        noise.start(now);
        osc.stop(now + duration);
    }

    playClick() {
        if (!this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.07);

        gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.07);

        osc.connect(gain);
        gain.connect(this.masterVolume);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.09);
    }
}

window.soundEngine = new SoundEngine();
