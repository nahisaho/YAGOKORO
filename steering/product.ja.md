# Product Context

**Project**: YAGOKORO
**Last Updated**: 2025-12-31
**Current Version**: 5.0.0 ✅ Complete
**Next Version**: 6.0.0 📋 Planned

---

## Version Roadmap

| Version | テーマ | 状態 | 主要機能 |
|---------|--------|------|----------|
| v1.0.0 | 基盤構築 | ✅ Complete | ドメインモデル、Neo4j/Qdrant統合 |
| v2.0.0 | GraphRAG | ✅ Complete | LazyGraphRAG、MCP基本ツール |
| v3.0.0 | 自動化 | ✅ Complete | LLMレス関係抽出、論文自動取り込み |
| v4.0.0 | 時系列・研究者 | ✅ Complete | 時系列分析、研究者ネットワーク、CLI/MCP統合 |
| **v5.0.0** | **多言語** | ✅ **Complete** | 多言語NER、翻訳、クロスリンガルリンキング |
| v6.0.0 | 引用ネットワーク | 📋 Planned | 引用分析、トピックモデリング |

### v5.0.0 Features ✅ Complete

| Feature ID | 機能名 | 概要 | 状態 |
|------------|--------|------|------|
| F-008 | 多言語論文処理 | 言語検出、翻訳、NER、クロスリンガルリンキング | ✅ Complete |

**詳細**: [v5.0.0 設計書](../storage/specs/v5.0.0-design.md)

### v4.0.0 Features ✅ Complete

| Feature ID | 機能名 | 概要 | 状態 |
|------------|--------|------|------|
| F-004 | 時系列分析 | トレンド検出、タイムライン可視化、Hot Topics、予測、フェーズ分析 | ✅ Complete |
| F-005 | 研究者ネットワーク | 共著分析、影響力スコア、コミュニティ検出、キャリア分析 | ✅ Complete |
| F-006 | CLI統合 | temporal/researcher CLIコマンド | ✅ Complete |
| F-007 | MCP統合 | temporal/researcher MCPツール | ✅ Complete |

**詳細**: [v4.0.0 設計書](../storage/specs/v4.0.0-design.md)

---

## Product Vision

**Vision Statement**: LLMの限界を克服し、知識グラフとオントロジーの力を活用した、真の知的推論能力を持つAGIシステムを実現する

> AGI（Artificial General Intelligence）実現に向けて、LLM単独では数学的・理論的に不可能とされる真の推論能力を、GraphRAGとオントロジー工学の統合によって実現します。AI研究者の76%が現在のアプローチのスケールアップでは不十分と回答しており、本プロジェクトは新たなパラダイムへの挑戦です。

**Mission**: Generative AIの進化の系譜を構造化された知識グラフとして構築し、マルチホップ推論とMCPプロトコルを介した外部AIシステム連携を実現する

---

## Product Overview

### What is YAGOKORO?

YAGOKOROは、AGI実現を目指すLLM・GraphRAG・オントロジー統合システムです。

> Phase 1では、Generative AIの系譜を知識グラフとして構築し、GraphRAGによる高度な検索・推論機能を提供します。Microsoft GraphRAGのアーキテクチャを参考に独自実装を行い、エンタープライズ環境での3.4倍精度向上（16%→54%）を目指します。
>
> MCP（Model Context Protocol）を活用し、Claude、ChatGPTなどの外部AIシステムから直接アクセス可能な知識基盤を構築します。これにより、AIアシスタントがGenerative AIの歴史、技術、人物、組織の関係性を深く理解し、ユーザーの質問に対してより正確で洞察に富んだ回答を提供できるようになります。

### Problem Statement

**Problem**: LLM単独でのAGI実現には数学的・理論的制約があり、ハルシネーション、真の論理的推論の欠如、スケーリング則の収穫逓減が課題

