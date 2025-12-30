import chalk from 'chalk';
import ora, { type Ora } from 'ora';

/**
 * Logger utility for CLI output
 */
export const logger = {
  info: (message: string): void => {
    console.log(chalk.blue('ℹ'), message);
  },

  success: (message: string): void => {
    console.log(chalk.green('✓'), message);
  },

  warning: (message: string): void => {
    console.log(chalk.yellow('⚠'), message);
  },

  error: (message: string): void => {
    console.error(chalk.red('✗'), message);
  },

  debug: (message: string): void => {
    if (process.env.DEBUG) {
      console.log(chalk.gray('🔍'), message);
    }
  },
};

/**
 * Create a spinner for long-running operations
 */
export function createSpinner(text: string): Ora {
  return ora({
    text,
    color: 'cyan',
  });
}

/**
 * Format a table for CLI output
 */
export function formatTable(
  headers: string[],
  rows: string[][],
  options?: { maxWidth?: number }
): string {
  const maxWidth = options?.maxWidth ?? 80;

  // Calculate column widths
  const columnWidths = headers.map((header, i) => {
    const maxRowWidth = Math.max(...rows.map((row) => (row[i] ?? '').length));
    return Math.max(header.length, maxRowWidth);
  });

  // Adjust for max width
  const totalWidth = columnWidths.reduce((a, b) => a + b, 0) + (headers.length - 1) * 3;
  if (totalWidth > maxWidth) {
    const scale = maxWidth / totalWidth;
    columnWidths.forEach((_, i) => {
      columnWidths[i] = Math.floor(columnWidths[i]! * scale);
    });
  }

  // Format header
  const headerLine = headers
    .map((h, i) => h.padEnd(columnWidths[i]!))
    .join(' │ ');
  const separator = columnWidths.map((w) => '─'.repeat(w)).join('─┼─');

  // Format rows
  const formattedRows = rows.map((row) =>
    row.map((cell, i) => cell.slice(0, columnWidths[i]).padEnd(columnWidths[i]!)).join(' │ ')
  );

  return [chalk.bold(headerLine), separator, ...formattedRows].join('\n');
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let value = bytes;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Format duration to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Prompt for confirmation (for use with interactive CLI)
 */
export async function confirm(message: string): Promise<boolean> {
  // In non-interactive mode, default to false
  if (!process.stdin.isTTY) {
    return false;
  }

  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`${message} (y/n): `, (answer: string) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Parse JSON file safely
 */
export async function parseJsonFile<T>(path: string): Promise<T> {
  const fs = await import('fs/promises');
  const content = await fs.readFile(path, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Write JSON to file
 */
export async function writeJsonFile(path: string, data: unknown): Promise<void> {
  const fs = await import('fs/promises');
  await fs.writeFile(path, JSON.stringify(data, null, 2));
}

/**
 * Format output message with icon or JSON format
 */
export function formatOutput(message: string | unknown, format?: 'json' | 'text'): string {
  if (format === 'json') {
    return JSON.stringify(message, null, 2);
  }
  return `${chalk.cyan('>')} ${typeof message === 'string' ? message : JSON.stringify(message)}`;
}

/**
 * Format error message with icon
 */
export function formatError(message: string): string {
  return `${chalk.red('✗')} ${message}`;
}

/**
 * Format success message with icon
 */
export function formatSuccess(message: string): string {
  return `${chalk.green('✓')} ${message}`;
}
