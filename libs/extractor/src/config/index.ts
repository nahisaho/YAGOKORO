/**
 * @fileoverview Config module exports
 * @module @yagokoro/extractor/config
 */

export {
  ConfigLoader,
  RelationTypeConfig,
  ScoringWeights,
  ScoringThresholds,
  ScoringConfig,
  RelationTypesConfig,
  ConfigValidationError,
  validateConfig,
  loadConfigFromFile,
  loadConfigFromJSON,
  getDefaultConfigPath,
  createMinimalConfig,
} from './config-loader';