> - LLMのハルシネーションは数学的に不可避（Xu et al., 2024）
> - LLMは訓練データの推論ステップを模倣しているだけで、真の論理的推論を行っていない（Apple GSM-Symbolic, 2024）
> - 高品質テキストデータは2026-2028年頃に枯渇予測
> - 従来のVector RAGでは分散情報間の合成的洞察取得が困難

### Solution

**Solution**: GraphRAGとオントロジー工学を統合し、知識グラフによる明示的な知識表現とマルチホップ推論を実現

> - 階層的コミュニティ検出とサマリ生成による包括的知識理解
> - マルチホップ推論で2倍以上の改善
> - 時間的推論精度83.35%、数値推論精度100%
> - MCPプロトコルによる外部AIシステムとの標準化された連携

---

## Target Users

### Primary Users

#### User Persona 1: AI研究者・エンジニア

**Demographics**:

- **Role**: AI/MLエンジニア、研究者
- **Organization Size**: スタートアップ〜大企業
- **Technical Level**: 上級

**Goals**:

- Generative AIの技術系譜を正確に把握する
- 論文・モデル間の関係性を探索する
- 新しい研究アイデアの着想を得る

**Pain Points**:

- AI技術の爆発的増加で全体像の把握が困難
- LLMへの質問では不正確な情報（ハルシネーション）が混入
- 技術間の依存関係や影響関係が見えにくい

**Use Cases**:

- 「Transformerアーキテクチャに影響を受けた主要なLLMモデルを教えて」
- 「OpenAIとAnthropicの技術的な関係性は？」
- 「GPT-4の学習に使われた技術の系譜を辿りたい」

---

#### User Persona 2: AI製品マネージャー・ビジネスリーダー

**Demographics**:

- **Role**: プロダクトマネージャー、CTOなど
- **Organization Size**: 中規模〜大企業
- **Technical Level**: 中級

**Goals**:

- AI技術トレンドの把握と戦略立案
- 競合技術の関係性理解
- 投資判断の根拠収集

**Pain Points**:

- 技術的詳細と全体像のバランスが難しい
- 信頼性の高い情報源の特定が困難

**Use Cases**:

- 「2024年のLLM市場で最も影響力のあるモデルは？」
- 「特定の技術を持つ企業・組織のマッピング」

---

### Secondary Users

- **{{SECONDARY_USER_1}}**: [Description and role]
- **{{SECONDARY_USER_2}}**: [Description and role]

---

## Market & Business Context

### Market Opportunity

**Market Size**: {{MARKET_SIZE}}

**Target Market**: {{TARGET_MARKET}}

> [Description of the market opportunity, competitive landscape, and positioning]

### Business Model

**Revenue Model**: {{REVENUE_MODEL}}

> Examples: SaaS subscription, One-time purchase, Freemium, Usage-based

**Pricing Tiers** (if applicable):

- **Free Tier**: [Features, limitations]
- **Pro Tier**: ${{PRICE}}/month - [Features]
- **Enterprise Tier**: Custom pricing - [Features]

### Competitive Landscape

