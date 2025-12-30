import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ErrorCodes,
  ErrorSuggestions,
  getSuggestionsForCode,
  createErrorResponse,
  AppError,
  ValidationError,
  NotFoundError,
  ConnectionError,
  RateLimitError,
  TimeoutError,
  Neo4jConnectionError,
  Neo4jQueryError,
  Neo4jNotConnectedError,
  Neo4jConfigError,
  QdrantConnectionError,
  QdrantConfigError,
  EmbeddingError,
  GraphRAGExtractionError,
  GraphRAGCommunityError,
  GraphRAGSearchError,
  MCPToolNotFoundError,
  MCPInvalidParamsError,
  MCPExecutionError,
  MCPAuthError,
  CLIInvalidCommandError,
  CLIMissingArgumentError,
  CLIFileNotFoundError,
  BackupError,
  BackupRestoreError,
  RetryHandler,
  withRetry,
  Result,
  tryCatch,
} from './ErrorHandling.js';

describe('ErrorCodes', () => {
  it('should have unique error codes', () => {
    const codes = Object.values(ErrorCodes);
    const uniqueCodes = new Set(codes);
    expect(codes.length).toBe(uniqueCodes.size);
  });

  it('should follow naming convention', () => {
    for (const [key, code] of Object.entries(ErrorCodes)) {
      expect(code).toMatch(/^ERR_\d{4}$/);
    }
  });

  it('should have all error code categories', () => {
    // General (1xxx)
    expect(ErrorCodes.UNKNOWN).toBe('ERR_1000');
    expect(ErrorCodes.PERMISSION_DENIED).toBe('ERR_1007');
    expect(ErrorCodes.CONFIGURATION).toBe('ERR_1008');

    // Neo4j (2xxx)
    expect(ErrorCodes.NEO4J_NOT_CONNECTED).toBe('ERR_2006');

    // Qdrant (3xxx)
    expect(ErrorCodes.QDRANT_CONFIG).toBe('ERR_3005');

    // MCP (6xxx)
    expect(ErrorCodes.MCP_AUTH).toBe('ERR_6005');

    // CLI (7xxx)
    expect(ErrorCodes.CLI_INVALID_COMMAND).toBe('ERR_7001');
    expect(ErrorCodes.CLI_EXECUTION).toBe('ERR_7004');

    // Backup (8xxx)
    expect(ErrorCodes.BACKUP_FAILED).toBe('ERR_8001');
    expect(ErrorCodes.BACKUP_INVALID_FORMAT).toBe('ERR_8003');
  });
});

describe('ErrorSuggestions', () => {
  it('should have suggestions for all error codes', () => {
    for (const code of Object.values(ErrorCodes)) {
      const suggestions = ErrorSuggestions[code];
      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);
    }
  });

  it('should return suggestions via getSuggestionsForCode', () => {
    const suggestions = getSuggestionsForCode(ErrorCodes.NEO4J_CONNECTION);
    expect(suggestions).toContain('Neo4jが起動しているか確認してください: docker ps');
  });

  it('should return unknown suggestions for invalid code', () => {
    const suggestions = getSuggestionsForCode('INVALID_CODE' as any);
    expect(suggestions).toEqual(ErrorSuggestions[ErrorCodes.UNKNOWN]);
  });
});

