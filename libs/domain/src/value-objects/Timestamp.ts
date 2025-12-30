/**
 * Timestamp Value Object
 *
 * Represents a point in time with timezone-aware operations.
 */
export class Timestamp {
  private constructor(private readonly _value: Date) {}

  /**
   * Get the raw Date value
   */
  get value(): Date {
    return new Date(this._value.getTime());
  }

  /**
   * Create a Timestamp for the current moment
   */
  static now(): Timestamp {
    return new Timestamp(new Date());
  }

  /**
   * Create a Timestamp from a Date object
   */
  static fromDate(date: Date): Timestamp {
    return new Timestamp(new Date(date.getTime()));
  }

  /**
   * Create a Timestamp from an ISO 8601 string
   * @throws Error if the string is not a valid ISO date
   */
  static fromISO(iso: string): Timestamp {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid ISO date string: ${iso}`);
    }
    return new Timestamp(date);
  }

  /**
   * Create a Timestamp from Unix milliseconds
   */
  static fromMillis(millis: number): Timestamp {
    return new Timestamp(new Date(millis));
  }

  /**
   * Return ISO 8601 string representation
   */
  toISO(): string {
    return this._value.toISOString();
  }

  /**
   * Return Unix milliseconds
   */
  toMillis(): number {
    return this._value.getTime();
  }

  /**
   * Check if this timestamp is before another
   */
  isBefore(other: Timestamp): boolean {
    return this._value.getTime() < other._value.getTime();
  }

  /**
   * Check if this timestamp is after another
   */
  isAfter(other: Timestamp): boolean {
    return this._value.getTime() > other._value.getTime();
  }

  /**
   * Check equality with another Timestamp
   */
  equals(other: Timestamp): boolean {
    return this._value.getTime() === other._value.getTime();
  }

  /**
   * Return string representation
   */
  toString(): string {
    return this.toISO();
  }

  /**
   * Return JSON serialization value
   */
  toJSON(): string {
    return this.toISO();
  }
}
