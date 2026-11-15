// Run-local rewards. Successful onward catches validate rhythm bonuses.
export class RunPerks {
  constructor() { this.reset(); }
  reset() {
    this.flight = false; this.snacks = 0; this.snackAwarded = false;
    this.teaCharge = false; this.teaUntil = 0; this.rhythm = 0; this.bestRhythm = 0;
    this.teaCombos = 0;
  }
  launch() {
    this.flight = true; this.snacks = 0; this.snackAwarded = false;
    const boost = this.teaCharge ? 1.08 : 1;
    this.teaCharge = false;
    return boost;
  }
  land(onBeat) {
    this.flight = false;
    this.rhythm = onBeat ? this.rhythm + 1 : 0;
    this.bestRhythm = Math.max(this.bestRhythm, this.rhythm);
    return this.rhythm > 0 && this.rhythm % 3 === 0;
  }
  collect(type, now) {
    if (!this.flight || this.snackAwarded) return false;
    if (type === 'chaya') this.snacks |= 1;
    if (type === 'fritter') this.snacks |= 2;
    if (this.snacks !== 3) return false;
    this.snackAwarded = true; this.teaCharge = true; this.teaCombos++;
    this.teaUntil = now + 3;
    return true;
  }
  breakRhythm() { this.rhythm = 0; this.flight = false; }
  get level() { return Math.min(3, Math.floor(this.rhythm / 3)); }
}
