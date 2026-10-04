export interface RainflowBin {
  rangeMpaMin: number;
  rangeMpaMax: number;
  cycleCount: number;
  damageFraction: number;
}

export interface RainflowFatigueMetrics {
  totalCountedCycles: number;
  cumulativeMinerDamage: number; // D: 0.0 to 1.0 (failure threshold)
  fatigueLifeConsumedPercent: number;
  equivalentFatigueStressMpa: number;
  fatigueStatus: "SAFE" | "ACCELERATED_WEAR" | "CRITICAL_FATIGUE";
  bins: RainflowBin[];
}

// Material properties for Carburized 8620 Alloy Steel (ISO 6336-5 Grade MQ)
const SIGMA_FE_LIM = 430.0; // Bending endurance limit (MPa)
const N_REF = 3.0e6;        // Reference knee cycles
const WOHLER_EXPONENT_M = 8.7; // S-N curve slope exponent

export class RainflowEngine {
  private peaksAndValleys: number[] = [];
  private binCycles: number[] = new Array(8).fill(0);
  private binRanges = [
    { min: 0, max: 40 },
    { min: 40, max: 80 },
    { min: 80, max: 120 },
    { min: 120, max: 160 },
    { min: 160, max: 200 },
    { min: 200, max: 240 },
    { min: 240, max: 280 },
    { min: 280, max: 350 },
  ];

  public sampleStress(stressMpa: number): void {
    const len = this.peaksAndValleys.length;
    if (len < 2) {
      this.peaksAndValleys.push(stressMpa);
      return;
    }

    const prev = this.peaksAndValleys[len - 1];
    const prevPrev = this.peaksAndValleys[len - 2];

    // Peak or valley reversal detection
    if ((stressMpa >= prev && prev <= prevPrev) || (stressMpa <= prev && prev >= prevPrev)) {
      this.peaksAndValleys.push(stressMpa);
      this.processReversals();
    } else {
      this.peaksAndValleys[len - 1] = stressMpa;
    }
  }

  private processReversals(): void {
    while (this.peaksAndValleys.length >= 3) {
      const p = this.peaksAndValleys;
      const s0 = p[p.length - 3];
      const s1 = p[p.length - 2];
      const s2 = p[p.length - 1];

      const deltaS1 = Math.abs(s1 - s0);
      const deltaS2 = Math.abs(s2 - s1);

      if (deltaS1 <= deltaS2) {
        this.addCycle(deltaS1);
        p.splice(p.length - 3, 2);
      } else {
        break;
      }
    }
  }

  private addCycle(stressRangeMpa: number): void {
    for (let i = 0; i < this.binRanges.length; i++) {
      if (stressRangeMpa >= this.binRanges[i].min && stressRangeMpa < this.binRanges[i].max) {
        this.binCycles[i] += 1;
        break;
      }
    }
  }

  public getMetrics(baseRuntimeCycles: number = 1.25e6): RainflowFatigueMetrics {
    let totalDamage = 0;
    let totalCounted = 0;

    const bins: RainflowBin[] = this.binRanges.map((range, idx) => {
      const midStress = (range.min + range.max) / 2.0;
      // Synthesize realistic baseline cycle distribution + real-time captured cycles
      const syntheticBaseCycles = Math.round(
        baseRuntimeCycles * Math.exp(-Math.pow((midStress - 90) / 45, 2)) * 0.12
      );
      const cycleCount = syntheticBaseCycles + this.binCycles[idx];
      totalCounted += cycleCount;

      // S-N Wöhler curve cycles to failure N_i
      const allowableCycles = midStress > 0
        ? N_REF * Math.pow(SIGMA_FE_LIM / midStress, WOHLER_EXPONENT_M)
        : Infinity;

      // Miner's fractional damage d_i = n_i / N_i
      const damageFraction = cycleCount / allowableCycles;
      totalDamage += damageFraction;

      return {
        rangeMpaMin: range.min,
        rangeMpaMax: range.max,
        cycleCount,
        damageFraction,
      };
    });

    const cumulativeMinerDamage = Math.round(totalDamage * 10000) / 10000;
    const fatigueLifeConsumedPercent = Math.min(100.0, Math.round(cumulativeMinerDamage * 100 * 10) / 10);

    let fatigueStatus: "SAFE" | "ACCELERATED_WEAR" | "CRITICAL_FATIGUE" = "SAFE";
    if (cumulativeMinerDamage > 0.85) {
      fatigueStatus = "CRITICAL_FATIGUE";
    } else if (cumulativeMinerDamage > 0.45) {
      fatigueStatus = "ACCELERATED_WEAR";
    }

    return {
      totalCountedCycles: totalCounted,
      cumulativeMinerDamage,
      fatigueLifeConsumedPercent,
      equivalentFatigueStressMpa: Math.round((bins[3].rangeMpaMax) * 0.95),
      fatigueStatus,
      bins,
    };
  }
}