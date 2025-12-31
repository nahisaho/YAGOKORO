import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TranslationService } from '../src/services/TranslationService.js';
import { TranslationCache, MemoryCacheStorage } from '../src/cache/TranslationCache.js';

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TranslationService', () => {
  let service: TranslationService;
  let cache: TranslationCache;

  beforeEach(() => {
    vi.clearAllMocks();
    cache = new TranslationCache(new MemoryCacheStorage());
    service = new TranslationService({
      deeplApiKey: 'test-deepl-key',
      googleApiKey: 'test-google-key',
      cache,
      timeout: 2000,
      maxRetries: 3,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with both providers', () => {
      const providers = service.getAvailableProviders();
      expect(providers).toContain('deepl');
      expect(providers).toContain('google');
    });

    it('should initialize with only DeepL', () => {
      const deeplOnly = new TranslationService({
        deeplApiKey: 'test-key',
      });
      const providers = deeplOnly.getAvailableProviders();
      expect(providers).toContain('deepl');
      expect(providers).not.toContain('google');
    });

    it('should initialize with only Google', () => {
      const googleOnly = new TranslationService({
        googleApiKey: 'test-key',
      });
      const providers = googleOnly.getAvailableProviders();
      expect(providers).toContain('google');
      expect(providers).not.toContain('deepl');
    });

    it('should warn when no API keys provided', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      new TranslationService({});
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No translation API keys'));
    });
  });

  describe('isAvailable', () => {
    it('should return true when at least one provider is available', () => {
      expect(service.isAvailable()).toBe(true);
    });

    it('should return false when no providers available', () => {
      const noProviders = new TranslationService({});
      expect(noProviders.isAvailable()).toBe(false);
    });
  });

  describe('translate with DeepL (REQ-008-03)', () => {
    it('should translate text successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          translations: [{ text: 'Hello World' }],
        }),
      });

      const result = await service.translate('你好世界', {
        sourceLanguage: 'zh',
        targetLanguage: 'en',
      });

      expect(result.original).toBe('你好世界');
      expect(result.translated).toBe('Hello World');
      expect(result.sourceLanguage).toBe('zh');
      expect(result.targetLanguage).toBe('en');
      expect(result.provider).toBe('deepl');
      expect(result.cached).toBe(false);
    });

    it('should use cache on repeated requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          translations: [{ text: 'Hello World' }],
        }),
      });

      // First call - API
      const result1 = await service.translate('你好世界', {
        sourceLanguage: 'zh',
        targetLanguage: 'en',
      });
      expect(result1.cached).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call - cache
      const result2 = await service.translate('你好世界', {
        sourceLanguage: 'zh',
        targetLanguage: 'en',
      });
      expect(result2.cached).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional API call
    });
  });

  describe('fallback to Google (REQ-008-08)', () => {
    it('should fallback to Google when DeepL fails', async () => {
      // DeepL fails
      mockFetch
        .mockRejectedValueOnce(new Error('DeepL API error'))
        .mockRejectedValueOnce(new Error('DeepL API error'))
        .mockRejectedValueOnce(new Error('DeepL API error'))
        // Google succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              translations: [{ translatedText: 'Hello World (Google)' }],
            },
          }),
        });

      const result = await service.translate('你好世界', {
        sourceLanguage: 'zh',
        targetLanguage: 'en',
      });

      expect(result.translated).toBe('Hello World (Google)');
      expect(result.provider).toBe('google');
    });

    it('should throw when both providers fail', async () => {
      // All API calls fail
      mockFetch.mockRejectedValue(new Error('API error'));

      await expect(
        service.translate('你好世界', {
          sourceLanguage: 'zh',
          targetLanguage: 'en',
        })
      ).rejects.toThrow();
    });
  });

  describe('timeout (REQ-008-10)', () => {
    it('should timeout after specified time', async () => {
      // Simulate a slow response
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 5000);
          })
      );

      // Should timeout and fallback or fail
      const timeoutService = new TranslationService({
        deeplApiKey: 'test-key',
        timeout: 100, // Very short timeout for testing
      });

      await expect(
        timeoutService.translate('test', {
          sourceLanguage: 'zh',
          targetLanguage: 'en',
        })
      ).rejects.toThrow();
    });
  });

  describe('translateBatch', () => {
    it('should translate multiple texts', async () => {
      // DeepL batch API returns all translations in one response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          translations: [
            { text: 'Good morning' },
            { text: 'Good evening' },
          ],
        }),
      });

      const results = await service.translateBatch(['早上好', '晚上好'], {
        sourceLanguage: 'zh',
        targetLanguage: 'en',
      });

      expect(results).toHaveLength(2);
      expect(results[0]?.translated).toBe('Good morning');
      expect(results[1]?.translated).toBe('Good evening');
    });

    it('should return empty array for empty input', async () => {
      const results = await service.translateBatch([], {
        sourceLanguage: 'zh',
        targetLanguage: 'en',
      });
      expect(results).toHaveLength(0);
    });

    it('should handle partial failures gracefully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            translations: [{ text: 'Success' }],
          }),
        })
        .mockRejectedValue(new Error('API error'));

      // Should not throw, returns partial results
      const results = await service.translateBatch(['成功', '失敗'], {
        sourceLanguage: 'zh',
        targetLanguage: 'en',
      });

      // At least one should succeed
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('language mapping', () => {
    it('should map Chinese to correct DeepL code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          translations: [{ text: 'translated' }],
        }),
      });

      await service.translate('测试', {
        sourceLanguage: 'zh',
        targetLanguage: 'en',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('ZH'),
        })
      );
    });

    it('should map Japanese to correct DeepL code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          translations: [{ text: 'translated' }],
        }),
      });

      await service.translate('テスト', {
        sourceLanguage: 'ja',
        targetLanguage: 'en',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('JA'),
        })
      );
    });

    it('should map Korean to correct DeepL code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          translations: [{ text: 'translated' }],
        }),
      });

      await service.translate('테스트', {
        sourceLanguage: 'ko',
        targetLanguage: 'en',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('KO'),
        })
      );
    });
  });
});

