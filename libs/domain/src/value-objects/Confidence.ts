/**
 * Confidence Value Object
 *
 * Represents a confidence score between 0 and 1.
 * Used for extraction confidence, relation confidence, etc.
 */
export class Confidence {
  private constructor(private readonly _value: number) {}

  /**
   * Get the raw confidence value
   */
  get value(): number {
    return this._value;
  }

  /**
   * Create a new Confidence value
   * @throws Error if value is not between 0 and 1
   */
  static create(value: number): Confidence {
    if (value < 0 || value > 1) {
      throw new Error(`Confidence must be between 0 and 1, got: ${value}`);
    }
    return new Confidence(value);
  }

  /**
   * Create a Confidence with the maximum value (1.0)
   */
  static max(): Confidence {
    return new Confidence(1.0);
  }

  /**
   * Create a Confidence with the minimum value (0.0)
   */
  static min(): Confidence {
    return new Confidence(0.0);
  }

  /**
   * Check if confidence is high (>= 0.8)
   */
  isHigh(): boolean {
    return this._value >= 0.8;
  }

  /**
   * Check if confidence is medium (>= 0.5 and < 0.8)
   */
  isMedium(): boolean {
    return this._value >= 0.5 && this._value < 0.8;
  }

  /**
   * Check if confidence is low (< 0.5)
   */
  isLow(): boolean {
    return this._value < 0.5;
  }

  /**
   * Combine with another confidence (multiplication)
   */
  combine(other: Confidence): Confidence {
    return new Confidence(this._value * other._value);
  }

  /**
   * Check equality with another Confidence
   */
  equals(other: Confidence): boolean {
    return Math.abs(this._value - other._value) < Number.EPSILON;
  }

  /**
   * Return percentage string representation
   */
  toString(): string {
    return `${(this._value * 100).toFixed(1)}%`;
  }

  /**
   * Return JSON serialization value
   */
  toJSON(): number {
    return this._value;
  }
}
