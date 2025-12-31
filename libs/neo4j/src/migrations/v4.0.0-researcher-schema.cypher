// ============================================
// v4.0.0 Schema Extensions - Researcher Network
// ============================================
// REQ-005-01: ORCID integration
// REQ-005-02: Coauthor network construction
// REQ-005-03: Influence score calculation
// REQ-005-04: Community detection
// REQ-005-05: Coauthor graph retrieval
// REQ-005-06: Path finding between researchers
// REQ-005-07: Profile retrieval
// REQ-005-08: Researcher ranking
// ============================================

// --- PERSON NODE EXTENSIONS ---

// ORCID uniqueness constraint
// REQ-005-01: ORCID ID integration
CREATE CONSTRAINT person_orcid_unique IF NOT EXISTS
FOR (p:Person)
REQUIRE p.orcid IS UNIQUE;

// Index for ORCID lookups
CREATE INDEX person_orcid IF NOT EXISTS
FOR (p:Person) ON (p.orcid);

// Index for influence score queries
// REQ-005-03: Influence score calculation
CREATE INDEX person_influence IF NOT EXISTS
FOR (p:Person) ON (p.influenceScore);

// Index for h-index ranking
CREATE INDEX person_hindex IF NOT EXISTS
FOR (p:Person) ON (p.hIndex);

// Index for citation count
CREATE INDEX person_citations IF NOT EXISTS
FOR (p:Person) ON (p.citationCount);

// --- AFFILIATION NODE ---
// Stores researcher career/affiliation history
// ADR-002: Affiliation disambiguation

CREATE CONSTRAINT affiliation_unique IF NOT EXISTS
FOR (a:Affiliation)
REQUIRE a.id IS UNIQUE;

// Index for person lookup
CREATE INDEX affiliation_person IF NOT EXISTS
FOR (a:Affiliation) ON (a.personId);

// Index for organization lookup
CREATE INDEX affiliation_organization IF NOT EXISTS
FOR (a:Affiliation) ON (a.organization);

// Index for date range queries
CREATE INDEX affiliation_dates IF NOT EXISTS
FOR (a:Affiliation) ON (a.startDate, a.endDate);

// --- COAUTHORED RELATIONSHIP ---
// Weighted edge for coauthorship
// REQ-005-02: Coauthor network construction
// REQ-005-05: Coauthor graph retrieval

// Note: Relationship indexes created for frequently queried properties

// Index for weight-based queries (most influential collaborations)
CREATE INDEX coauthored_weight IF NOT EXISTS
FOR ()-[c:COAUTHORED]-() ON (c.weight);

// Index for paper count
CREATE INDEX coauthored_papers IF NOT EXISTS
FOR ()-[c:COAUTHORED]-() ON (c.paperCount);

// Index for temporal queries on collaboration history
CREATE INDEX coauthored_temporal IF NOT EXISTS
FOR ()-[c:COAUTHORED]-() ON (c.lastCollaboration);

// --- RESEARCHER COMMUNITY NODE ---
// Results of community detection (Leiden algorithm)
// REQ-005-04: Community detection

CREATE CONSTRAINT researcher_community_unique IF NOT EXISTS
FOR (rc:ResearcherCommunity)
REQUIRE rc.id IS UNIQUE;

// Index for field-based queries
CREATE INDEX researcher_community_field IF NOT EXISTS
FOR (rc:ResearcherCommunity) ON (rc.field);

// Index for detection timestamp
CREATE INDEX researcher_community_detected IF NOT EXISTS
FOR (rc:ResearcherCommunity) ON (rc.detectedAt);

// Index for member count (size-based queries)
CREATE INDEX researcher_community_size IF NOT EXISTS
FOR (rc:ResearcherCommunity) ON (rc.memberCount);

// --- MEMBER_OF RELATIONSHIP ---
// Links Person to ResearcherCommunity
// REQ-005-04: Community membership

// Index for role-based queries (core vs peripheral)
CREATE INDEX member_of_role IF NOT EXISTS
FOR ()-[m:MEMBER_OF]-() ON (m.role);

// Index for membership date
CREATE INDEX member_of_since IF NOT EXISTS
FOR ()-[m:MEMBER_OF]-() ON (m.since);

// --- AUTHORED RELATIONSHIP ---
// Links Person to Publication (should already exist, adding index)
// REQ-005-02: Build coauthor edges from publications

CREATE INDEX authored_date IF NOT EXISTS
FOR ()-[a:AUTHORED]-() ON (a.date);

// --- FULL-TEXT SEARCH INDEX FOR RESEARCHERS ---
// Supports natural language researcher queries

CREATE FULLTEXT INDEX researcher_name_search IF NOT EXISTS
FOR (p:Person)
ON EACH [p.name, p.preferredName, p.aliases];

// --- PATH FINDING OPTIMIZATION ---
// REQ-005-06: Path finding between researchers
// Composite index for efficient shortest path queries

CREATE INDEX person_path_optimize IF NOT EXISTS
FOR (p:Person) ON (p.id, p.influenceScore);