describe('AppError', () => {
  it('should create error with required fields', () => {
    const error = new AppError({
      code: ErrorCodes.UNKNOWN,
      message: 'Test error',
    });

    expect(error.code).toBe(ErrorCodes.UNKNOWN);
    expect(error.message).toBe('Test error');
    expect(error.retryable).toBe(false);
    expect(error.httpStatus).toBe(500);
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it('should include suggestions by default', () => {
    const error = new AppError({
      code: ErrorCodes.NEO4J_CONNECTION,
      message: 'Connection failed',
    });

    expect(error.suggestions).toBeDefined();
    expect(error.suggestions.length).toBeGreaterThan(0);
    expect(error.suggestions).toContain('Neo4jが起動しているか確認してください: docker ps');
  });

  it('should allow custom suggestions', () => {
    const customSuggestions = ['カスタム提案1', 'カスタム提案2'];
    const error = new AppError({
      code: ErrorCodes.UNKNOWN,
      message: 'Test',
      suggestions: customSuggestions,
    });

    expect(error.suggestions).toEqual(customSuggestions);
  });

  it('should support optional fields', () => {
    const cause = new Error('Original error');
    const error = new AppError({
      code: ErrorCodes.NEO4J_CONNECTION,
      message: 'Connection failed',
      cause,
      context: { host: 'localhost' },
      retryable: true,
      httpStatus: 503,
    });

    expect(error.cause).toBe(cause);
    expect(error.context).toEqual({ host: 'localhost' });
    expect(error.retryable).toBe(true);
    expect(error.httpStatus).toBe(503);
  });

  it('should serialize to JSON with suggestions', () => {
    const error = new AppError({
      code: ErrorCodes.VALIDATION,
      message: 'Invalid input',
      context: { field: 'name' },
    });

    const json = error.toJSON();

    expect(json.code).toBe(ErrorCodes.VALIDATION);
    expect(json.message).toBe('Invalid input');
    expect(json.context).toEqual({ field: 'name' });
    expect(json.suggestions).toBeDefined();
    expect(json.timestamp).toBeDefined();
  });

  it('should generate error response', () => {
    const error = new AppError({
      code: ErrorCodes.NOT_FOUND,
      message: 'Entity not found',
      context: { id: '123' },
    });

    const response = error.toErrorResponse();

    expect(response.error.code).toBe(ErrorCodes.NOT_FOUND);
    expect(response.error.message).toBe('Entity not found');
    expect(response.error.suggestions).toBeDefined();
    expect(response.error.context).toEqual({ id: '123' });
    expect(response.error.retryable).toBe(false);
    expect(response.error.timestamp).toBeDefined();
  });

  describe('isAppError', () => {
    it('should return true for AppError', () => {
      const error = new AppError({
        code: ErrorCodes.UNKNOWN,
        message: 'Test',
      });
      expect(AppError.isAppError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      expect(AppError.isAppError(new Error('Test'))).toBe(false);
    });

    it('should return false for non-errors', () => {
      expect(AppError.isAppError('string')).toBe(false);
      expect(AppError.isAppError(null)).toBe(false);
    });
  });

  describe('from', () => {
    it('should return same AppError', () => {
      const original = new AppError({
        code: ErrorCodes.VALIDATION,
        message: 'Original',
      });
      expect(AppError.from(original)).toBe(original);
    });

    it('should convert Error to AppError', () => {
      const original = new Error('Test error');
      const converted = AppError.from(original);

      expect(converted).toBeInstanceOf(AppError);
      expect(converted.message).toBe('Test error');
      expect(converted.cause).toBe(original);
    });

    it('should convert string to AppError', () => {
      const converted = AppError.from('string error');
      expect(converted.message).toBe('string error');
    });

    it('should use provided default code', () => {
      const converted = AppError.from(new Error('Test'), ErrorCodes.NEO4J_QUERY);
      expect(converted.code).toBe(ErrorCodes.NEO4J_QUERY);
    });
  });
});

describe('Specialized Error Classes', () => {
  describe('ValidationError', () => {
    it('should have correct properties', () => {
      const error = new ValidationError('Invalid email', { field: 'email' });

      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe(ErrorCodes.VALIDATION);
      expect(error.httpStatus).toBe(400);
      expect(error.retryable).toBe(false);
      expect(error.context).toEqual({ field: 'email' });
    });
  });

  describe('NotFoundError', () => {
    it('should format message with resource and id', () => {
      const error = new NotFoundError('Entity', 'entity-123');

      expect(error.name).toBe('NotFoundError');
      expect(error.message).toBe('Entity not found: entity-123');
      expect(error.httpStatus).toBe(404);
      expect(error.context).toEqual({ resource: 'Entity', id: 'entity-123' });
    });

    it('should format message without id', () => {
      const error = new NotFoundError('Config');
      expect(error.message).toBe('Config not found');
    });
  });

  describe('ConnectionError', () => {
    it('should be retryable', () => {
      const error = new ConnectionError('Neo4j');

      expect(error.name).toBe('ConnectionError');
      expect(error.httpStatus).toBe(503);
      expect(error.retryable).toBe(true);
    });
  });

  describe('RateLimitError', () => {
    it('should include retryAfter', () => {
      const error = new RateLimitError('OpenAI', 60);

      expect(error.name).toBe('RateLimitError');
      expect(error.httpStatus).toBe(429);
      expect(error.retryAfter).toBe(60);
      expect(error.retryable).toBe(true);
    });
  });

  describe('TimeoutError', () => {
    it('should format message correctly', () => {
      const error = new TimeoutError('database query', 5000);

      expect(error.name).toBe('TimeoutError');
      expect(error.message).toBe("Operation 'database query' timed out after 5000ms");
      expect(error.httpStatus).toBe(504);
      expect(error.retryable).toBe(true);
    });
  });
});

describe('Neo4j Error Classes', () => {
  describe('Neo4jConnectionError', () => {
    it('should have correct properties', () => {
      const cause = new Error('ECONNREFUSED');
      const error = new Neo4jConnectionError('Failed to connect', cause);

      expect(error.name).toBe('Neo4jConnectionError');
      expect(error.code).toBe(ErrorCodes.NEO4J_CONNECTION);
      expect(error.httpStatus).toBe(503);
      expect(error.retryable).toBe(true);
      expect(error.cause).toBe(cause);
    });
  });

  describe('Neo4jQueryError', () => {
    it('should include query in context', () => {
      const error = new Neo4jQueryError('Invalid syntax', 'MATCH (n) RETURN');

      expect(error.name).toBe('Neo4jQueryError');
      expect(error.code).toBe(ErrorCodes.NEO4J_QUERY);
      expect(error.context).toEqual({ query: 'MATCH (n) RETURN' });
      expect(error.retryable).toBe(false);
    });
  });

  describe('Neo4jNotConnectedError', () => {
    it('should have predefined message', () => {
      const error = new Neo4jNotConnectedError();

      expect(error.name).toBe('Neo4jNotConnectedError');
      expect(error.code).toBe(ErrorCodes.NEO4J_NOT_CONNECTED);
      expect(error.message).toBe('Not connected to Neo4j. Call connect() first.');
    });
  });

  describe('Neo4jConfigError', () => {
    it('should list missing variables', () => {
      const error = new Neo4jConfigError(['NEO4J_URI', 'NEO4J_PASSWORD']);

      expect(error.name).toBe('Neo4jConfigError');
      expect(error.code).toBe(ErrorCodes.CONFIGURATION);
      expect(error.message).toContain('NEO4J_URI');
      expect(error.context).toEqual({ missingVars: ['NEO4J_URI', 'NEO4J_PASSWORD'] });
    });
  });
});

describe('Qdrant/Vector Error Classes', () => {
  describe('QdrantConnectionError', () => {
    it('should have correct properties', () => {
      const error = new QdrantConnectionError('Connection refused');

      expect(error.name).toBe('QdrantConnectionError');
      expect(error.code).toBe(ErrorCodes.QDRANT_CONNECTION);
      expect(error.httpStatus).toBe(503);
      expect(error.retryable).toBe(true);
    });
  });

  describe('QdrantConfigError', () => {
    it('should list missing variables', () => {
      const error = new QdrantConfigError(['QDRANT_URL']);

      expect(error.name).toBe('QdrantConfigError');
      expect(error.code).toBe(ErrorCodes.QDRANT_CONFIG);
      expect(error.message).toContain('QDRANT_URL');
    });
  });

  describe('EmbeddingError', () => {
    it('should have correct properties', () => {
      const error = new EmbeddingError('Failed to generate embedding');

      expect(error.name).toBe('EmbeddingError');
      expect(error.code).toBe(ErrorCodes.EMBEDDING_GENERATION);
      expect(error.httpStatus).toBe(500);
    });
  });
});

describe('GraphRAG Error Classes', () => {
  describe('GraphRAGExtractionError', () => {
    it('should have correct properties', () => {
      const error = new GraphRAGExtractionError('Failed to extract entities');

      expect(error.name).toBe('GraphRAGExtractionError');
      expect(error.code).toBe(ErrorCodes.GRAPHRAG_EXTRACTION);
      expect(error.retryable).toBe(false);
    });
  });

  describe('GraphRAGCommunityError', () => {
    it('should have correct properties', () => {
      const error = new GraphRAGCommunityError('Failed to detect communities');

      expect(error.name).toBe('GraphRAGCommunityError');
      expect(error.code).toBe(ErrorCodes.GRAPHRAG_COMMUNITY);
    });
  });

  describe('GraphRAGSearchError', () => {
    it('should be retryable', () => {
      const error = new GraphRAGSearchError('Search timeout');

      expect(error.name).toBe('GraphRAGSearchError');
      expect(error.code).toBe(ErrorCodes.GRAPHRAG_SEARCH);
      expect(error.retryable).toBe(true);
    });
  });
});

describe('MCP Error Classes', () => {
  describe('MCPToolNotFoundError', () => {
    it('should include tool name', () => {
      const error = new MCPToolNotFoundError('queryGraph');

      expect(error.name).toBe('MCPToolNotFoundError');
      expect(error.code).toBe(ErrorCodes.MCP_TOOL_NOT_FOUND);
      expect(error.message).toBe('Tool not found: queryGraph');
      expect(error.httpStatus).toBe(404);
      expect(error.context).toEqual({ toolName: 'queryGraph' });
    });
  });

  describe('MCPInvalidParamsError', () => {
    it('should include params context', () => {
      const error = new MCPInvalidParamsError('Invalid query parameter', { query: '' });

      expect(error.name).toBe('MCPInvalidParamsError');
      expect(error.code).toBe(ErrorCodes.MCP_INVALID_PARAMS);
      expect(error.httpStatus).toBe(400);
    });
  });

  describe('MCPExecutionError', () => {
    it('should include tool name', () => {
      const cause = new Error('Internal error');
      const error = new MCPExecutionError('Tool execution failed', 'queryGraph', cause);

      expect(error.name).toBe('MCPExecutionError');
      expect(error.code).toBe(ErrorCodes.MCP_EXECUTION);
      expect(error.context).toEqual({ toolName: 'queryGraph' });
      expect(error.cause).toBe(cause);
    });
  });

  describe('MCPAuthError', () => {
    it('should have 401 status', () => {
      const error = new MCPAuthError('Invalid API key');

      expect(error.name).toBe('MCPAuthError');
      expect(error.code).toBe(ErrorCodes.MCP_AUTH);
      expect(error.httpStatus).toBe(401);
    });
  });
});

describe('CLI Error Classes', () => {
  describe('CLIInvalidCommandError', () => {
    it('should include command name', () => {
      const error = new CLIInvalidCommandError('foobar');

      expect(error.name).toBe('CLIInvalidCommandError');
      expect(error.code).toBe(ErrorCodes.CLI_INVALID_COMMAND);
      expect(error.message).toBe('Invalid command: foobar');
      expect(error.context).toEqual({ command: 'foobar' });
    });
  });

  describe('CLIMissingArgumentError', () => {
    it('should include argument name', () => {
      const error = new CLIMissingArgumentError('--output');

      expect(error.name).toBe('CLIMissingArgumentError');
      expect(error.code).toBe(ErrorCodes.CLI_MISSING_ARGUMENT);
      expect(error.message).toBe('Missing required argument: --output');
    });
  });

  describe('CLIFileNotFoundError', () => {
    it('should include file path', () => {
      const error = new CLIFileNotFoundError('/path/to/file.json');

      expect(error.name).toBe('CLIFileNotFoundError');
      expect(error.code).toBe(ErrorCodes.CLI_FILE_NOT_FOUND);
      expect(error.httpStatus).toBe(404);
      expect(error.context).toEqual({ path: '/path/to/file.json' });
    });
  });
});

describe('Backup Error Classes', () => {
  describe('BackupError', () => {
    it('should have correct properties', () => {
      const error = new BackupError('Backup creation failed');

      expect(error.name).toBe('BackupError');
      expect(error.code).toBe(ErrorCodes.BACKUP_FAILED);
      expect(error.retryable).toBe(false);
    });
  });

  describe('BackupRestoreError', () => {
    it('should have correct properties', () => {
      const cause = new Error('File corrupted');
      const error = new BackupRestoreError('Restore failed', cause);

      expect(error.name).toBe('BackupRestoreError');
      expect(error.code).toBe(ErrorCodes.BACKUP_RESTORE_FAILED);
      expect(error.cause).toBe(cause);
    });
  });
});

describe('createErrorResponse', () => {
  it('should create error response from AppError', () => {
    const error = new ValidationError('Invalid input');
    const response = createErrorResponse(error);

    expect(response.error.code).toBe(ErrorCodes.VALIDATION);
    expect(response.error.message).toBe('Invalid input');
    expect(response.error.suggestions).toBeDefined();
    expect(response.error.retryable).toBe(false);
  });

  it('should create error response from plain Error', () => {
    const error = new Error('Something went wrong');
    const response = createErrorResponse(error);

    expect(response.error.code).toBe(ErrorCodes.UNKNOWN);
    expect(response.error.message).toBe('Something went wrong');
  });

  it('should create error response from string', () => {
    const response = createErrorResponse('String error');

    expect(response.error.code).toBe(ErrorCodes.UNKNOWN);
    expect(response.error.message).toBe('String error');
  });
});

describe('RetryHandler', () => {
  it('should return result on success', async () => {
    const handler = new RetryHandler({ initialDelayMs: 1, maxDelayMs: 2 });
    const fn = vi.fn().mockResolvedValue('success');

    const result = await handler.execute(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable error', async () => {
    const handler = new RetryHandler({ maxRetries: 2, initialDelayMs: 1, maxDelayMs: 2 });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(
        new AppError({
          code: ErrorCodes.NEO4J_CONNECTION,
          message: 'Connection failed',
          retryable: true,
        })
      )
      .mockResolvedValue('success');

    const result = await handler.execute(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not retry non-retryable error', async () => {
    const handler = new RetryHandler({ maxRetries: 3, initialDelayMs: 1, maxDelayMs: 2 });
    const error = new ValidationError('Invalid input');
    const fn = vi.fn().mockRejectedValue(error);

    await expect(handler.execute(fn)).rejects.toThrow('Invalid input');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should throw after max retries', async () => {
    const handler = new RetryHandler({ maxRetries: 2, initialDelayMs: 1, maxDelayMs: 2 });
    const fn = vi.fn().mockRejectedValue(
      new AppError({
        code: ErrorCodes.NEO4J_CONNECTION,
        message: 'Connection failed',
        retryable: true,
      })
    );

    await expect(handler.execute(fn)).rejects.toThrow('Connection failed');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('should call onRetry callback', async () => {
    const onRetry = vi.fn();
    const handler = new RetryHandler({
      maxRetries: 2,
      initialDelayMs: 1,
      maxDelayMs: 2,
      onRetry,
    });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(
        new AppError({
          code: ErrorCodes.TIMEOUT,
          message: 'Timeout',
          retryable: true,
        })
      )
      .mockResolvedValue('success');

    await handler.execute(fn);

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(expect.any(AppError), 1);
  });

  it('should filter by retryableErrors', async () => {
    const handler = new RetryHandler({
      maxRetries: 2,
      initialDelayMs: 1,
      maxDelayMs: 2,
      retryableErrors: [ErrorCodes.NEO4J_CONNECTION],
    });

    const timeoutError = new AppError({
      code: ErrorCodes.TIMEOUT,
      message: 'Timeout',
      retryable: true,
    });
    const fn = vi.fn().mockRejectedValue(timeoutError);

    await expect(handler.execute(fn)).rejects.toThrow('Timeout');
    expect(fn).toHaveBeenCalledTimes(1); // Not retried because TIMEOUT not in list
  });
});

describe('withRetry', () => {
  it('should be a convenience wrapper', async () => {
    const fn = vi.fn().mockResolvedValue('result');

    const result = await withRetry(fn, { maxRetries: 1, initialDelayMs: 1 });

    expect(result).toBe('result');
  });
});

describe('Result', () => {
  describe('ok/err', () => {
    it('should create success result', () => {
      const result = Result.ok(42);
      expect(result.success).toBe(true);
      expect(Result.isOk(result)).toBe(true);
      if (result.success) {
        expect(result.value).toBe(42);
      }
    });

    it('should create error result', () => {
      const error = new AppError({
        code: ErrorCodes.VALIDATION,
        message: 'Error',
      });
      const result = Result.err(error);

      expect(result.success).toBe(false);
      expect(Result.isErr(result)).toBe(true);
      if (!result.success) {
        expect(result.error).toBe(error);
      }
    });
  });

  describe('map', () => {
    it('should map success value', () => {
      const result = Result.ok(5);
      const mapped = Result.map(result, (x) => x * 2);

      expect(Result.isOk(mapped)).toBe(true);
      if (mapped.success) {
        expect(mapped.value).toBe(10);
      }
    });

    it('should pass through error', () => {
      const error = new AppError({
        code: ErrorCodes.UNKNOWN,
        message: 'Error',
      });
      const result = Result.err(error);
      const mapped = Result.map(result, (x: number) => x * 2);

      expect(Result.isErr(mapped)).toBe(true);
    });
  });

  describe('flatMap', () => {
    it('should chain results', () => {
      const result = Result.ok(5);
      const chained = Result.flatMap(result, (x) =>
        x > 0 ? Result.ok(x * 2) : Result.err(new ValidationError('Must be positive'))
      );

      expect(Result.isOk(chained)).toBe(true);
      if (chained.success) {
        expect(chained.value).toBe(10);
      }
    });
  });

  describe('unwrap/unwrapOr', () => {
    it('should unwrap success value', () => {
      const result = Result.ok('value');
      expect(Result.unwrap(result)).toBe('value');
    });

    it('should throw on unwrap error', () => {
      const result = Result.err(new ValidationError('Error'));
      expect(() => Result.unwrap(result)).toThrow('Error');
    });

    it('should return default on error', () => {
      const result = Result.err(new ValidationError('Error'));
      expect(Result.unwrapOr(result, 'default')).toBe('default');
    });
  });
});

describe('tryCatch', () => {
  it('should return ok on success', async () => {
    const result = await tryCatch(async () => 'success');

    expect(Result.isOk(result)).toBe(true);
    if (result.success) {
      expect(result.value).toBe('success');
    }
  });

  it('should return err on failure', async () => {
    const result = await tryCatch(async () => {
      throw new Error('Failed');
    });

    expect(Result.isErr(result)).toBe(true);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(AppError);
      expect(result.error.message).toBe('Failed');
    }
  });

  it('should use custom error mapper', async () => {
    const result = await tryCatch(
      async () => {
        throw new Error('Original');
      },
      () =>
        new AppError({
          code: ErrorCodes.NEO4J_QUERY,
          message: 'Mapped error',
        })
    );

    if (!result.success) {
      expect(result.error.code).toBe(ErrorCodes.NEO4J_QUERY);
      expect(result.error.message).toBe('Mapped error');
    }
  });
});
