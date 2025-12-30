import type { DomainEntity, EntityFilter, EntityRepository, EntityType } from '@yagokoro/domain';
import {
  AIModel,
  Benchmark,
  Community,
  Concept,
  EntityId,
  Organization,
  Person,
  Publication,
  Technique,
} from '@yagokoro/domain';
import type { Neo4jConnection } from '../connection/Neo4jConnection.js';
import { CypherQueryBuilder } from '../queries/CypherQueryBuilder.js';

/**
 * Entity type to Neo4j label mapping
 */
const ENTITY_LABELS: Record<EntityType, string> = {
  AIModel: 'AIModel',
  Organization: 'Organization',
  Technique: 'Technique',
  Publication: 'Publication',
  Person: 'Person',
  Benchmark: 'Benchmark',
  Concept: 'Concept',
  Community: 'Community',
};

/**
 * Neo4j Entity Repository Implementation
 *
 * Implements the EntityRepository port for Neo4j graph database.
 */
export class Neo4jEntityRepository implements EntityRepository {
  constructor(private readonly connection: Neo4jConnection) {}

  async save(entity: DomainEntity): Promise<void> {
    const json = entity.toJSON();
    const entityType = json.entityType as EntityType;
    const label = ENTITY_LABELS[entityType];

    const query = new CypherQueryBuilder()
      .merge(`(n:${label} {id: $id})`)
      .onCreateSet('n = $props')
      .onMatchSet('n += $props')
      .param('id', json.id)
      .param('props', { ...json, entityType })
      .return('n')
      .build();

    await this.connection.executeWrite(query.text, query.params);
  }

  async saveMany(entities: DomainEntity[]): Promise<void> {
    // Use UNWIND for batch insert
    if (entities.length === 0) return;

    const firstEntity = entities[0];
    if (!firstEntity) return;

    const entityType = firstEntity.toJSON().entityType as EntityType;
    const label = ENTITY_LABELS[entityType];

    const items = entities.map((e) => {
      const json = e.toJSON();
      return { ...json, entityType };
    });

    const query = new CypherQueryBuilder()
      .unwind('$items AS item')
      .merge(`(n:${label} {id: item.id})`)
      .onCreateSet('n = item')
      .onMatchSet('n += item')
      .param('items', items)
      .return('count(n) as saved')
      .build();

    await this.connection.executeWrite(query.text, query.params);
  }

  async findById(id: EntityId): Promise<DomainEntity | null> {
    const query = new CypherQueryBuilder()
      .match('(n)')
      .where('n.id = $id')
      .param('id', id.value)
      .return('n')
      .limit(1)
      .build();

    const results = await this.connection.executeRead<{
      n: { properties: Record<string, unknown> };
    }>(query.text, query.params);

    if (results.length === 0) return null;

    const firstResult = results[0];
    if (!firstResult) return null;

    return this.mapToEntity(firstResult.n.properties);
  }

  async findByFilter(filter: EntityFilter): Promise<DomainEntity[]> {
    const builder = new CypherQueryBuilder();

    if (filter.entityType) {
      const label = ENTITY_LABELS[filter.entityType];
      builder.match(`(n:${label})`);
    } else {
      builder.match('(n)');
    }

    if (filter.ids && filter.ids.length > 0) {
      builder.where('n.id IN $ids').param('ids', filter.ids);
    }

    if (filter.nameContains) {
      if (filter.ids && filter.ids.length > 0) {
        builder.andWhere('n.name CONTAINS $nameContains');
      } else {
        builder.where('n.name CONTAINS $nameContains');
      }
      builder.param('nameContains', filter.nameContains);
    }

    builder.return('n');

    if (filter.limit) {
      builder.limit(filter.limit);
    }
    if (filter.offset) {
      builder.skip(filter.offset);
    }

    const query = builder.build();
    const results = await this.connection.executeRead<{
      n: { properties: Record<string, unknown> };
    }>(query.text, query.params);

    return results
      .map((r) => this.mapToEntity(r.n.properties))
      .filter((e): e is DomainEntity => e !== null);
  }

