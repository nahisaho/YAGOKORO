/**
 * Tests for ingest CLI command
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createIngestCommand, type IngestService } from '../src/commands/ingest.js';

describe('createIngestCommand', () => {
  let mockService: IngestService;

  beforeEach(() => {
    mockService = {
      processArxivPaper: vi.fn(),
      processArxivPapers: vi.fn(),
      processLocalPdf: vi.fn(),
      searchArxiv: vi.fn(),
    };
  });

  describe('command structure', () => {
    it('should create ingest command', () => {
      const cmd = createIngestCommand(mockService);
      expect(cmd.name()).toBe('ingest');
    });

    it('should have arxiv subcommand', () => {
      const cmd = createIngestCommand(mockService);
      const subcommands = cmd.commands.map((c) => c.name());
      expect(subcommands).toContain('arxiv');
    });

    it('should have arxiv-batch subcommand', () => {
      const cmd = createIngestCommand(mockService);
      const subcommands = cmd.commands.map((c) => c.name());
      expect(subcommands).toContain('arxiv-batch');
    });

    it('should have pdf subcommand', () => {
      const cmd = createIngestCommand(mockService);
      const subcommands = cmd.commands.map((c) => c.name());
      expect(subcommands).toContain('pdf');
    });

    it('should have search subcommand', () => {
      const cmd = createIngestCommand(mockService);
      const subcommands = cmd.commands.map((c) => c.name());
      expect(subcommands).toContain('search');
    });
  });

  describe('arxiv subcommand', () => {
    it('should accept arxiv ID argument', () => {
      const cmd = createIngestCommand(mockService);
      const arxivCmd = cmd.commands.find((c) => c.name() === 'arxiv');
      expect(arxivCmd).toBeDefined();
    });

    it('should have verbose option', () => {
      const cmd = createIngestCommand(mockService);
      const arxivCmd = cmd.commands.find((c) => c.name() === 'arxiv');
      const options = arxivCmd?.options.map((o) => o.long);
      expect(options).toContain('--verbose');
    });
  });

  describe('arxiv-batch subcommand', () => {
    it('should have continue-on-error option', () => {
      const cmd = createIngestCommand(mockService);
      const batchCmd = cmd.commands.find((c) => c.name() === 'arxiv-batch');
      const options = batchCmd?.options.map((o) => o.long);
      expect(options).toContain('--continue-on-error');
    });

    it('should have delay option', () => {
      const cmd = createIngestCommand(mockService);
      const batchCmd = cmd.commands.find((c) => c.name() === 'arxiv-batch');
      const options = batchCmd?.options.map((o) => o.long);
      expect(options).toContain('--delay');
    });
  });

  describe('pdf subcommand', () => {
    it('should have title option', () => {
      const cmd = createIngestCommand(mockService);
      const pdfCmd = cmd.commands.find((c) => c.name() === 'pdf');
      const options = pdfCmd?.options.map((o) => o.long);
      expect(options).toContain('--title');
    });

    it('should have authors option', () => {
      const cmd = createIngestCommand(mockService);
      const pdfCmd = cmd.commands.find((c) => c.name() === 'pdf');
      const options = pdfCmd?.options.map((o) => o.long);
      expect(options).toContain('--authors');
    });

    it('should have source option', () => {
      const cmd = createIngestCommand(mockService);
      const pdfCmd = cmd.commands.find((c) => c.name() === 'pdf');
      const options = pdfCmd?.options.map((o) => o.long);
      expect(options).toContain('--source');
    });
  });

  describe('search subcommand', () => {
    it('should have max-results option', () => {
      const cmd = createIngestCommand(mockService);
      const searchCmd = cmd.commands.find((c) => c.name() === 'search');
      const options = searchCmd?.options.map((o) => o.long);
      expect(options).toContain('--max-results');
    });

    it('should have category option', () => {
      const cmd = createIngestCommand(mockService);
      const searchCmd = cmd.commands.find((c) => c.name() === 'search');
      const options = searchCmd?.options.map((o) => o.long);
      expect(options).toContain('--category');
    });

    it('should have sort option', () => {
      const cmd = createIngestCommand(mockService);
      const searchCmd = cmd.commands.find((c) => c.name() === 'search');
      const options = searchCmd?.options.map((o) => o.long);
      expect(options).toContain('--sort');
    });
  });
});
