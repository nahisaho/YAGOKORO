/**
 * TrendForecaster - Advanced trend forecasting algorithms
 *
 * Implements multiple forecasting methods including:
 * - Simple Moving Average (SMA)
 * - Exponential Moving Average (EMA)
 * - Linear Regression
 * - Weighted Moving Average (WMA)
 *
 * REQ-004-05: Trend forecasting
 *
 * @packageDocumentation
 */

import type { TrendRepository, TrendDataPoint } from '@yagokoro/domain';
import type { TrendForecast, TimeRangeFilter } from '@yagokoro/domain';

// ============================================================================
// Types
// ============================================================================

/**
 * Available forecasting methods
 */
export type ForecastMethod = 'sma' | 'ema' | 'wma' | 'linear';

/**
 * Configuration for trend forecasting
 */
export interface TrendForecasterConfig {
  /**
   * Default forecasting method
   * @default 'ema'
   */
  defaultMethod?: ForecastMethod;

  /**
   * Window size for moving averages (days)
   * @default 30
   */
  windowSize?: number;

  /**
   * EMA smoothing factor (0-1, higher = more weight to recent)
   * @default 0.3
   */
  emaSmoothingFactor?: number;

  /**
   * Default forecast horizon (days)
   * @default 30
   */
  forecastHorizon?: number;

  /**
   * Confidence level for prediction intervals (0-1)
   * @default 0.95
   */
  confidenceLevel?: number;

  /**
   * Minimum data points required for forecasting
   * @default 7
   */
  minDataPoints?: number;
}

const DEFAULT_CONFIG: Required<TrendForecasterConfig> = {
  defaultMethod: 'ema',
  windowSize: 30,
  emaSmoothingFactor: 0.3,
  forecastHorizon: 30,
  confidenceLevel: 0.95,
  minDataPoints: 7,
};

/**
 * Forecast options
 */
export interface ForecastOptions {
  /** Forecasting method to use */
  method?: ForecastMethod;
  /** Horizon in days */
  horizon?: number;
  /** Historical window size for calculation */
  windowSize?: number;
}

/**
 * Detailed forecast result with additional metrics
 */
export interface DetailedForecastResult {
  /** Standard forecast result */
  forecast: TrendForecast;
  /** Method used for forecasting */
  method: ForecastMethod;
  /** Quality metrics */
  quality: {
    /** Mean Absolute Error on historical data */
    mae: number;
    /** Root Mean Square Error on historical data */
    rmse: number;
    /** Number of data points used */
    dataPointsUsed: number;
  };
  /** Trend analysis */
  trend: {
    /** Slope of the trend line */
    slope: number;
    /** Direction: 'up', 'down', or 'stable' */
    direction: 'up' | 'down' | 'stable';
    /** Estimated days until plateau (null if not applicable) */
    daysToPlateauEstimate: number | null;
  };
}

// ============================================================================
// TrendForecaster Implementation
// ============================================================================

/**
 * TrendForecaster provides advanced trend forecasting capabilities
 *
 * @example
 * ```typescript
 * const forecaster = new TrendForecaster(repository);
 *
 * // Simple forecast
 * const forecast = await forecaster.forecast('entity-1');
 *
 * // Detailed forecast with specific method
 * const detailed = await forecaster.forecastDetailed('entity-1', {
 *   method: 'ema',
 *   horizon: 60
 * });
 *
 * // Ensemble forecast using multiple methods
 * const ensemble = await forecaster.ensembleForecast('entity-1');
 * ```
 */
export class TrendForecaster {
  private readonly config: Required<TrendForecasterConfig>;

