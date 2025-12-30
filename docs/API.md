# YAGOKORO API Reference

YAGOKORO is a GraphRAG (Graph-based Retrieval Augmented Generation) system designed for managing and querying knowledge graphs about AI and science research.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       Applications                          │
│  ┌─────────────────┐  ┌─────────────────┐                 │
│  │   CLI (yagokoro)│  │   MCP Server    │                 │
│  └────────┬────────┘  └────────┬────────┘                 │
└───────────┼────────────────────┼────────────────────────────┘
            │                    │
┌───────────▼────────────────────▼────────────────────────────┐
│                        Libraries                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ normalizer│  │   nlq    │  │ reasoner │  │ analyzer │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ graphrag │  │  domain  │  │   mcp    │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
│                                                             │
│  ┌──────────┐  ┌──────────┐                               │
│  │  neo4j   │  │  vector  │                               │
│  └──────────┘  └──────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

## Packages

### Core Packages

- **@yagokoro/domain** - Domain entities, value objects, and error handling
- **@yagokoro/neo4j** - Neo4j graph database connectivity and repositories
- **@yagokoro/vector** - Qdrant vector database and embedding services

### Feature Packages

- **@yagokoro/graphrag** - GraphRAG implementation (extraction, community detection, search)
- **@yagokoro/normalizer** - Entity normalization and deduplication
- **@yagokoro/nlq** - Natural Language Query processing
- **@yagokoro/reasoner** - Multi-hop reasoning and path finding
- **@yagokoro/analyzer** - Research gap analysis and lifecycle tracking

### Interface Packages

- **@yagokoro/mcp** - Model Context Protocol server implementation
- **@yagokoro/cli** - Command-line interface

## Quick Start

### Installation

```bash
pnpm install
```

### Running the MCP Server

```bash
pnpm yagokoro mcp start
```

### Using the CLI

```bash
# Entity operations
pnpm yagokoro entity create --name "GPT-4" --type AIModel
pnpm yagokoro entity search --query "transformer"

# Search operations
pnpm yagokoro search local "What is GPT-4?"
pnpm yagokoro search global "AI research trends"

# Graph operations
pnpm yagokoro graph stats
pnpm yagokoro community detect
```

## Key Concepts

### Entities

Entities represent nodes in the knowledge graph:

- **AIModel** - AI/ML models (e.g., GPT-4, Claude)
- **Organization** - Companies and institutions
- **Person** - Researchers and developers
- **Technique** - Methods and algorithms
- **Concept** - Abstract concepts
- **Publication** - Papers and articles
- **Benchmark** - Evaluation datasets

### Relations

Relations connect entities:

- `DEVELOPED_BY` - Model → Organization
- `RESEARCHES` - Person → Concept
- `USES_TECHNIQUE` - Model → Technique
- `PUBLISHED_IN` - Publication → Venue
- `EVALUATED_ON` - Model → Benchmark

### Communities

Hierarchical groups of related entities detected using the Leiden algorithm.

## API Examples

### Creating an Entity

```typescript
import { EntityRepository } from '@yagokoro/neo4j';

const repo = new EntityRepository(connection);
const entity = await repo.create({
  name: 'GPT-4',
  type: 'AIModel',
  description: 'Large language model by OpenAI',
  confidence: 0.95,
});
```

### Performing a Search

```typescript
import { createLocalSearch } from '@yagokoro/graphrag';

const search = createLocalSearch(neo4jConn, vectorConn, llmClient);
const result = await search.query('Who developed GPT-4?');
console.log(result.answer);
```

### Natural Language Query

```typescript
import { createNLQProcessor } from '@yagokoro/nlq';

const nlq = createNLQProcessor(llmClient);
const result = await nlq.process('GPT-4を開発した組織は？');
console.log(result.cypher); // Generated Cypher query
```

### Multi-hop Reasoning

```typescript
import { createMultiHopReasoner } from '@yagokoro/reasoner';

const reasoner = createMultiHopReasoner(neo4jConn, llmClient);
const result = await reasoner.reason({
  from: 'entity-gpt4',
  to: 'entity-transformer',
  maxHops: 4,
});
console.log(result.path);
console.log(result.explanation);
```

## MCP Tools

Available MCP tools:

| Tool | Description |
|------|-------------|
| `search_entities` | Search for entities |
| `create_entity` | Create a new entity |
| `local_search` | GraphRAG local search |
| `global_search` | GraphRAG global search |
| `natural_language_query` | Convert NL to Cypher |
| `chain_of_thought` | Multi-step reasoning |
| `validate_response` | Check response validity |
| `find_path` | Find path between entities |
| `analyze_lifecycle` | Entity lifecycle analysis |

## Error Handling

All errors extend `AppError` with standardized codes:

```typescript
import { AppError, ErrorCodes } from '@yagokoro/domain';

try {
  await operation();
} catch (error) {
  if (AppError.isAppError(error)) {
    console.log(error.code);        // ERR_1002
    console.log(error.message);     // Entity not found
    console.log(error.suggestions); // ["Check entity ID..."]
  }
}
```

## Configuration

Environment variables:

```bash
# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password

# Qdrant
QDRANT_URL=http://localhost:6333

# LLM
OPENAI_API_KEY=sk-...
```

## License

MIT License - See [LICENSE](LICENSE) for details.
