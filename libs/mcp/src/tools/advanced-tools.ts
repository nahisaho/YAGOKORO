/**
 * @fileoverview Advanced MCP Tools
 *
 * Provides advanced tools for natural language queries, chain-of-thought reasoning,
 * and hallucination detection integrated with the MCP server.
 */

import { z } from 'zod';
import type { ToolCallResult, ToolDefinition, GraphRAGDependencies } from '../server/types.js';

/**
 * Extended dependencies including advanced services
 */
export interface AdvancedToolDependencies extends GraphRAGDependencies {
  /** Natural Language Query service (optional) */
  nlqService?: NLQServiceInterface;
  /** Chain-of-Thought generator (optional) */
  cotGenerator?: CoTGeneratorInterface;
  /** Confidence scorer (optional) */
  confidenceScorer?: ConfidenceScorerInterface;
  /** Consistency checker (optional) */
  consistencyChecker?: ConsistencyCheckerInterface;
  /** Contradiction detector (optional) */
  contradictionDetector?: ContradictionDetectorInterface;
}

/**
 * NLQ Service Interface
 */
export interface NLQServiceInterface {
  query(naturalLanguage: string): Promise<NLQResult>;
}

export interface NLQResult {
  cypher: string;
  intent: string;
  entities: string[];
  results: unknown[];
  confidence: number;
  executionTimeMs: number;
}

/**
 * CoT Generator Interface
 */
export interface CoTGeneratorInterface {
  generateChain(input: CoTInput): Promise<CoTChain>;
}

export interface CoTInput {
  query: string;
  entityIds?: string[];
  maxSteps?: number;
}

export interface CoTChain {
  chainId: string;
  query: string;
  steps: CoTStep[];
  conclusion: string;
  confidence: number;
  totalTimeMs: number;
}

export interface CoTStep {
  stepNumber: number;
  reasoning: string;
  evidence: string[];
  confidence: number;
}

/**
 * Confidence Scorer Interface
 */
export interface ConfidenceScorerInterface {
  score(input: ConfidenceInput): Promise<ConfidenceResult>;
}

export interface ConfidenceInput {
  query: string;
  answer: string;
  entityIds?: string[];
  paths?: unknown[];
}

export interface ConfidenceResult {
  overall: number;
  metrics: Array<{
    name: string;
    score: number;
    explanation: string;
  }>;
  isLow: boolean;
  warning?: string;
  suggestions?: string[];
}

/**
 * Consistency Checker Interface
 */
export interface ConsistencyCheckerInterface {
  check(claim: FactClaim): Promise<ConsistencyResult>;
  checkAll(claims: FactClaim[]): Promise<ConsistencyResult[]>;
}

export interface FactClaim {
  id: string;
  text: string;
  entityIds: string[];
  confidence: number;
}

export interface ConsistencyResult {
  claim: FactClaim;
  isConsistent: boolean;
  score: number;
  explanation: string;
  suggestions?: string[];
}

/**
 * Contradiction Detector Interface
 */
export interface ContradictionDetectorInterface {
  detect(claims: FactClaim[]): Promise<ContradictionResult>;
}

export interface ContradictionResult {
  claims: FactClaim[];
  contradictions: Contradiction[];
  coherenceScore: number;
  isCoherent: boolean;
  summary: string;
}

export interface Contradiction {
  id: string;
  type: string;
  severity: number;
  description: string;
  resolution?: string;
}

// ============================================================================
// Tool Schemas
// ============================================================================

/**
 * Schema for naturalLanguageQuery tool
 */
export const NaturalLanguageQueryInputSchema = z.object({
  query: z
    .string()
    .describe('Natural language question about the knowledge graph (e.g., "Who developed GPT-4?")'),
  includeExplanation: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include step-by-step reasoning explanation'),
});

/**
 * Schema for chainOfThought tool
 */
export const ChainOfThoughtInputSchema = z.object({
  query: z.string().describe('Complex question requiring multi-step reasoning'),
  entityIds: z
    .array(z.string())
    .optional()
    .describe('Specific entity IDs to include in reasoning'),
  maxSteps: z
    .number()
    .min(2)
    .max(10)
    .optional()
    .default(5)
    .describe('Maximum reasoning steps'),
});

