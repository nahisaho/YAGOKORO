/**
 * @fileoverview AlertGenerator Tests
 * TASK-V2-027: Alert generation tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AlertGenerator,
  InMemoryAlertStore,
  type TechnologyState,
} from './AlertGenerator.js';
import type { AlertConfig } from './types.js';

describe('AlertGenerator', () => {
  let alertGenerator: AlertGenerator;
  let alertStore: InMemoryAlertStore;

  beforeEach(() => {
    alertStore = new InMemoryAlertStore();
    alertGenerator = new AlertGenerator(alertStore);
  });

  describe('phase transition alerts', () => {
    it('should generate alert when phase changes', async () => {
      const previousState: TechnologyState = {
        technologyId: 'tech-1',
        technologyName: 'React',
        phase: 'innovation_trigger',
        maturityScore: { overall: 30, adoption: 30, production: 30, community: 30 },
        trend: 'rising',
        lastUpdated: new Date(Date.now() - 86400000),
      };

      const currentState: TechnologyState = {
        technologyId: 'tech-1',
        technologyName: 'React',
        phase: 'peak_of_expectations',
        maturityScore: { overall: 45, adoption: 50, production: 40, community: 45 },
        trend: 'rising',
        lastUpdated: new Date(),
      };

      // First call to register previous state
      await alertGenerator.checkAndGenerateAlerts(previousState);
      
      // Second call to detect transition
      const alerts = await alertGenerator.checkAndGenerateAlerts(currentState);

      expect(alerts.length).toBeGreaterThanOrEqual(1);
      const phaseAlert = alerts.find((a) => a.type === 'phase_transition');
      expect(phaseAlert).toBeDefined();
      expect(phaseAlert?.technologyId).toBe('tech-1');
      expect((phaseAlert as any).fromPhase).toBe('innovation_trigger');
      expect((phaseAlert as any).toPhase).toBe('peak_of_expectations');
    });

    it('should not generate alert when phase is unchanged', async () => {
      const state1: TechnologyState = {
        technologyId: 'tech-1',
        technologyName: 'React',
        phase: 'innovation_trigger',
        maturityScore: { overall: 30, adoption: 30, production: 30, community: 30 },
        trend: 'rising',
        lastUpdated: new Date(Date.now() - 86400000),
      };

      const state2: TechnologyState = {
        technologyId: 'tech-1',
        technologyName: 'React',
        phase: 'innovation_trigger',
        maturityScore: { overall: 32, adoption: 35, production: 30, community: 31 },
        trend: 'rising',
        lastUpdated: new Date(),
      };

      await alertGenerator.checkAndGenerateAlerts(state1);
      const alerts = await alertGenerator.checkAndGenerateAlerts(state2);

      const phaseAlert = alerts.find((a) => a.type === 'phase_transition');
      expect(phaseAlert).toBeUndefined();
    });
  });

  describe('maturity change alerts', () => {
    it('should generate alert when maturity changes significantly', async () => {
      const config: Partial<AlertConfig> = {
        maturityChangeThreshold: 5,
      };
      alertGenerator = new AlertGenerator(alertStore, config);

      const state1: TechnologyState = {
        technologyId: 'tech-1',
        technologyName: 'Vue.js',
        phase: 'slope_of_enlightenment',
        maturityScore: { overall: 50, adoption: 50, production: 50, community: 50 },
        trend: 'rising',
        lastUpdated: new Date(Date.now() - 86400000),
      };

      const state2: TechnologyState = {
        technologyId: 'tech-1',
        technologyName: 'Vue.js',
        phase: 'slope_of_enlightenment',
        maturityScore: { overall: 60, adoption: 65, production: 58, community: 57 },
        trend: 'rising',
        lastUpdated: new Date(),
      };

      await alertGenerator.checkAndGenerateAlerts(state1);
      const alerts = await alertGenerator.checkAndGenerateAlerts(state2);

      const maturityAlert = alerts.find((a) => a.type === 'maturity_change');
      expect(maturityAlert).toBeDefined();
      expect((maturityAlert as any).previousScore).toBe(50);
      expect((maturityAlert as any).currentScore).toBe(60);
    });

    it('should not generate alert for small maturity changes', async () => {
      const config: Partial<AlertConfig> = {
        maturityChangeThreshold: 30,
      };
      alertGenerator = new AlertGenerator(alertStore, config);

      const state1: TechnologyState = {
        technologyId: 'tech-1',
        technologyName: 'Vue.js',
        phase: 'slope_of_enlightenment',
        maturityScore: { overall: 50, adoption: 50, production: 50, community: 50 },
        trend: 'stable',
        lastUpdated: new Date(Date.now() - 86400000),
      };

      const state2: TechnologyState = {
        technologyId: 'tech-1',
        technologyName: 'Vue.js',
        phase: 'slope_of_enlightenment',
        maturityScore: { overall: 55, adoption: 56, production: 54, community: 55 },
        trend: 'stable',
        lastUpdated: new Date(),
      };

      await alertGenerator.checkAndGenerateAlerts(state1);
      const alerts = await alertGenerator.checkAndGenerateAlerts(state2);

      const maturityAlert = alerts.find((a) => a.type === 'maturity_change');
      expect(maturityAlert).toBeUndefined();
    });
  });

  describe('emerging technology alerts', () => {
    it('should generate emerging technology alert', async () => {
      const alert = await alertGenerator.generateEmergingAlert(
        'tech-new',
        'Bun',
        0.85, // 85% growth rate
        ['High GitHub stars growth', 'Active development'],
        new Date(Date.now() - 30 * 86400000)
      );

      expect(alert).toBeDefined();
      expect(alert?.type).toBe('emerging_technology');
      expect(alert?.technologyId).toBe('tech-new');
      expect(alert?.technologyName).toBe('Bun');
      expect(alert?.growthRate).toBe(0.85);
      expect(alert?.keyIndicators).toHaveLength(2);
    });

    it('should set severity based on emerging score', async () => {
      const highAlert = await alertGenerator.generateEmergingAlert(
        'tech-1',
        'Tech A',
        0.95,
        [],
        new Date()
      );
      expect(highAlert?.severity).toBe('critical'); // >= 0.5 is critical

      const mediumAlert = await alertGenerator.generateEmergingAlert(
        'tech-2',
        'Tech B',
        0.35,
        [],
        new Date()
      );
      expect(mediumAlert?.severity).toBe('warning'); // >= 0.3 is warning

      const lowAlert = await alertGenerator.generateEmergingAlert(
        'tech-3',
        'Tech C',
        0.25,
        [],
        new Date()
      );
      expect(lowAlert?.severity).toBe('info'); // < 0.3 is info
    });
  });

  describe('declining technology alerts', () => {
    it('should generate declining technology alert', async () => {
      const alert = await alertGenerator.generateDecliningAlert(
        'tech-old',
        'jQuery',
        0.80, // 80% decline rate
        [{ id: 'react', name: 'React' }],
        new Date(Date.now() - 365 * 86400000)
      );

      expect(alert).toBeDefined();
      expect(alert?.type).toBe('declining_technology');
      expect(alert?.technologyId).toBe('tech-old');
      expect(alert?.technologyName).toBe('jQuery');
      expect(alert?.declineRate).toBe(0.80);
      expect(alert?.replacements).toHaveLength(1);
    });

    it('should set critical severity for high declining rate', async () => {
      const criticalAlert = await alertGenerator.generateDecliningAlert(
        'tech-1',
        'Tech A',
        0.55, // >= 0.5 is critical
        [],
        new Date()
      );
      expect(criticalAlert?.severity).toBe('critical');

      const warningAlert = await alertGenerator.generateDecliningAlert(
        'tech-2',
        'Tech B',
        0.35, // >= 0.3 and < 0.5 is warning
        [],
        new Date()
      );
      expect(warningAlert?.severity).toBe('warning');
    });
  });

  describe('anomaly alerts', () => {
    it('should generate anomaly detection alert', async () => {
      const alert = await alertGenerator.generateAnomalyAlert(
        'tech-x',
        'TensorFlow',
        'Unexpected 300% increase in GitHub activity',
        '~1500 stars/month',
        '5000 stars/month',
        0.92
      );

      expect(alert).toBeDefined();
      expect(alert?.type).toBe('anomaly_detected');
      expect(alert?.anomalyDescription).toBe('Unexpected 300% increase in GitHub activity');
      expect(alert?.anomalyScore).toBe(0.92);
    });

    it('should set severity based on anomaly score', async () => {
      const criticalConfidence = await alertGenerator.generateAnomalyAlert(
        'tech-1',
        'Tech A',
        'Critical confidence anomaly',
        'expected',
        'observed',
        0.96 // >= 0.95 is critical
      );
      expect(criticalConfidence?.severity).toBe('critical');

      const warningConfidence = await alertGenerator.generateAnomalyAlert(
        'tech-2',
        'Tech B',
        'Warning confidence anomaly',
        'expected',
        'observed',
        0.92 // >= 0.9 and < 0.95 is warning
      );
      expect(warningConfidence?.severity).toBe('warning');
    });
  });

  describe('InMemoryAlertStore', () => {
    it('should save and retrieve alerts', async () => {
      const alert = await alertGenerator.generateEmergingAlert(
        'tech-1',
        'Deno',
        0.80,
        [],
        new Date()
      );

      expect(alert).toBeDefined();
      expect(alert!.id).toBeDefined();

      const retrieved = alertStore.getAll().find(a => a.id === alert!.id);
      expect(retrieved).toEqual(alert);
    });

    it('should filter alerts by technology', async () => {
      await alertGenerator.generateEmergingAlert('tech-1', 'A', 0.80, [], new Date());
      await alertGenerator.generateEmergingAlert('tech-2', 'B', 0.75, [], new Date());
      await alertGenerator.generateEmergingAlert('tech-1', 'A', 0.82, [], new Date());

      const tech1Alerts = await alertStore.getByTechnology('tech-1');
      expect(tech1Alerts).toHaveLength(2);

      const tech2Alerts = await alertStore.getByTechnology('tech-2');
      expect(tech2Alerts).toHaveLength(1);
    });

    it('should filter alerts by date range', async () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 86400000);
      const tomorrow = new Date(now.getTime() + 86400000);

      await alertGenerator.generateEmergingAlert('tech-1', 'A', 0.80, [], new Date());

      const alerts = await alertStore.getByDateRange(twoDaysAgo, tomorrow);
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should acknowledge alert', async () => {
      const alert = await alertGenerator.generateEmergingAlert(
        'tech-1',
        'Test',
        0.80,
        [],
        new Date()
      );

      expect(alert).toBeDefined();
      expect(alert!.acknowledged).toBe(false);

      await alertStore.acknowledge(alert!.id);
      
      const retrieved = alertStore.getAll().find(a => a.id === alert!.id);
      expect(retrieved?.acknowledged).toBe(true);
      expect(retrieved?.acknowledgedAt).toBeDefined();
    });

    it('should filter unacknowledged alerts', async () => {
      const alert1 = await alertGenerator.generateEmergingAlert(
        'tech-1',
        'A',
        0.80,
        [],
        new Date()
      );
      await alertGenerator.generateEmergingAlert('tech-2', 'B', 0.75, [], new Date());

      await alertStore.acknowledge(alert1!.id);

      const unacked = await alertStore.getUnacknowledged();
      expect(unacked).toHaveLength(1);
      expect(unacked[0].technologyName).toBe('B');
    });
  });

  describe('alert configuration', () => {
    it('should respect custom configuration', async () => {
      const customConfig: AlertConfig = {
        phaseTransition: false,
        maturityChange: true,
        trendShift: false,
        emergingTechnology: true,
        decliningTechnology: true,
        anomalyDetection: false,
        maturityChangeThreshold: 15,
        emergingGrowthThreshold: 0.70,
        decliningRateThreshold: 0.60,
        anomalyThreshold: 0.80,
      };

      alertGenerator = new AlertGenerator(alertStore, customConfig);

      const state1: TechnologyState = {
        technologyId: 'tech-1',
        technologyName: 'Test',
        phase: 'innovation_trigger',
        maturityScore: { overall: 30, adoption: 30, production: 30, community: 30 },
        trend: 'rising',
        lastUpdated: new Date(Date.now() - 86400000),
      };

      const state2: TechnologyState = {
        technologyId: 'tech-1',
        technologyName: 'Test',
        phase: 'peak_of_expectations',
        maturityScore: { overall: 35, adoption: 36, production: 34, community: 35 },
        trend: 'rising',
        lastUpdated: new Date(),
      };

      await alertGenerator.checkAndGenerateAlerts(state1);
      const alerts = await alertGenerator.checkAndGenerateAlerts(state2);

      // Phase transition alert should be disabled
      const phaseAlert = alerts.find((a) => a.type === 'phase_transition');
      expect(phaseAlert).toBeUndefined();

      // Maturity change should not trigger (16.7% < 15% threshold does NOT apply because it's percentage)
      const maturityAlert = alerts.find((a) => a.type === 'maturity_change');
      expect(maturityAlert).toBeDefined(); // 16.7% change
    });
  });
});
