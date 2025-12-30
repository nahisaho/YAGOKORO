/**
 * @fileoverview Stage Transition Alert Service
 * TASK-V2-027: Detects and generates alerts for lifecycle phase transitions
 */

import { v4 as uuidv4 } from 'uuid';
import type { LifecyclePhase, PhaseDetectionResult, MaturityScore, TrendDirection } from '../types.js';
import { PHASE_METADATA } from '../types.js';
import type {
  Alert,
  PhaseTransitionAlert,
  MaturityChangeAlert,
  TrendShiftAlert,
  EmergingTechnologyAlert,
  DecliningTechnologyAlert,
  AnomalyAlert,
  AlertConfig,
  AlertSeverity,
} from './types.js';
import { DEFAULT_ALERT_CONFIG } from './types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Technology state for tracking changes
 */
export interface TechnologyState {
  technologyId: string;
  technologyName: string;
  phase: LifecyclePhase;
  maturityScore: MaturityScore;
  trend: TrendDirection;
  lastUpdated: Date;
}

/**
 * Alert store interface
 */
export interface AlertStore {
  /** Save alert */
  save(alert: Alert): Promise<void>;
  /** Get alerts by technology ID */
  getByTechnology(technologyId: string): Promise<Alert[]>;
  /** Get unacknowledged alerts */
  getUnacknowledged(): Promise<Alert[]>;
  /** Acknowledge alert */
  acknowledge(alertId: string): Promise<void>;
  /** Get alerts by date range */
  getByDateRange(start: Date, end: Date): Promise<Alert[]>;
}

/**
 * In-memory alert store
 */
export class InMemoryAlertStore implements AlertStore {
  private alerts: Map<string, Alert> = new Map();

  async save(alert: Alert): Promise<void> {
    this.alerts.set(alert.id, alert);
  }

  async getByTechnology(technologyId: string): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(
      (a) => a.technologyId === technologyId
    );
  }

  async getUnacknowledged(): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter((a) => !a.acknowledged);
  }

  async acknowledge(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date();
    }
  }

  async getByDateRange(start: Date, end: Date): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(
      (a) => a.createdAt >= start && a.createdAt <= end
    );
  }

  /** Get all alerts (for testing) */
  getAll(): Alert[] {
    return Array.from(this.alerts.values());
  }

  /** Clear all alerts (for testing) */
  clear(): void {
    this.alerts.clear();
  }
}

// =============================================================================
// Alert Generator
// =============================================================================

/**
 * Alert generator service
 */
export class AlertGenerator {
  private config: AlertConfig;
  private store: AlertStore;
  private previousStates: Map<string, TechnologyState> = new Map();

  constructor(store: AlertStore, config: Partial<AlertConfig> = {}) {
    this.store = store;
    this.config = { ...DEFAULT_ALERT_CONFIG, ...config };
  }

  /**
   * Check for alerts based on state change
   */
  async checkAndGenerateAlerts(
    currentState: TechnologyState,
    currentPhaseResult?: PhaseDetectionResult
  ): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const previousState = this.previousStates.get(currentState.technologyId);

    if (previousState) {
      // Check phase transition
      if (this.config.phaseTransition && previousState.phase !== currentState.phase) {
        const alert = this.createPhaseTransitionAlert(
          previousState,
          currentState,
          currentPhaseResult
        );
        alerts.push(alert);
        await this.store.save(alert);
      }

      // Check maturity change
      if (this.config.maturityChange) {
        const maturityChange = this.calculateMaturityChange(
          previousState.maturityScore,
          currentState.maturityScore
        );
        if (Math.abs(maturityChange.percentage) >= this.config.maturityChangeThreshold) {
          const alert = this.createMaturityChangeAlert(
            currentState,
            previousState.maturityScore,
            currentState.maturityScore
          );
          alerts.push(alert);
          await this.store.save(alert);
        }
      }

      // Check trend shift
      if (this.config.trendShift && previousState.trend !== currentState.trend) {
        const alert = this.createTrendShiftAlert(
          currentState,
          previousState.trend,
          currentState.trend
        );
        alerts.push(alert);
        await this.store.save(alert);
      }
    }

    // Update stored state
    this.previousStates.set(currentState.technologyId, { ...currentState });

