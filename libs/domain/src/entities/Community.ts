import { EntityId } from '../value-objects/EntityId.js';

/**
 * Properties for creating a new Community
 */
export interface CommunityProps {
  name: string;
  summary?: string;
  level: number;
  memberCount?: number;
  keyEntities?: string[];
  embedding?: number[];
}

/**
 * Community Entity
 *
 * Represents a community (cluster) detected by the GraphRAG algorithm.
 * Communities are hierarchical groupings of related entities.
 */
export class Community {
  private constructor(
    private readonly _id: EntityId,
    private readonly _props: CommunityProps,
    private readonly _embedding?: number[]
  ) {}

  get id(): EntityId {
    return this._id;
  }

  get name(): string {
    return this._props.name;
  }

  get summary(): string | undefined {
    return this._props.summary;
  }

  get level(): number {
    return this._props.level;
  }

  get memberCount(): number | undefined {
    return this._props.memberCount;
  }

  get keyEntities(): string[] {
    return this._props.keyEntities ? [...this._props.keyEntities] : [];
  }

  get embedding(): number[] | undefined {
    return this._embedding ? [...this._embedding] : undefined;
  }

  static create(props: CommunityProps): Community {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Community name is required');
    }

    if (props.level < 0) {
      throw new Error('Community level must be non-negative');
    }

    const id = EntityId.create('comm');

    return new Community(id, props, props.embedding);
  }

  static restore(id: EntityId, props: CommunityProps): Community {
    return new Community(id, props, props.embedding);
  }

  setEmbedding(embedding: number[]): Community {
    return new Community(this._id, this._props, embedding);
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this._id.value,
      entityType: 'Community',
      name: this._props.name,
      summary: this._props.summary,
      level: this._props.level,
      memberCount: this._props.memberCount,
      keyEntities: this._props.keyEntities,
      embedding: this._embedding,
    };
  }
}
