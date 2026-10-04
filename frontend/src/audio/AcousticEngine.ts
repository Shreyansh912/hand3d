export class AcousticEngine {
  private ctx: AudioContext | null = null;
  private oscGmf: OscillatorNode | null = null;
  private oscHarmonic: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isMuted: boolean = true;

  init() {
    if (this.ctx) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    this.analyserNode = this.ctx.createAnalyser();
    this.analyserNode.fftSize = 128;
    this.analyserNode.smoothingTimeConstant = 0.8;

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(0.0, this.ctx.currentTime);

    // Fundamental GMF Oscillator
    this.oscGmf = this.ctx.createOscillator();
    this.oscGmf.type = "sawtooth";
    this.oscGmf.frequency.setValueAtTime(400, this.ctx.currentTime);

    // 2x GMF Harmonic Oscillator
    this.oscHarmonic = this.ctx.createOscillator();
    this.oscHarmonic.type = "sine";
    this.oscHarmonic.frequency.setValueAtTime(800, this.ctx.currentTime);

    const harmonicGain = this.ctx.createGain();
    harmonicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    this.oscHarmonic.connect(harmonicGain);
    harmonicGain.connect(this.gainNode);
    this.oscGmf.connect(this.gainNode);

    // Route through Analyser before destination
    this.gainNode.connect(this.analyserNode);
    this.analyserNode.connect(this.ctx.destination);

    this.oscGmf.start();
    this.oscHarmonic.start();
  }

  setMute(mute: boolean) {
    this.isMuted = mute;
    if (!this.gainNode || !this.ctx) return;
    const targetGain = mute ? 0.0 : 0.04;
    this.gainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
  }

  updateAcoustics(inputRpm: number, inputTorqueNm: number) {
    if (!this.ctx || !this.oscGmf || !this.oscHarmonic) return;

    // Pinion teeth = 20
    const gmfHz = Math.max(20, Math.round((inputRpm / 60.0) * 20));
    this.oscGmf.frequency.setTargetAtTime(gmfHz, this.ctx.currentTime, 0.05);
    this.oscHarmonic.frequency.setTargetAtTime(gmfHz * 2, this.ctx.currentTime, 0.05);

    if (!this.isMuted && this.gainNode) {
      const loadGain = 0.02 + (inputTorqueNm / 200.0) * 0.04;
      this.gainNode.gain.setTargetAtTime(loadGain, this.ctx.currentTime, 0.05);
    }
  }

  getFrequencyData(array: Uint8Array<ArrayBuffer>): void {
    if (this.analyserNode) {
      this.analyserNode.getByteFrequencyData(array);
    } else {
      array.fill(0);
    }
  }

  close() {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}