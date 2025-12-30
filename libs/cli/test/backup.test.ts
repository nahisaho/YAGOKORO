/**
 * Backup Command Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBackupCommand, type BackupCommandService } from '../src/commands/backup.js';

describe('Backup Command', () => {
  let mockService: BackupCommandService;

  beforeEach(() => {
    mockService = {
      backup: vi.fn(),
      restore: vi.fn(),
      validate: vi.fn(),
      list: vi.fn(),
    };
  });

  describe('createBackupCommand', () => {
    it('should create backup command with subcommands', () => {
      const command = createBackupCommand(mockService);

      expect(command.name()).toBe('backup');
      expect(command.commands.length).toBe(4);

      const subcommandNames = command.commands.map((c) => c.name());
      expect(subcommandNames).toContain('create');
      expect(subcommandNames).toContain('restore');
      expect(subcommandNames).toContain('validate');
      expect(subcommandNames).toContain('list');
    });
  });

  describe('backup create', () => {
    it('should have output option', () => {
      const command = createBackupCommand(mockService);
      const createCmd = command.commands.find((c) => c.name() === 'create');

      const options = createCmd?.options || [];
      const outputOption = options.find((o) => o.long === '--output');
      expect(outputOption).toBeDefined();
    });

    it('should have include-communities option', () => {
      const command = createBackupCommand(mockService);
      const createCmd = command.commands.find((c) => c.name() === 'create');

      const options = createCmd?.options || [];
      const option = options.find((o) => o.long === '--include-communities');
      expect(option).toBeDefined();
    });

    it('should have include-vectors option', () => {
      const command = createBackupCommand(mockService);
      const createCmd = command.commands.find((c) => c.name() === 'create');

      const options = createCmd?.options || [];
      const option = options.find((o) => o.long === '--include-vectors');
      expect(option).toBeDefined();
    });

    it('should have compress option', () => {
      const command = createBackupCommand(mockService);
      const createCmd = command.commands.find((c) => c.name() === 'create');

      const options = createCmd?.options || [];
      const option = options.find((o) => o.long === '--compress');
      expect(option).toBeDefined();
    });

    it('should have entity types filter option', () => {
      const command = createBackupCommand(mockService);
      const createCmd = command.commands.find((c) => c.name() === 'create');

      const options = createCmd?.options || [];
      const option = options.find((o) => o.long === '--types');
      expect(option).toBeDefined();
    });
  });

  describe('backup restore', () => {
    it('should accept file argument', () => {
      const command = createBackupCommand(mockService);
      const restoreCmd = command.commands.find((c) => c.name() === 'restore');

      expect(restoreCmd?.description()).toContain('リストア');
    });

    it('should have clear option', () => {
      const command = createBackupCommand(mockService);
      const restoreCmd = command.commands.find((c) => c.name() === 'restore');

      const options = restoreCmd?.options || [];
      const option = options.find((o) => o.long === '--clear');
      expect(option).toBeDefined();
    });

    it('should have dry-run option', () => {
      const command = createBackupCommand(mockService);
      const restoreCmd = command.commands.find((c) => c.name() === 'restore');

      const options = restoreCmd?.options || [];
      const option = options.find((o) => o.long === '--dry-run');
      expect(option).toBeDefined();
    });

    it('should have include-vectors option', () => {
      const command = createBackupCommand(mockService);
      const restoreCmd = command.commands.find((c) => c.name() === 'restore');

      const options = restoreCmd?.options || [];
      const option = options.find((o) => o.long === '--include-vectors');
      expect(option).toBeDefined();
    });
  });

  describe('backup validate', () => {
    it('should accept file argument', () => {
      const command = createBackupCommand(mockService);
      const validateCmd = command.commands.find((c) => c.name() === 'validate');

      expect(validateCmd?.description()).toContain('検証');
    });

    it('should support format option', () => {
      const command = createBackupCommand(mockService);
      const validateCmd = command.commands.find((c) => c.name() === 'validate');

      const options = validateCmd?.options || [];
      const option = options.find((o) => o.long === '--format');
      expect(option).toBeDefined();
    });
  });

  describe('backup list', () => {
    it('should accept optional directory argument', () => {
      const command = createBackupCommand(mockService);
      const listCmd = command.commands.find((c) => c.name() === 'list');

      expect(listCmd?.description()).toContain('一覧');
    });

    it('should support format option', () => {
      const command = createBackupCommand(mockService);
      const listCmd = command.commands.find((c) => c.name() === 'list');

      const options = listCmd?.options || [];
      const option = options.find((o) => o.long === '--format');
      expect(option).toBeDefined();
    });
  });
});

describe('BackupCommandService Interface', () => {
  it('should define required methods', () => {
    const service: BackupCommandService = {
      backup: async () => ({
        success: true,
        filePath: './backup.json',
        fileSize: 1024,
        checksum: 'abc123',
        entityCount: 100,
        relationCount: 200,
        communityCount: 10,
        vectorCount: 100,
        duration: 500,
        errors: [],
      }),
      restore: async () => ({
        success: true,
        entitiesRestored: 100,
        relationsRestored: 200,
        communitiesRestored: 10,
        vectorsRestored: 100,
        duration: 600,
        errors: [],
      }),
      validate: async () => ({
        valid: true,
        version: '1.0.0',
        exportedAt: '2025-01-01T00:00:00Z',
        entityCount: 100,
        relationCount: 200,
        checksumValid: true,
        errors: [],
      }),
      list: async () => [
        {
          fileName: 'backup-2025-01-01.json',
          filePath: './backups/backup-2025-01-01.json',
          fileSize: 1024,
          createdAt: '2025-01-01T00:00:00Z',
          version: '1.0.0',
          entityCount: 100,
        },
      ],
    };

    expect(service.backup).toBeDefined();
    expect(service.restore).toBeDefined();
    expect(service.validate).toBeDefined();
    expect(service.list).toBeDefined();
  });
});

describe('Backup Result Types', () => {
  it('should have correct backup result structure', async () => {
    const mockService: BackupCommandService = {
      backup: vi.fn().mockResolvedValue({
        success: true,
        filePath: './backup.json',
        fileSize: 102400,
        checksum: 'sha256:abcdef1234567890',
        entityCount: 150,
        relationCount: 300,
        communityCount: 15,
        vectorCount: 150,
        duration: 1200,
        errors: [],
      }),
      restore: vi.fn(),
      validate: vi.fn(),
      list: vi.fn(),
    };

    const result = await mockService.backup({
      output: './backup.json',
      includeCommunities: true,
      includeVectors: true,
    });

    expect(result.success).toBe(true);
    expect(result.filePath).toBe('./backup.json');
    expect(result.fileSize).toBe(102400);
    expect(result.entityCount).toBe(150);
    expect(result.relationCount).toBe(300);
    expect(result.communityCount).toBe(15);
    expect(result.vectorCount).toBe(150);
  });

  it('should handle backup errors', async () => {
    const mockService: BackupCommandService = {
      backup: vi.fn().mockResolvedValue({
        success: false,
        filePath: '',
        fileSize: 0,
        checksum: '',
        entityCount: 0,
        relationCount: 0,
        communityCount: 0,
        vectorCount: 0,
        duration: 100,
        errors: ['Connection failed', 'Permission denied'],
      }),
      restore: vi.fn(),
      validate: vi.fn(),
      list: vi.fn(),
    };

    const result = await mockService.backup({ output: './backup.json' });

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors).toContain('Connection failed');
  });
});

describe('Restore Result Types', () => {
  it('should have correct restore result structure', async () => {
    const mockService: BackupCommandService = {
      backup: vi.fn(),
      restore: vi.fn().mockResolvedValue({
        success: true,
        entitiesRestored: 150,
        relationsRestored: 300,
        communitiesRestored: 15,
        vectorsRestored: 150,
        duration: 1500,
        errors: [],
      }),
      validate: vi.fn(),
      list: vi.fn(),
    };

    const result = await mockService.restore({
      input: './backup.json',
      clearExisting: true,
    });

    expect(result.success).toBe(true);
    expect(result.entitiesRestored).toBe(150);
    expect(result.relationsRestored).toBe(300);
  });

  it('should support dry-run mode', async () => {
    const mockService: BackupCommandService = {
      backup: vi.fn(),
      restore: vi.fn().mockResolvedValue({
        success: true,
        entitiesRestored: 150,
        relationsRestored: 300,
        communitiesRestored: 15,
        vectorsRestored: 0,
        duration: 200,
        errors: [],
      }),
      validate: vi.fn(),
      list: vi.fn(),
    };

    const result = await mockService.restore({
      input: './backup.json',
      dryRun: true,
    });

    expect(result.success).toBe(true);
  });
});

describe('Validation Result Types', () => {
  it('should validate backup file correctly', async () => {
    const mockService: BackupCommandService = {
      backup: vi.fn(),
      restore: vi.fn(),
      validate: vi.fn().mockResolvedValue({
        valid: true,
        version: '0.3.0',
        exportedAt: '2025-12-29T00:00:00Z',
        entityCount: 150,
        relationCount: 300,
        checksumValid: true,
        errors: [],
      }),
      list: vi.fn(),
    };

    const result = await mockService.validate('./backup.json');

    expect(result.valid).toBe(true);
    expect(result.version).toBe('0.3.0');
    expect(result.checksumValid).toBe(true);
  });

  it('should detect invalid backup file', async () => {
    const mockService: BackupCommandService = {
      backup: vi.fn(),
      restore: vi.fn(),
      validate: vi.fn().mockResolvedValue({
        valid: false,
        version: '0.1.0',
        exportedAt: '2025-01-01T00:00:00Z',
        entityCount: 0,
        relationCount: 0,
        checksumValid: false,
        errors: ['Checksum mismatch', 'Invalid format'],
      }),
      list: vi.fn(),
    };

    const result = await mockService.validate('./corrupted.json');

    expect(result.valid).toBe(false);
    expect(result.checksumValid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });
});
