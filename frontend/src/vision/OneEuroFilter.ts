export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xPrev: number[] | null = null;
  private dxPrev: number[] | null = null;
  private tPrev: number | null = null;

  constructor(minCutoff = 1.2, beta = 0.005, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private alpha(cutoff: number, te: number): number {
    const tau = 1.0 / (2.0 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / te);
  }

  public filter(x: number[], t: number): number[] {
    if (this.xPrev === null || this.tPrev === null || this.dxPrev === null) {
      this.xPrev = [...x];
      this.dxPrev = new Array(x.length).fill(0);
      this.tPrev = t;
      return x;
    }

    const te = (t - this.tPrev) / 1000.0; // convert ms to seconds
    if (te <= 1e-5) {
      return this.xPrev;
    }

    // Estimate derivative / velocity
    const dx = x.map((val, i) => (val - this.xPrev![i]) / te);
    const alphaD = this.alpha(this.dCutoff, te);
    const dxHat = dx.map((dVal, i) => alphaD * dVal + (1.0 - alphaD) * this.dxPrev![i]);

    // Calculate velocity magnitude
    const speed = Math.hypot(...dxHat);
    const fc = this.minCutoff + this.beta * speed;
    const a = this.alpha(fc, te);

    // Apply low-pass filter
    const xHat = x.map((val, i) => a * val + (1.0 - a) * this.xPrev![i]);

    this.xPrev = [...xHat];
    this.dxPrev = [...dxHat];
    this.tPrev = t;

    return xHat;
  }
}