  constructor(
    private readonly repository: TrendRepository,
    config?: TrendForecasterConfig,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate a forecast for an entity
   */
  async forecast(entityId: string, options?: ForecastOptions): Promise<TrendForecast> {
    const result = await this.forecastDetailed(entityId, options);
    return result.forecast;
  }

  /**
   * Generate a detailed forecast with quality metrics
   */
  async forecastDetailed(
    entityId: string,
    options?: ForecastOptions,
  ): Promise<DetailedForecastResult> {
    const method = options?.method ?? this.config.defaultMethod;
    const horizon = options?.horizon ?? this.config.forecastHorizon;
    const windowSize = options?.windowSize ?? this.config.windowSize;

    // Get historical data
    const timeSeries = await this.getHistoricalData(entityId, windowSize * 2);

    if (timeSeries.length < this.config.minDataPoints) {
      return this.createEmptyForecast(entityId, method, horizon);
    }

    // Extract values
    const values = timeSeries.map((p) => p.citationCount);
    const dates = timeSeries.map((p) => p.date);

    // Generate predictions based on method
    const predictions = this.generatePredictions(values, dates, horizon, method, windowSize);

    // Calculate quality metrics (using holdout validation)
    const quality = this.calculateQualityMetrics(values, method, windowSize);

    // Analyze trend
    const trend = this.analyzeTrend(values);

    // Calculate confidence
    const confidence = this.calculateConfidence(quality, timeSeries.length);

    const now = new Date();
    const forecastEnd = new Date(now.getTime() + horizon * 24 * 60 * 60 * 1000);

    const forecast: TrendForecast = {
      entityId,
      entityName: entityId,
      forecastStart: now,
      forecastEnd,
      predictions,
      trendDirection: trend.direction,
      confidence,
      model: method === 'linear' ? 'linear' : 'arima', // Map to supported model type
    };

    return {
      forecast,
      method,
      quality,
      trend,
    };
  }

  /**
   * Generate ensemble forecast using multiple methods
   */
  async ensembleForecast(entityId: string, horizon?: number): Promise<TrendForecast> {
    const methods: ForecastMethod[] = ['sma', 'ema', 'wma', 'linear'];
    const forecastHorizon = horizon ?? this.config.forecastHorizon;

    const forecasts = await Promise.all(
      methods.map((method) =>
        this.forecastDetailed(entityId, { method, horizon: forecastHorizon }),
      ),
    );

    // Weight forecasts by their quality (inverse of RMSE)
    const weights = forecasts.map((f) => 1 / (f.quality.rmse + 0.01));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const normalizedWeights = weights.map((w) => w / totalWeight);

    // Combine predictions
    const combinedPredictions: TrendForecast['predictions'] = [];
    const firstForecast = forecasts[0]!.forecast;

    for (let i = 0; i < firstForecast.predictions.length; i++) {
      let weightedValue = 0;
      let weightedLower = 0;
      let weightedUpper = 0;

      for (let j = 0; j < forecasts.length; j++) {
        const pred = forecasts[j]!.forecast.predictions[i]!;
        const weight = normalizedWeights[j]!;
        weightedValue += pred.predictedCitations * weight;
        weightedLower += pred.confidenceInterval.lower * weight;
        weightedUpper += pred.confidenceInterval.upper * weight;
      }

      combinedPredictions.push({
        date: firstForecast.predictions[i]!.date,
        predictedCitations: Math.round(weightedValue),
        confidenceInterval: {
          lower: Math.round(weightedLower),
          upper: Math.round(weightedUpper),
        },
      });
    }

    // Average confidence
    const avgConfidence =
      forecasts.reduce((sum, f) => sum + f.forecast.confidence, 0) / forecasts.length;

    // Determine overall trend direction (majority vote)
    const directions = forecasts.map((f) => f.trend.direction);
    const upCount = directions.filter((d) => d === 'up').length;
    const downCount = directions.filter((d) => d === 'down').length;
    let trendDirection: TrendForecast['trendDirection'];
    if (upCount > downCount && upCount > 1) {
      trendDirection = 'up';
    } else if (downCount > upCount && downCount > 1) {
      trendDirection = 'down';
    } else {
      trendDirection = 'stable';
    }

    const now = new Date();
    const forecastEnd = new Date(now.getTime() + forecastHorizon * 24 * 60 * 60 * 1000);

    return {
      entityId,
      entityName: entityId,
      forecastStart: now,
      forecastEnd,
      predictions: combinedPredictions,
      trendDirection,
      confidence: avgConfidence,
      model: 'arima', // Ensemble approximates ARIMA behavior
    };
  }

  /**
   * Compare multiple entities' forecasts
   */
  async compareForecast(
    entityIds: string[],
    options?: ForecastOptions,
  ): Promise<Map<string, TrendForecast>> {
    const results = new Map<string, TrendForecast>();

    const forecasts = await Promise.all(
      entityIds.map(async (entityId) => ({
        entityId,
        forecast: await this.forecast(entityId, options),
      })),
    );

    for (const { entityId, forecast } of forecasts) {
      results.set(entityId, forecast);
    }

    return results;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private async getHistoricalData(entityId: string, days: number): Promise<TrendDataPoint[]> {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const timeRange: TimeRangeFilter = {
      from: startDate,
      to: now,
    };

    return this.repository.getTimeSeries(entityId, timeRange);
  }

  private generatePredictions(
    values: number[],
    dates: Date[],
    horizon: number,
    method: ForecastMethod,
    windowSize: number,
  ): TrendForecast['predictions'] {
    const lastDate = dates[dates.length - 1]!;
    const predictions: TrendForecast['predictions'] = [];

    // Calculate base prediction using the specified method
    const baseValue = this.calculateBaseValue(values, method, windowSize);
    const trend = this.calculateLinearTrend(values.slice(-Math.min(14, values.length)));
    const stdDev = this.calculateStdDev(values);

    for (let i = 1; i <= horizon; i++) {
      const date = new Date(lastDate.getTime() + i * 24 * 60 * 60 * 1000);

      // Apply method-specific projection
      let predicted: number;
      switch (method) {
        case 'linear':
          predicted = baseValue + trend * i;
          break;
        case 'ema':
          predicted = baseValue + trend * i * 0.8; // EMA is more conservative
          break;
        case 'wma':
          predicted = baseValue + trend * i * 0.9;
          break;
        default:
          predicted = baseValue + trend * i * 0.5; // SMA is most conservative
      }

      // Ensure non-negative
      predicted = Math.max(0, predicted);

      // Calculate confidence interval (widens with horizon)
      const uncertainty = stdDev * Math.sqrt(i / 7) * 1.96;

      predictions.push({
        date,
        predictedCitations: Math.round(predicted),
        confidenceInterval: {
          lower: Math.round(Math.max(0, predicted - uncertainty)),
          upper: Math.round(predicted + uncertainty),
        },
      });
    }

    return predictions;
  }

  private calculateBaseValue(
    values: number[],
    method: ForecastMethod,
    windowSize: number,
  ): number {
    const window = values.slice(-Math.min(windowSize, values.length));

    switch (method) {
      case 'sma':
        return this.simpleMovingAverage(window);
      case 'ema':
        return this.exponentialMovingAverage(window, this.config.emaSmoothingFactor);
      case 'wma':
        return this.weightedMovingAverage(window);
      case 'linear':
        return this.linearProjection(window);
      default:
        return this.simpleMovingAverage(window);
    }
  }

  private simpleMovingAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private exponentialMovingAverage(values: number[], alpha: number): number {
    if (values.length === 0) return 0;
    let ema = values[0]!;
    for (let i = 1; i < values.length; i++) {
      ema = alpha * values[i]! + (1 - alpha) * ema;
    }
    return ema;
  }

  private weightedMovingAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const n = values.length;
    let weightedSum = 0;
    let weightSum = 0;
    for (let i = 0; i < n; i++) {
      const weight = i + 1; // More recent values get higher weight
      weightedSum += values[i]! * weight;
      weightSum += weight;
    }
    return weightedSum / weightSum;
  }

  private linearProjection(values: number[]): number {
    if (values.length === 0) return 0;
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = this.simpleMovingAverage(values);

    let slope = 0;
    let denom = 0;
    for (let i = 0; i < n; i++) {
      slope += (i - xMean) * (values[i]! - yMean);
      denom += (i - xMean) ** 2;
    }
    slope = denom === 0 ? 0 : slope / denom;

    // Project to current point
    return yMean + slope * (n - 1 - xMean);
  }

  private calculateLinearTrend(values: number[]): number {
    if (values.length < 2) return 0;
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = this.simpleMovingAverage(values);

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i]! - yMean);
      denominator += (i - xMean) ** 2;
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = this.simpleMovingAverage(values);
    const squaredDiffs = values.map((v) => (v - mean) ** 2);
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  }

  private calculateQualityMetrics(
    values: number[],
    method: ForecastMethod,
    windowSize: number,
  ): DetailedForecastResult['quality'] {
    if (values.length < windowSize + 5) {
      return { mae: 0, rmse: 0, dataPointsUsed: values.length };
    }

    // Use last 5 points as holdout for validation
    const trainData = values.slice(0, -5);
    const testData = values.slice(-5);

    // Make predictions for holdout period
    const predictions: number[] = [];
    for (let i = 0; i < testData.length; i++) {
      const window = [...trainData, ...testData.slice(0, i)];
      const pred = this.calculateBaseValue(window, method, windowSize);
      predictions.push(pred);
    }

    // Calculate MAE and RMSE
    let sumAE = 0;
    let sumSE = 0;
    for (let i = 0; i < testData.length; i++) {
      const error = Math.abs(testData[i]! - predictions[i]!);
      sumAE += error;
      sumSE += error ** 2;
    }

    return {
      mae: sumAE / testData.length,
      rmse: Math.sqrt(sumSE / testData.length),
      dataPointsUsed: values.length,
    };
  }

  private analyzeTrend(values: number[]): DetailedForecastResult['trend'] {
    const slope = this.calculateLinearTrend(values.slice(-Math.min(14, values.length)));

    let direction: 'up' | 'down' | 'stable';
    if (slope > 0.5) {
      direction = 'up';
    } else if (slope < -0.5) {
      direction = 'down';
    } else {
      direction = 'stable';
    }

    // Estimate days to plateau (simplified)
    let daysToPlateauEstimate: number | null = null;
    if (direction === 'up' && slope > 0) {
      // Assume plateau when growth rate approaches zero
      // This is a very rough estimate
      const currentValue = values[values.length - 1] ?? 0;
      if (currentValue > 0) {
        daysToPlateauEstimate = Math.round(currentValue / (slope * 10));
      }
    }

    return { slope, direction, daysToPlateauEstimate };
  }

  private calculateConfidence(
    quality: DetailedForecastResult['quality'],
    dataPoints: number,
  ): number {
    // Base confidence on data availability and prediction quality
    const dataScore = Math.min(1, dataPoints / (this.config.minDataPoints * 3));
    const qualityScore = 1 / (1 + quality.rmse / 100);
    return Math.min(1, Math.max(0.1, (dataScore + qualityScore) / 2));
  }

  private createEmptyForecast(
    entityId: string,
    method: ForecastMethod,
    horizon: number,
  ): DetailedForecastResult {
    const now = new Date();
    const forecastEnd = new Date(now.getTime() + horizon * 24 * 60 * 60 * 1000);

    return {
      forecast: {
        entityId,
        entityName: entityId,
        forecastStart: now,
        forecastEnd,
        predictions: [],
        trendDirection: 'stable',
        confidence: 0,
        model: 'linear',
      },
      method,
      quality: { mae: 0, rmse: 0, dataPointsUsed: 0 },
      trend: { slope: 0, direction: 'stable', daysToPlateauEstimate: null },
    };
  }
}
