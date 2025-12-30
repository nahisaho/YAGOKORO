/**
 * Simple logger utility for graphrag module
 */

export const logger = {
  info: (message: string): void => {
    console.log('[INFO]', message);
  },

  success: (message: string): void => {
    console.log('[SUCCESS]', message);
  },

  warn: (message: string): void => {
    console.log('[WARN]', message);
  },

  error: (message: string, error?: unknown): void => {
    console.error('[ERROR]', message, error ?? '');
  },

  debug: (message: string): void => {
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      console.log('[DEBUG]', message);
    }
  },
};