| Competitor       | Strengths   | Weaknesses   | Our Differentiation   |
| ---------------- | ----------- | ------------ | --------------------- |
| {{COMPETITOR_1}} | [Strengths] | [Weaknesses] | [How we're different] |
| {{COMPETITOR_2}} | [Strengths] | [Weaknesses] | [How we're different] |

---

## Core Product Capabilities

### Must-Have Features (MVP)

1. **{{FEATURE_1}}**
   - **Description**: [What it does]
   - **User Value**: [Why users need it]
   - **Priority**: P0 (Critical)

2. **{{FEATURE_2}}**
   - **Description**: [What it does]
   - **User Value**: [Why users need it]
   - **Priority**: P0 (Critical)

3. **{{FEATURE_3}}**
   - **Description**: [What it does]
   - **User Value**: [Why users need it]
   - **Priority**: P0 (Critical)

### High-Priority Features (Post-MVP)

4. **{{FEATURE_4}}**
   - **Description**: [What it does]
   - **User Value**: [Why users need it]
   - **Priority**: P1 (High)

5. **{{FEATURE_5}}**
   - **Description**: [What it does]
   - **User Value**: [Why users need it]
   - **Priority**: P1 (High)

### Future Features (Roadmap)

6. **{{FEATURE_6}}**
   - **Description**: [What it does]
   - **User Value**: [Why users need it]
   - **Priority**: P2 (Medium)

7. **{{FEATURE_7}}**
   - **Description**: [What it does]
   - **User Value**: [Why users need it]
   - **Priority**: P3 (Low)

---

## Product Principles

### Design Principles

1. **{{PRINCIPLE_1}}**
   - [Description of what this means for product decisions]

2. **{{PRINCIPLE_2}}**
   - [Description]

3. **{{PRINCIPLE_3}}**
   - [Description]

**Examples**:

- **Simplicity First**: Favor simple solutions over complex ones
- **User Empowerment**: Give users control and flexibility
- **Speed & Performance**: Fast response times (< 200ms)

### User Experience Principles

1. **{{UX_PRINCIPLE_1}}**
   - [How this guides UX decisions]

2. **{{UX_PRINCIPLE_2}}**
   - [How this guides UX decisions]

**Examples**:

- **Progressive Disclosure**: Show advanced features only when needed
- **Accessibility First**: WCAG 2.1 AA compliance
- **Mobile-First**: Design for mobile, enhance for desktop

---

## Success Metrics

### Key Performance Indicators (KPIs)

#### Business Metrics

| Metric                              | Target            | Measurement    |
| ----------------------------------- | ----------------- | -------------- |
| **Monthly Active Users (MAU)**      | {{MAU_TARGET}}    | [How measured] |
| **Monthly Recurring Revenue (MRR)** | ${{MRR_TARGET}}   | [How measured] |
| **Customer Acquisition Cost (CAC)** | ${{CAC_TARGET}}   | [How measured] |
| **Customer Lifetime Value (LTV)**   | ${{LTV_TARGET}}   | [How measured] |
| **Churn Rate**                      | < {{CHURN_RATE}}% | [How measured] |

#### Product Metrics

| Metric                       | Target                | Measurement    |
| ---------------------------- | --------------------- | -------------- |
| **Daily Active Users (DAU)** | {{DAU_TARGET}}        | [How measured] |
| **Feature Adoption Rate**    | > {{ADOPTION_RATE}}%  | [How measured] |
| **User Retention (Day 7)**   | > {{RETENTION_RATE}}% | [How measured] |
| **Net Promoter Score (NPS)** | > {{NPS_TARGET}}      | [How measured] |

#### Technical Metrics

| Metric                      | Target  | Measurement             |
| --------------------------- | ------- | ----------------------- |
| **API Response Time (p95)** | < 200ms | Monitoring dashboard    |
| **Uptime**                  | 99.9%   | Status page             |
| **Error Rate**              | < 0.1%  | Error tracking (Sentry) |
| **Page Load Time**          | < 2s    | Web vitals              |

---

## Product Roadmap

### Phase 1: MVP (Months 1-3)

**Goal**: Launch minimum viable product

**Features**:

- [Feature 1]
- [Feature 2]
- [Feature 3]

**Success Criteria**:

- [Criterion 1]
- [Criterion 2]

---

### Phase 2: Growth (Months 4-6)

**Goal**: Achieve product-market fit

**Features**:

- [Feature 4]
- [Feature 5]
- [Feature 6]

**Success Criteria**:

- [Criterion 1]
- [Criterion 2]

---

### Phase 3: Scale (Months 7-12)

**Goal**: Scale to {{USER_TARGET}} users

**Features**:

- [Feature 7]
- [Feature 8]
- [Feature 9]

**Success Criteria**:

- [Criterion 1]
- [Criterion 2]

---

## User Workflows

### Primary Workflow 1: {{WORKFLOW_1_NAME}}

**User Goal**: {{USER_GOAL}}

**Steps**:

1. User [action 1]
2. System [response 1]
3. User [action 2]
4. System [response 2]
5. User achieves [goal]

**Success Criteria**:

- User completes workflow in < {{TIME}} minutes
- Success rate > {{SUCCESS_RATE}}%

---

### Primary Workflow 2: {{WORKFLOW_2_NAME}}

**User Goal**: {{USER_GOAL}}

**Steps**:

1. [Step 1]
2. [Step 2]
3. [Step 3]

**Success Criteria**:

- [Criterion 1]
- [Criterion 2]

---

## Business Domain

### Domain Concepts

Key concepts and terminology used in this domain:

1. **{{CONCEPT_1}}**: [Definition and importance]
2. **{{CONCEPT_2}}**: [Definition and importance]
3. **{{CONCEPT_3}}**: [Definition and importance]

**Example for SaaS Authentication**:

- **Identity Provider (IdP)**: Service that authenticates users
- **Single Sign-On (SSO)**: One login for multiple applications
- **Multi-Factor Authentication (MFA)**: Additional verification step

### Business Rules

1. **{{RULE_1}}**
   - [Description of business rule]
   - **Example**: [Concrete example]

2. **{{RULE_2}}**
   - [Description]
   - **Example**: [Example]

**Example for E-commerce**:

- **Inventory Reservation**: Reserved items held for 10 minutes during checkout
- **Refund Window**: Refunds allowed within 30 days of purchase

---

## Constraints & Requirements

### Business Constraints

- **Budget**: ${{BUDGET}}
- **Timeline**: {{TIMELINE}}
- **Team Size**: {{TEAM_SIZE}} engineers
- **Launch Date**: {{LAUNCH_DATE}}

### Compliance Requirements

- **{{COMPLIANCE_1}}**: [Description, e.g., GDPR, SOC 2, HIPAA]
- **{{COMPLIANCE_2}}**: [Description]
- **Data Residency**: [Requirements, e.g., EU data stays in EU]

### Non-Functional Requirements

- **Performance**: API response < 200ms (95th percentile)
- **Availability**: 99.9% uptime SLA
- **Scalability**: Support {{CONCURRENT_USERS}} concurrent users
- **Security**: OWASP Top 10 compliance
- **Accessibility**: WCAG 2.1 AA compliance

---

## Stakeholders

### Internal Stakeholders

| Role                    | Name                 | Responsibilities                  |
| ----------------------- | -------------------- | --------------------------------- |
| **Product Owner**       | {{PO_NAME}}          | Vision, roadmap, priorities       |
| **Tech Lead**           | {{TECH_LEAD_NAME}}   | Architecture, technical decisions |
| **Engineering Manager** | {{EM_NAME}}          | Team management, delivery         |
| **QA Lead**             | {{QA_LEAD_NAME}}     | Quality assurance, testing        |
| **Design Lead**         | {{DESIGN_LEAD_NAME}} | UX/UI design                      |

### External Stakeholders

| Role                        | Name        | Responsibilities            |
| --------------------------- | ----------- | --------------------------- |
| **Customer Advisory Board** | [Members]   | Product feedback            |
| **Investors**               | [Names]     | Funding, strategic guidance |
| **Partners**                | [Companies] | Integration, co-marketing   |

---

## Go-to-Market Strategy

### Launch Strategy

**Target Launch Date**: {{LAUNCH_DATE}}

**Launch Phases**:

1. **Private Beta** ({{START_DATE}} - {{END_DATE}})
   - Invite-only, 50 beta users
   - Focus: Gather feedback, fix critical bugs

2. **Public Beta** ({{START_DATE}} - {{END_DATE}})
   - Open signup
   - Focus: Validate product-market fit

3. **General Availability** ({{LAUNCH_DATE}})
   - Full public launch
   - Focus: Acquisition and growth

### Marketing Channels

- **{{CHANNEL_1}}**: [Strategy, e.g., Content marketing, SEO]
- **{{CHANNEL_2}}**: [Strategy, e.g., Social media, Twitter/LinkedIn]
- **{{CHANNEL_3}}**: [Strategy, e.g., Paid ads, Google/Facebook]
- **{{CHANNEL_4}}**: [Strategy, e.g., Partnerships, integrations]

---

## Risk Assessment

### Product Risks

| Risk       | Probability     | Impact          | Mitigation            |
| ---------- | --------------- | --------------- | --------------------- |
| {{RISK_1}} | High/Medium/Low | High/Medium/Low | [Mitigation strategy] |
| {{RISK_2}} | High/Medium/Low | High/Medium/Low | [Mitigation strategy] |

**Example Risks**:

- **Low adoption**: Users don't understand value → Clear onboarding, demos
- **Performance issues**: System slow at scale → Load testing, optimization
- **Security breach**: Data compromised → Security audit, penetration testing

---

## Customer Support

### Support Channels

- **Email**: support@{{COMPANY}}.com
- **Chat**: In-app live chat (business hours)
- **Documentation**: docs.{{COMPANY}}.com
- **Community**: Forum/Discord/Slack

### Support SLA

| Tier              | Response Time | Resolution Time |
| ----------------- | ------------- | --------------- |
| **Critical (P0)** | < 1 hour      | < 4 hours       |
| **High (P1)**     | < 4 hours     | < 24 hours      |
| **Medium (P2)**   | < 24 hours    | < 3 days        |
| **Low (P3)**      | < 48 hours    | Best effort     |

---

## Product Analytics

### Analytics Tools

- **{{ANALYTICS_TOOL_1}}**: [Purpose, e.g., Google Analytics, Mixpanel]
- **{{ANALYTICS_TOOL_2}}**: [Purpose, e.g., Amplitude, Heap]

### Events to Track

| Event               | Description            | Purpose           |
| ------------------- | ---------------------- | ----------------- |
| `user_signup`       | New user registration  | Track acquisition |
| `feature_used`      | User uses core feature | Track engagement  |
| `payment_completed` | User completes payment | Track conversion  |
| `error_occurred`    | User encounters error  | Track reliability |

---

## Localization & Internationalization

### Supported Languages

- **Primary**: English (en-US)
- **Secondary**: [Languages, e.g., Japanese (ja-JP), Spanish (es-ES)]

### Localization Strategy

- **UI Strings**: i18n framework (next-intl, react-i18next)
- **Date/Time**: Locale-aware formatting
- **Currency**: Multi-currency support
- **Right-to-Left (RTL)**: Support for Arabic, Hebrew (if needed)

---

## Data & Privacy

### Data Collection

**What data we collect**:

- User account information (email, name)
- Usage analytics (anonymized)
- Error logs (for debugging)

**What data we DON'T collect**:

- [Sensitive data we avoid, e.g., passwords (only hashed), payment details (tokenized)]

### Privacy Policy

- **GDPR Compliance**: Right to access, delete, export data
- **Data Retention**: [Retention period, e.g., 90 days for logs]
- **Third-Party Sharing**: [Who we share data with, why]

---

## Integrations

### Existing Integrations

| Integration       | Purpose   | Priority |
| ----------------- | --------- | -------- |
| {{INTEGRATION_1}} | [Purpose] | P0       |
| {{INTEGRATION_2}} | [Purpose] | P1       |

### Planned Integrations

| Integration       | Purpose   | Timeline |
| ----------------- | --------- | -------- |
| {{INTEGRATION_3}} | [Purpose] | Q2 2025  |
| {{INTEGRATION_4}} | [Purpose] | Q3 2025  |

---

## Changelog

### Version 1.1 (Planned)

- [Future product updates]

---

**Last Updated**: 2025-12-28
**Maintained By**: {{MAINTAINER}}