  async findByType(type: EntityType, limit?: number, offset?: number): Promise<DomainEntity[]> {
    const label = ENTITY_LABELS[type];
    const builder = new CypherQueryBuilder().match(`(n:${label})`).return('n');

    if (offset) builder.skip(offset);
    if (limit) builder.limit(limit);

    const query = builder.build();
    const results = await this.connection.executeRead<{
      n: { properties: Record<string, unknown> };
    }>(query.text, query.params);

    return results
      .map((r) => this.mapToEntity(r.n.properties))
      .filter((e): e is DomainEntity => e !== null);
  }

  async findByName(name: string, entityType?: EntityType): Promise<DomainEntity[]> {
    const builder = new CypherQueryBuilder();

    if (entityType) {
      const label = ENTITY_LABELS[entityType];
      builder.match(`(n:${label})`);
    } else {
      builder.match('(n)');
    }

    builder.where('n.name CONTAINS $name').param('name', name).return('n');

    const query = builder.build();
    const results = await this.connection.executeRead<{
      n: { properties: Record<string, unknown> };
    }>(query.text, query.params);

    return results
      .map((r) => this.mapToEntity(r.n.properties))
      .filter((e): e is DomainEntity => e !== null);
  }

  async delete(id: EntityId): Promise<boolean> {
    const query = new CypherQueryBuilder()
      .match('(n {id: $id})')
      .param('id', id.value)
      .detachDelete('n')
      .raw('RETURN count(*) as deleted')
      .build();

    const results = await this.connection.executeWrite<{ deleted: number }>(
      query.text,
      query.params
    );
    const firstResult = results[0];
    return results.length > 0 && firstResult !== undefined && firstResult.deleted > 0;
  }

  async exists(id: EntityId): Promise<boolean> {
    const query = new CypherQueryBuilder()
      .match('(n {id: $id})')
      .param('id', id.value)
      .return('count(n) > 0 as exists')
      .build();

    const results = await this.connection.executeRead<{ exists: boolean }>(
      query.text,
      query.params
    );
    const firstResult = results[0];
    return results.length > 0 && firstResult !== undefined && firstResult.exists;
  }

  async count(entityType?: EntityType): Promise<number> {
    const builder = new CypherQueryBuilder();

    if (entityType) {
      const label = ENTITY_LABELS[entityType];
      builder.match(`(n:${label})`);
    } else {
      builder.match('(n)');
    }

    builder.return('count(n) as count');

    const query = builder.build();
    const results = await this.connection.executeRead<{ count: number }>(query.text, query.params);
    const firstResult = results[0];
    return results.length > 0 && firstResult !== undefined ? firstResult.count : 0;
  }

