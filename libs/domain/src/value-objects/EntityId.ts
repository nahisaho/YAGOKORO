import { randomUUID } from 'node:crypto';

/**
 * EntityId Value Object
 *
 * Represents a unique identifier for domain entities.
 * Format: {prefix}_{uuid}
 * Example: model_550e8400-e29b-41d4-a716-446655440000
 */
export class EntityId {
  private constructor(private readonly _value: string) {}

  /**
   * Get the raw ID value
   */
  get value(): string {
    return this._value;
  }

  /**
   * Get the prefix part of the ID
   */
  get prefix(): string {
    return this._value.split('_')[0] ?? '';
  }

  /**
   * Get the UUID part of the ID
   */
  get uuid(): string {
    return this._value.split('_')[1] ?? '';
  }

  /**
   * Create a new EntityId with the given prefix
   */
  static create(prefix: string): EntityId {
    const uuid = randomUUID();
    return new EntityId(`${prefix}_${uuid}`);
  }

  /**
   * Create an EntityId from an existing string value
   * @throws Error if the format is invalid
   */
  static fromString(value: string): EntityId {
    if (!EntityId.isValid(value)) {
      throw new Error(`Invalid EntityId format: ${value}`);
    }
    return new EntityId(value);
  }

  /**
   * Check if a string is a valid EntityId format
   */
  static isValid(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }

    const parts = value.split('_');
    if (parts.length !== 2) {
      return false;
    }

    const [prefix, uuid] = parts;
    if (!prefix || prefix.length === 0) {
      return false;
    }

    // UUID v4 format validation
    const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    return uuidRegex.test(uuid ?? '');
  }

  /**
   * Check equality with another EntityId
   */
  equals(other: EntityId): boolean {
    return this._value === other._value;
  }

  /**
   * Return the string representation
   */
  toString(): string {
    return this._value;
  }

  /**
   * Return JSON serialization value
   */
  toJSON(): string {
    return this._value;
  }
}