/**
 * Schema for validateResponse tool
 */
export const ValidateResponseInputSchema = z.object({
  query: z.string().describe('Original query'),
  response: z.string().describe('Response to validate'),
  entityIds: z.array(z.string()).optional().describe('Entity IDs mentioned in response'),
  strictMode: z
    .boolean()
    .optional()
    .default(false)
    .describe('Enable strict validation (lower thresholds)'),
});

/**
 * Schema for checkConsistency tool
 */
export const CheckConsistencyInputSchema = z.object({
  claims: z
    .array(
      z.object({
        text: z.string().describe('Claim text'),
        entityIds: z.array(z.string()).optional().default([]),
      })
    )
    .describe('List of claims to check for consistency'),
});

// ============================================================================
// Tool Implementations
// ============================================================================

/**
 * Create naturalLanguageQuery tool
 */
export function createNaturalLanguageQueryTool(deps: AdvancedToolDependencies): ToolDefinition {
  return {
    name: 'naturalLanguageQuery',
    description:
      'Query the knowledge graph using natural language. Converts your question to a graph query and returns relevant results with confidence scoring.',
    inputSchema: NaturalLanguageQueryInputSchema,
    handler: async (input): Promise<ToolCallResult> => {
      const { query, includeExplanation } = NaturalLanguageQueryInputSchema.parse(input);

      if (!deps.nlqService) {
        // Fallback to basic vector search
        const results = await deps.vectorStore.search(query, 10);

        if (results.length === 0) {
          return {
            content: [{ type: 'text', text: `No results found for: "${query}"` }],
          };
        }

        let response = `Found ${results.length} results for: "${query}"\n\n`;
        for (const result of results) {
          const entity = await deps.entityRepository.findById(result.id);
          if (entity) {
            response += `- ${entity.name} (${entity.type})\n`;
            if (entity.description) {
              response += `  ${entity.description}\n`;
            }
          }
        }

        return {
          content: [{ type: 'text', text: response.trim() }],
        };
      }

      try {
        const result = await deps.nlqService.query(query);

        let response = `## Query Results\n\n`;
        response += `**Question**: ${query}\n`;
        response += `**Intent**: ${result.intent}\n`;
        response += `**Confidence**: ${(result.confidence * 100).toFixed(1)}%\n\n`;

        if (includeExplanation) {
          response += `### Generated Query\n\`\`\`cypher\n${result.cypher}\n\`\`\`\n\n`;
        }

        if (result.results.length === 0) {
          response += `No matching results found.\n`;
        } else {
          response += `### Results (${result.results.length})\n\n`;
          for (const item of result.results.slice(0, 10)) {
            response += `- ${JSON.stringify(item)}\n`;
          }
          if (result.results.length > 10) {
            response += `\n... and ${result.results.length - 10} more results\n`;
          }
        }

        response += `\n_Query executed in ${result.executionTimeMs}ms_`;

        return {
          content: [{ type: 'text', text: response }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    },
  };
}

/**
 * Create chainOfThought tool
 */
export function createChainOfThoughtTool(deps: AdvancedToolDependencies): ToolDefinition {
  return {
    name: 'chainOfThought',
    description:
      'Perform multi-step reasoning to answer complex questions. Provides transparent reasoning chain with evidence from the knowledge graph.',
    inputSchema: ChainOfThoughtInputSchema,
    handler: async (input): Promise<ToolCallResult> => {
      const { query, entityIds, maxSteps } = ChainOfThoughtInputSchema.parse(input);

      if (!deps.cotGenerator) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'Chain-of-thought reasoning is not available. Please configure the CoT generator.',
            },
          ],
        };
      }

      try {
        const cotInput: CoTInput = { query, maxSteps };
        if (entityIds !== undefined) {
          cotInput.entityIds = entityIds;
        }
        const chain = await deps.cotGenerator.generateChain(cotInput);

        let response = `## Chain of Thought Reasoning\n\n`;
        response += `**Question**: ${query}\n`;
        response += `**Confidence**: ${(chain.confidence * 100).toFixed(1)}%\n\n`;

        response += `### Reasoning Steps\n\n`;
        for (const step of chain.steps) {
          response += `**Step ${step.stepNumber}**: ${step.reasoning}\n`;
          if (step.evidence.length > 0) {
            response += `  Evidence:\n`;
            for (const ev of step.evidence) {
              response += `  - ${ev}\n`;
            }
          }
          response += `  Confidence: ${(step.confidence * 100).toFixed(0)}%\n\n`;
        }

        response += `### Conclusion\n\n${chain.conclusion}\n\n`;
        response += `_Reasoning completed in ${chain.totalTimeMs}ms_`;

        return {
          content: [{ type: 'text', text: response }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Reasoning failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    },
  };
}

/**
 * Create validateResponse tool
 */
export function createValidateResponseTool(deps: AdvancedToolDependencies): ToolDefinition {
  return {
    name: 'validateResponse',
    description:
      'Validate an AI response against the knowledge graph. Checks for hallucinations, consistency, and provides confidence scores.',
    inputSchema: ValidateResponseInputSchema,
    handler: async (input): Promise<ToolCallResult> => {
      const { query, response, entityIds, strictMode: _strictMode } =
        ValidateResponseInputSchema.parse(input);

      let responseText = `## Response Validation\n\n`;
      responseText += `**Query**: ${query}\n`;
      responseText += `**Response**: ${response.slice(0, 200)}${response.length > 200 ? '...' : ''}\n\n`;

      // Confidence scoring
      if (deps.confidenceScorer) {
        try {
          const confidenceInput: ConfidenceInput = {
            query,
            answer: response,
          };
          if (entityIds !== undefined) {
            confidenceInput.entityIds = entityIds;
          }
          const confidence = await deps.confidenceScorer.score(confidenceInput);

          responseText += `### Confidence Analysis\n\n`;
          responseText += `**Overall Confidence**: ${(confidence.overall * 100).toFixed(1)}%\n`;
          responseText += `**Status**: ${confidence.isLow ? '⚠️ Low Confidence' : '✅ Acceptable'}\n\n`;

          if (confidence.metrics.length > 0) {
            responseText += `| Metric | Score | Details |\n`;
            responseText += `|--------|-------|--------|\n`;
            for (const m of confidence.metrics) {
              responseText += `| ${m.name} | ${(m.score * 100).toFixed(0)}% | ${m.explanation} |\n`;
            }
            responseText += '\n';
          }

          if (confidence.warning) {
            responseText += `**Warning**: ${confidence.warning}\n\n`;
          }

          if (confidence.suggestions && confidence.suggestions.length > 0) {
            responseText += `**Suggestions**:\n`;
            for (const s of confidence.suggestions) {
              responseText += `- ${s}\n`;
            }
            responseText += '\n';
          }
        } catch (error) {
          responseText += `_Confidence scoring unavailable_\n\n`;
        }
      }

      // Consistency checking
      if (deps.consistencyChecker) {
        try {
          // Extract simple claims from response
          const sentences = response.split(/[。.!?]/).filter((s) => s.trim().length > 10);
          const claims: FactClaim[] = sentences.slice(0, 5).map((text, i) => ({
            id: `claim-${i}`,
            text: text.trim(),
            entityIds: entityIds ?? [],
            confidence: 0.7,
          }));

          if (claims.length > 0) {
            const results = await deps.consistencyChecker.checkAll(claims);
            const consistentCount = results.filter((r) => r.isConsistent).length;

            responseText += `### Consistency Check\n\n`;
            responseText += `**Consistent Claims**: ${consistentCount}/${claims.length}\n\n`;

            for (const r of results) {
              const status = r.isConsistent ? '✅' : '❌';
              responseText += `${status} "${r.claim.text.slice(0, 60)}..."\n`;
              responseText += `   Score: ${(r.score * 100).toFixed(0)}%\n`;
            }
            responseText += '\n';
          }
        } catch (error) {
          responseText += `_Consistency checking unavailable_\n\n`;
        }
      }

      // Contradiction detection
      if (deps.contradictionDetector) {
        try {
          const sentences = response.split(/[。.!?]/).filter((s) => s.trim().length > 10);
          const claims: FactClaim[] = sentences.slice(0, 5).map((text, i) => ({
            id: `claim-${i}`,
            text: text.trim(),
            entityIds: entityIds ?? [],
            confidence: 0.7,
          }));

          if (claims.length >= 2) {
            const result = await deps.contradictionDetector.detect(claims);

            responseText += `### Coherence Analysis\n\n`;
            responseText += `**Coherence Score**: ${(result.coherenceScore * 100).toFixed(1)}%\n`;
            responseText += `**Status**: ${result.isCoherent ? '✅ Coherent' : '⚠️ Potential Issues'}\n\n`;

            if (result.contradictions.length > 0) {
              responseText += `**Detected Issues**:\n`;
              for (const c of result.contradictions.slice(0, 3)) {
                responseText += `- [${c.type}] ${c.description}\n`;
                if (c.resolution) {
                  responseText += `  Suggestion: ${c.resolution}\n`;
                }
              }
            }
          }
        } catch (error) {
          responseText += `_Coherence analysis unavailable_\n`;
        }
      }

      // Final verdict
      responseText += `\n---\n`;
      const hasValidators =
        deps.confidenceScorer || deps.consistencyChecker || deps.contradictionDetector;
      if (!hasValidators) {
        responseText += `⚠️ No validation services configured. Please enable confidence scoring, consistency checking, or contradiction detection for full validation.`;
      }

      return {
        content: [{ type: 'text', text: responseText }],
      };
    },
  };
}

/**
 * Create checkConsistency tool
 */
export function createCheckConsistencyTool(deps: AdvancedToolDependencies): ToolDefinition {
  return {
    name: 'checkConsistency',
    description:
      'Check a set of claims against the knowledge graph for consistency. Useful for fact-checking and verification.',
    inputSchema: CheckConsistencyInputSchema,
    handler: async (input): Promise<ToolCallResult> => {
      const { claims } = CheckConsistencyInputSchema.parse(input);

      if (!deps.consistencyChecker) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'Consistency checking is not available. Please configure the consistency checker.',
            },
          ],
        };
      }

      try {
        const factClaims: FactClaim[] = claims.map((c, i) => ({
          id: `claim-${i}`,
          text: c.text,
          entityIds: c.entityIds,
          confidence: 0.8,
        }));

        const results = await deps.consistencyChecker.checkAll(factClaims);

        let response = `## Consistency Check Results\n\n`;
        response += `Checked ${claims.length} claim(s) against the knowledge graph.\n\n`;

        const consistent = results.filter((r) => r.isConsistent);
        const inconsistent = results.filter((r) => !r.isConsistent);

        response += `**Summary**: ${consistent.length} consistent, ${inconsistent.length} inconsistent\n\n`;

        for (const result of results) {
          const status = result.isConsistent ? '✅' : '❌';
          response += `### ${status} Claim: "${result.claim.text}"\n\n`;
          response += `- **Consistency Score**: ${(result.score * 100).toFixed(1)}%\n`;
          response += `- **Explanation**: ${result.explanation}\n`;
          if (result.suggestions && result.suggestions.length > 0) {
            response += `- **Suggestions**:\n`;
            for (const s of result.suggestions) {
              response += `  - ${s}\n`;
            }
          }
          response += '\n';
        }

        return {
          content: [{ type: 'text', text: response }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Consistency check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    },
  };
}

/**
 * Create all advanced tools
 */
export function createAdvancedTools(deps: AdvancedToolDependencies): ToolDefinition[] {
  return [
    createNaturalLanguageQueryTool(deps),
    createChainOfThoughtTool(deps),
    createValidateResponseTool(deps),
    createCheckConsistencyTool(deps),
  ];
}