  /**
   * Map Neo4j record to domain entity
   */
  private mapToEntity(props: Record<string, unknown>): DomainEntity | null {
    const entityType = props.entityType as EntityType;
    const id = EntityId.fromString(props.id as string);

    switch (entityType) {
      case 'AIModel': {
        const aiModelProps: {
          name: string;
          category: 'llm' | 'vlm' | 'diffusion' | 'gan' | 'vae' | 'transformer' | 'multimodal' | 'agent' | 'other';
          modality: ('text' | 'image' | 'audio' | 'video' | 'code' | '3d')[];
          releaseDate?: string;
          description?: string;
          parameters?: string;
          contextWindow?: number;
          trainingData?: string;
          license?: string;
          paperUrl?: string;
          githubUrl?: string;
          websiteUrl?: string;
          confidence?: number;
          embedding?: number[];
        } = {
          name: props.name as string,
          category: (props.category as 'llm' | 'vlm' | 'diffusion' | 'gan' | 'vae' | 'transformer' | 'multimodal' | 'agent' | 'other') ?? 'other',
          modality: (props.modality as ('text' | 'image' | 'audio' | 'video' | 'code' | '3d')[]) ?? (props.modalities as ('text' | 'image' | 'audio' | 'video' | 'code' | '3d')[]) ?? ['text'],
        };
        if (props.releaseDate !== undefined) aiModelProps.releaseDate = props.releaseDate as string;
        if (props.releaseYear !== undefined) aiModelProps.releaseDate = props.releaseYear as string;
        if (props.description !== undefined) aiModelProps.description = props.description as string;
        if (props.parameters !== undefined) aiModelProps.parameters = props.parameters as string;
        if (props.contextWindow !== undefined) aiModelProps.contextWindow = props.contextWindow as number;
        if (props.contextLength !== undefined) aiModelProps.contextWindow = props.contextLength as number;
        if (props.trainingData !== undefined) aiModelProps.trainingData = props.trainingData as string;
        if (props.license !== undefined) aiModelProps.license = props.license as string;
        if (props.paperUrl !== undefined) aiModelProps.paperUrl = props.paperUrl as string;
        if (props.githubUrl !== undefined) aiModelProps.githubUrl = props.githubUrl as string;
        if (props.websiteUrl !== undefined) aiModelProps.websiteUrl = props.websiteUrl as string;
        if (props.confidence !== undefined) aiModelProps.confidence = props.confidence as number;
        if (props.embedding !== undefined) aiModelProps.embedding = props.embedding as number[];
        return AIModel.restore(id, aiModelProps);
      }

      case 'Organization': {
        const orgProps: {
          name: string;
          type: 'company' | 'research_lab' | 'university' | 'nonprofit' | 'government' | 'consortium' | 'other';
          country?: string;
          founded?: string;
          description?: string;
          websiteUrl?: string;
          confidence?: number;
          embedding?: number[];
        } = {
          name: props.name as string,
          type: props.type as 'company' | 'research_lab' | 'university' | 'nonprofit' | 'government' | 'consortium' | 'other',
        };
        if (props.country !== undefined) orgProps.country = props.country as string;
        if (props.founded !== undefined) orgProps.founded = props.founded as string;
        if (props.description !== undefined) orgProps.description = props.description as string;
        if (props.websiteUrl !== undefined) orgProps.websiteUrl = props.websiteUrl as string;
        if (props.confidence !== undefined) orgProps.confidence = props.confidence as number;
        if (props.embedding !== undefined) orgProps.embedding = props.embedding as number[];
        return Organization.restore(id, orgProps);
      }

      case 'Technique': {
        const techProps: {
          name: string;
          category: 'architecture' | 'training' | 'optimization' | 'attention' | 'normalization' | 'regularization' | 'sampling' | 'prompting' | 'fine_tuning' | 'alignment' | 'other';
          description?: string;
          paperUrl?: string;
          year?: string;
          confidence?: number;
          embedding?: number[];
        } = {
          name: props.name as string,
          category: props.category as 'architecture' | 'training' | 'optimization' | 'attention' | 'normalization' | 'regularization' | 'sampling' | 'prompting' | 'fine_tuning' | 'alignment' | 'other',
        };
        if (props.description !== undefined) techProps.description = props.description as string;
        if (props.paperUrl !== undefined) techProps.paperUrl = props.paperUrl as string;
        if (props.year !== undefined) techProps.year = props.year as string;
        if (props.confidence !== undefined) techProps.confidence = props.confidence as number;
        if (props.embedding !== undefined) techProps.embedding = props.embedding as number[];
        return Technique.restore(id, techProps);
      }

      case 'Publication': {
        const pubProps: {
          title: string;
          type: 'paper' | 'preprint' | 'blog_post' | 'technical_report' | 'book' | 'thesis' | 'patent' | 'other';
          venue?: string;
          year?: string;
          url?: string;
          abstract?: string;
          citations?: number;
          doi?: string;
          confidence?: number;
          embedding?: number[];
        } = {
          title: props.title as string,
          type: props.type as 'paper' | 'preprint' | 'blog_post' | 'technical_report' | 'book' | 'thesis' | 'patent' | 'other',
        };
        if (props.venue !== undefined) pubProps.venue = props.venue as string;
        if (props.year !== undefined) pubProps.year = props.year as string;
        if (props.url !== undefined) pubProps.url = props.url as string;
        if (props.abstract !== undefined) pubProps.abstract = props.abstract as string;
        if (props.citations !== undefined) pubProps.citations = props.citations as number;
        if (props.doi !== undefined) pubProps.doi = props.doi as string;
        if (props.confidence !== undefined) pubProps.confidence = props.confidence as number;
        if (props.embedding !== undefined) pubProps.embedding = props.embedding as number[];
        return Publication.restore(id, pubProps);
      }

      case 'Person': {
        const personProps: {
          name: string;
          affiliation?: string;
          country?: string;
          hIndex?: number;
          orcid?: string;
          googleScholarId?: string;
          confidence?: number;
          embedding?: number[];
        } = {
          name: props.name as string,
        };
        if (props.affiliation !== undefined) personProps.affiliation = props.affiliation as string;
        if (props.country !== undefined) personProps.country = props.country as string;
        if (props.hIndex !== undefined) personProps.hIndex = props.hIndex as number;
        if (props.orcid !== undefined) personProps.orcid = props.orcid as string;
        if (props.googleScholarId !== undefined) personProps.googleScholarId = props.googleScholarId as string;
        if (props.confidence !== undefined) personProps.confidence = props.confidence as number;
        if (props.embedding !== undefined) personProps.embedding = props.embedding as number[];
        return Person.restore(id, personProps);
      }

      case 'Benchmark': {
        const benchProps: {
          name: string;
          category: 'reasoning' | 'language' | 'code' | 'math' | 'vision' | 'multimodal' | 'safety' | 'general' | 'other';
          description?: string;
          url?: string;
          metric?: string;
          confidence?: number;
          embedding?: number[];
        } = {
          name: props.name as string,
          category: props.category as 'reasoning' | 'language' | 'code' | 'math' | 'vision' | 'multimodal' | 'safety' | 'general' | 'other',
        };
        if (props.description !== undefined) benchProps.description = props.description as string;
        if (props.url !== undefined) benchProps.url = props.url as string;
        if (props.metric !== undefined) benchProps.metric = props.metric as string;
        if (props.confidence !== undefined) benchProps.confidence = props.confidence as number;
        if (props.embedding !== undefined) benchProps.embedding = props.embedding as number[];
        return Benchmark.restore(id, benchProps);
      }

      case 'Concept': {
        const conceptProps: {
          name: string;
          category: 'architecture' | 'training' | 'theory' | 'application' | 'safety' | 'ethics' | 'capability' | 'limitation' | 'other';
          description?: string;
          relatedTerms?: string[];
          confidence?: number;
          embedding?: number[];
        } = {
          name: props.name as string,
          category: props.category as 'architecture' | 'training' | 'theory' | 'application' | 'safety' | 'ethics' | 'capability' | 'limitation' | 'other',
        };
        if (props.description !== undefined) conceptProps.description = props.description as string;
        if (props.relatedTerms !== undefined) conceptProps.relatedTerms = props.relatedTerms as string[];
        if (props.confidence !== undefined) conceptProps.confidence = props.confidence as number;
        if (props.embedding !== undefined) conceptProps.embedding = props.embedding as number[];
        return Concept.restore(id, conceptProps);
      }

      case 'Community': {
        const commProps: {
          name: string;
          level: number;
          summary?: string;
          memberCount?: number;
          keyEntities?: string[];
          embedding?: number[];
        } = {
          name: props.name as string,
          level: props.level as number,
        };
        if (props.summary !== undefined) commProps.summary = props.summary as string;
        if (props.memberCount !== undefined) commProps.memberCount = props.memberCount as number;
        if (props.keyEntities !== undefined) commProps.keyEntities = props.keyEntities as string[];
        if (props.embedding !== undefined) commProps.embedding = props.embedding as number[];
        return Community.restore(id, commProps);
      }

      default:
        return null;
    }
  }
}