describe('TranslationCache', () => {
  let cache: TranslationCache;
  let storage: MemoryCacheStorage;

  beforeEach(() => {
    storage = new MemoryCacheStorage();
    cache = new TranslationCache(storage);
  });

  describe('MemoryCacheStorage', () => {
    it('should store and retrieve entries via cache', async () => {
      // Use cache's set and get methods
      const result = {
        original: 'original',
        translated: 'translated',
        sourceLanguage: 'zh' as const,
        targetLanguage: 'en' as const,
        provider: 'deepl' as const,
        cached: false,
        timestamp: new Date(),
      };

      await cache.set(result);
      const retrieved = await cache.get('original', 'zh', 'en');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.original).toBe('original');
      expect(retrieved?.translated).toBe('translated');
    });

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('non-existent', 'zh', 'en');
      expect(result).toBeNull();
    });

    it('should delete entries', async () => {
      const result = {
        original: 'test',
        translated: 'test-translated',
        sourceLanguage: 'en' as const,
        targetLanguage: 'zh' as const,
        provider: 'deepl' as const,
        cached: false,
        timestamp: new Date(),
      };

      await cache.set(result);
      await cache.delete('test', 'en', 'zh');
      const retrieved = await cache.get('test', 'en', 'zh');
      expect(retrieved).toBeNull();
    });

    it('should clear all entries', async () => {
      const result1 = {
        original: 'test1',
        translated: 'test1-translated',
        sourceLanguage: 'en' as const,
        targetLanguage: 'zh' as const,
        provider: 'deepl' as const,
        cached: false,
        timestamp: new Date(),
      };

      const result2 = {
        original: 'test2',
        translated: 'test2-translated',
        sourceLanguage: 'en' as const,
        targetLanguage: 'zh' as const,
        provider: 'deepl' as const,
        cached: false,
        timestamp: new Date(),
      };

      await cache.set(result1);
      await cache.set(result2);

      await cache.clear();

      expect(await cache.get('test1', 'en', 'zh')).toBeNull();
      expect(await cache.get('test2', 'en', 'zh')).toBeNull();
    });

    it('should track cache stats', async () => {
      await cache.get('miss1', 'zh', 'en'); // miss
      const result = {
        original: 'hit-text',
        translated: 'hit-translated',
        sourceLanguage: 'en' as const,
        targetLanguage: 'zh' as const,
        provider: 'deepl' as const,
        cached: false,
        timestamp: new Date(),
      };
      await cache.set(result);
      await cache.get('hit-text', 'en', 'zh'); // hit
      await cache.get('miss2', 'zh', 'en'); // miss

      const stats = await cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(2);
    });
  });
});
