// ============================================
// v4.0.0 Schema Extensions - Temporal
// ============================================
// REQ-004-01: Store temporal metadata for all entities
// REQ-004-04: Trend metrics calculation
// ============================================

// --- INDEXES FOR EXISTING ENTITY TEMPORAL PROPERTIES ---

// Composite index for temporal queries on all entity types
// Supports REQ-004-06: Time range filtering
CREATE INDEX entity_publication_date IF NOT EXISTS
FOR (n:AIModel) ON (n.publicationDate);

CREATE INDEX technique_publication_date IF NOT EXISTS
FOR (n:Technique) ON (n.publicationDate);

CREATE INDEX benchmark_publication_date IF NOT EXISTS
FOR (n:Benchmark) ON (n.publicationDate);

CREATE INDEX publication_date IF NOT EXISTS
FOR (n:Publication) ON (n.publicationDate);

// --- TRENDMETRICS NODE ---
// Stores daily trend snapshots for time-series analysis
// REQ-004-04: Trend metrics with momentum, velocity

// Uniqueness constraint: one TrendMetrics per entity per date
CREATE CONSTRAINT trend_metrics_unique IF NOT EXISTS
FOR (tm:TrendMetrics)
REQUIRE (tm.entityId, tm.date) IS UNIQUE;

// Index for efficient date range queries
CREATE INDEX trend_metrics_date IF NOT EXISTS
FOR (tm:TrendMetrics) ON (tm.date);

// Index for entity-based lookups
CREATE INDEX trend_metrics_entity IF NOT EXISTS
FOR (tm:TrendMetrics) ON (tm.entityId);

// Composite index for entity + date queries (most common pattern)
CREATE INDEX trend_metrics_entity_date IF NOT EXISTS
FOR (tm:TrendMetrics) ON (tm.entityId, tm.date);

// Index for adoption phase filtering
// REQ-004-07: Filter by adoption phase
CREATE INDEX trend_metrics_phase IF NOT EXISTS
FOR (tm:TrendMetrics) ON (tm.adoptionPhase);

// --- TRENDSNAPSHOT NODE ---
// Aggregated snapshot at a point in time
// Used for "Hot Topics" and trend reports

CREATE CONSTRAINT trend_snapshot_unique IF NOT EXISTS
FOR (ts:TrendSnapshot)
REQUIRE (ts.id) IS UNIQUE;

CREATE INDEX trend_snapshot_date IF NOT EXISTS
FOR (ts:TrendSnapshot) ON (ts.capturedAt);

// --- TIMELINE RELATIONSHIP ---
// Links entities to their TrendMetrics history
// Pattern: (Entity)-[:HAS_TREND]->(TrendMetrics)

// Index for traversing timeline efficiently
CREATE INDEX has_trend_date IF NOT EXISTS
FOR ()-[r:HAS_TREND]-() ON (r.date);

// --- TEMPORAL RANGE INDEX FOR FULL-TEXT SEARCH ---
// Supports REQ-004-06: Time range + text queries

CREATE INDEX temporal_range IF NOT EXISTS
FOR (n:AIModel) ON (n.publicationDate, n.name);

CREATE INDEX technique_temporal_range IF NOT EXISTS
FOR (n:Technique) ON (n.publicationDate, n.name);

// --- HOT_TOPIC RELATIONSHIP ---
// Links TrendSnapshot to trending entities
// Pattern: (TrendSnapshot)-[:HOT_TOPIC]->(Entity)

CREATE INDEX hot_topic_rank IF NOT EXISTS
FOR ()-[r:HOT_TOPIC]-() ON (r.rank);

CREATE INDEX hot_topic_momentum IF NOT EXISTS
FOR ()-[r:HOT_TOPIC]-() ON (r.momentum);