    return alerts;
  }

  /**
   * Generate emerging technology alert
   */
  async generateEmergingAlert(
    technologyId: string,
    technologyName: string,
    growthRate: number,
    keyIndicators: string[],
    firstSeen: Date
  ): Promise<EmergingTechnologyAlert | null> {
    if (!this.config.emergingTechnology) return null;
    if (growthRate < this.config.emergingGrowthThreshold) return null;

    const alert: EmergingTechnologyAlert = {
      id: uuidv4(),
      type: 'emerging_technology',
      severity: this.calculateEmergingSeverity(growthRate),
      technologyId,
      technologyName,
      title: `新興技術検出: ${technologyName}`,
      message: `${technologyName}が急成長中です（成長率: ${(growthRate * 100).toFixed(1)}%）`,
      createdAt: new Date(),
      acknowledged: false,
      growthRate,
      keyIndicators,
      firstSeen,
    };

    await this.store.save(alert);
    return alert;
  }

  /**
   * Generate declining technology alert
   */
  async generateDecliningAlert(
    technologyId: string,
    technologyName: string,
    declineRate: number,
    replacements: Array<{ id: string; name: string }>,
    lastActiveDate: Date
  ): Promise<DecliningTechnologyAlert | null> {
    if (!this.config.decliningTechnology) return null;
    if (declineRate < this.config.decliningRateThreshold) return null;

    const alert: DecliningTechnologyAlert = {
      id: uuidv4(),
      type: 'declining_technology',
      severity: this.calculateDeclineSeverity(declineRate),
      technologyId,
      technologyName,
      title: `衰退技術検出: ${technologyName}`,
      message: `${technologyName}の活動が減少しています（衰退率: ${(declineRate * 100).toFixed(1)}%）`,
      createdAt: new Date(),
      acknowledged: false,
      declineRate,
      replacements,
      lastActiveDate,
    };

    await this.store.save(alert);
    return alert;
  }

  /**
   * Generate anomaly alert
   */
  async generateAnomalyAlert(
    technologyId: string,
    technologyName: string,
    anomalyDescription: string,
    expected: string,
    observed: string,
    anomalyScore: number
  ): Promise<AnomalyAlert | null> {
    if (!this.config.anomalyDetection) return null;
    if (anomalyScore < this.config.anomalyThreshold) return null;

    const alert: AnomalyAlert = {
      id: uuidv4(),
      type: 'anomaly_detected',
      severity: this.calculateAnomalySeverity(anomalyScore),
      technologyId,
      technologyName,
      title: `異常検出: ${technologyName}`,
      message: anomalyDescription,
      createdAt: new Date(),
      acknowledged: false,
      anomalyDescription,
      expected,
      observed,
      anomalyScore,
    };

    await this.store.save(alert);
    return alert;
  }

  /**
   * Get unacknowledged alerts
   */
  async getUnacknowledgedAlerts(): Promise<Alert[]> {
    return this.store.getUnacknowledged();
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    await this.store.acknowledge(alertId);
  }

  /**
   * Get alerts by date range
   */
  async getAlertsByDateRange(start: Date, end: Date): Promise<Alert[]> {
    return this.store.getByDateRange(start, end);
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private createPhaseTransitionAlert(
    previousState: TechnologyState,
    currentState: TechnologyState,
    phaseResult?: PhaseDetectionResult
  ): PhaseTransitionAlert {
    const fromMeta = PHASE_METADATA[previousState.phase];
    const toMeta = PHASE_METADATA[currentState.phase];
    const daysInPrevious = Math.floor(
      (currentState.lastUpdated.getTime() - previousState.lastUpdated.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return {
      id: uuidv4(),
      type: 'phase_transition',
      severity: this.calculateTransitionSeverity(previousState.phase, currentState.phase),
      technologyId: currentState.technologyId,
      technologyName: currentState.technologyName,
      title: `フェーズ遷移: ${currentState.technologyName}`,
      message: `${currentState.technologyName}が${fromMeta.labelJa}から${toMeta.labelJa}へ移行しました`,
      createdAt: new Date(),
      acknowledged: false,
      fromPhase: previousState.phase,
      toPhase: currentState.phase,
      confidence: phaseResult?.confidence ?? 0.5,
      daysInPreviousPhase: daysInPrevious,
      indicators: phaseResult?.indicators.map((i) => i.name) ?? [],
    };
  }

  private createMaturityChangeAlert(
    state: TechnologyState,
    previous: MaturityScore,
    current: MaturityScore
  ): MaturityChangeAlert {
    const change = current.overall - previous.overall;
    const changePercentage = (change / previous.overall) * 100;

    const significantChanges = this.findSignificantChanges(previous, current);

    return {
      id: uuidv4(),
      type: 'maturity_change',
      severity: this.calculateMaturitySeverity(changePercentage),
      technologyId: state.technologyId,
      technologyName: state.technologyName,
      title: `成熟度変化: ${state.technologyName}`,
      message: `${state.technologyName}の成熟度が${changePercentage > 0 ? '上昇' : '低下'}しました（${change > 0 ? '+' : ''}${changePercentage.toFixed(1)}%）`,
      createdAt: new Date(),
      acknowledged: false,
      previousScore: previous.overall,
      currentScore: current.overall,
      change,
      changePercentage,
      significantChanges,
    };
  }

  private createTrendShiftAlert(
    state: TechnologyState,
    previousTrend: TrendDirection,
    currentTrend: TrendDirection
  ): TrendShiftAlert {
    const trendLabels: Record<TrendDirection, string> = {
      rising: '上昇',
      stable: '安定',
      declining: '下降',
      volatile: '変動',
    };

    return {
      id: uuidv4(),
      type: 'trend_shift',
      severity: this.calculateTrendShiftSeverity(previousTrend, currentTrend),
      technologyId: state.technologyId,
      technologyName: state.technologyName,
      title: `トレンド変化: ${state.technologyName}`,
      message: `${state.technologyName}のトレンドが${trendLabels[previousTrend]}から${trendLabels[currentTrend]}へ変化しました`,
      createdAt: new Date(),
      acknowledged: false,
      previousTrend,
      currentTrend,
      magnitude: this.calculateTrendMagnitude(previousTrend, currentTrend),
      factors: [],
    };
  }

  private calculateMaturityChange(
    previous: MaturityScore,
    current: MaturityScore
  ): { absolute: number; percentage: number } {
    const absolute = current.overall - previous.overall;
    const percentage = previous.overall !== 0 ? (absolute / previous.overall) * 100 : 0;
    return { absolute, percentage };
  }

  private findSignificantChanges(
    previous: MaturityScore,
    current: MaturityScore
  ): Array<{ area: keyof MaturityScore; previousValue: number; currentValue: number }> {
    const areas: (keyof MaturityScore)[] = [
      'researchActivity',
      'industryAdoption',
      'communityEngagement',
      'documentationQuality',
      'stability',
    ];

    return areas
      .map((area) => ({
        area,
        previousValue: previous[area],
        currentValue: current[area],
        change: Math.abs(current[area] - previous[area]),
      }))
      .filter((c) => c.change >= 5) // 5 point threshold
      .sort((a, b) => b.change - a.change)
      .slice(0, 3)
      .map(({ area, previousValue, currentValue }) => ({
        area,
        previousValue,
        currentValue,
      }));
  }

  private calculateTransitionSeverity(
    from: LifecyclePhase,
    to: LifecyclePhase
  ): AlertSeverity {
    // Declining phases are more critical
    const phaseOrder: LifecyclePhase[] = [
      'innovation_trigger',
      'peak_of_expectations',
      'trough_of_disillusionment',
      'slope_of_enlightenment',
      'plateau_of_productivity',
    ];

    const fromIndex = phaseOrder.indexOf(from);
    const toIndex = phaseOrder.indexOf(to);

    // Moving to trough is critical
    if (to === 'trough_of_disillusionment') return 'warning';
    // Big jumps are notable
    if (Math.abs(toIndex - fromIndex) >= 2) return 'warning';
    return 'info';
  }

  private calculateMaturitySeverity(changePercentage: number): AlertSeverity {
    const abs = Math.abs(changePercentage);
    if (abs >= 25) return 'critical';
    if (abs >= 15) return 'warning';
    return 'info';
  }

  private calculateTrendShiftSeverity(
    previous: TrendDirection,
    current: TrendDirection
  ): AlertSeverity {
    // Shift to declining is more critical
    if (current === 'declining' && previous !== 'declining') return 'warning';
    if (current === 'volatile') return 'warning';
    return 'info';
  }

  private calculateTrendMagnitude(
    previous: TrendDirection,
    current: TrendDirection
  ): number {
    const directionValue: Record<TrendDirection, number> = {
      rising: 1,
      stable: 0,
      declining: -1,
      volatile: 0.5,
    };

    return Math.abs(directionValue[current] - directionValue[previous]);
  }

  private calculateEmergingSeverity(growthRate: number): AlertSeverity {
    if (growthRate >= 0.5) return 'critical';
    if (growthRate >= 0.3) return 'warning';
    return 'info';
  }

  private calculateDeclineSeverity(declineRate: number): AlertSeverity {
    if (declineRate >= 0.5) return 'critical';
    if (declineRate >= 0.3) return 'warning';
    return 'info';
  }

  private calculateAnomalySeverity(anomalyScore: number): AlertSeverity {
    if (anomalyScore >= 0.95) return 'critical';
    if (anomalyScore >= 0.9) return 'warning';
    return 'info';
  }
}
