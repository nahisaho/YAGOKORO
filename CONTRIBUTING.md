# Contributing to YAGOKORO

YAGOKORO プロジェクトへの貢献をご検討いただきありがとうございます！

## 📋 行動規範

このプロジェクトでは、オープンで歓迎する環境を維持するため、すべての貢献者に敬意を持った行動を求めます。

## 🚀 はじめに

### 開発環境のセットアップ

```bash
# リポジトリをフォーク & クローン
git clone https://github.com/your-username/yagokoro.git
cd yagokoro

# 依存関係をインストール
pnpm install

# Docker環境を起動
docker compose -f docker/docker-compose.dev.yml up -d

# ビルド
pnpm build

# テストを実行
pnpm test
```

### 前提条件

- **Node.js**: 20 LTS 以上
- **pnpm**: 9.x
- **Docker**: Docker Compose 対応

## 📁 プロジェクト構造

```
yagokoro/
├── apps/yagokoro/      # メインアプリケーション
├── libs/
│   ├── domain/         # ドメインモデル
│   ├── graphrag/       # GraphRAGコア
│   ├── extractor/      # 関係抽出 [v3]
│   ├── ingestion/      # 論文取り込み [v3]
│   ├── temporal/       # 時系列分析 [v4]
│   ├── researcher/     # 研究者ネットワーク [v4]
│   ├── nlq/            # 自然言語クエリ
│   ├── hallucination/  # ハルシネーション検出
│   ├── neo4j/          # Neo4jリポジトリ
│   ├── vector/         # ベクトルストア
│   ├── mcp/            # MCPサーバー
│   └── cli/            # CLIコマンド
├── steering/           # 設計ドキュメント
└── storage/specs/      # 仕様書
```

## 🔄 ワークフロー

### Issue の報告

1. 既存のIssueを検索して重複がないか確認
2. 適切なテンプレートを使用してIssueを作成
3. 再現手順、期待される動作、実際の動作を明記

### Pull Request の作成

1. **ブランチを作成**:
   ```bash
   git checkout -b feature/your-feature-name
   # または
   git checkout -b fix/your-bug-fix
   ```

2. **変更を実装** (Test-First アプローチ推奨):
   ```bash
   # まずテストを書く
   pnpm test:watch
   
   # 実装する
   # ...
   
   # すべてのテストが通ることを確認
   pnpm test
   ```

3. **コード品質をチェック**:
   ```bash
   pnpm lint
   pnpm format
   pnpm typecheck
   ```

4. **コミット** (Conventional Commits 形式):
   ```bash
   git commit -m "feat(nlq): add support for temporal queries"
   git commit -m "fix(neo4j): handle connection timeout"
   git commit -m "docs: update README with new features"
   ```

5. **PRを作成**:
   - 明確なタイトルと説明を記載
   - 関連するIssueにリンク
   - 変更内容のスクリーンショットやログを添付

## 📝 コーディング規約

### TypeScript

- **Strict Mode**: 有効
- **ESM**: 必須 (.js 拡張子でインポート)
- **命名規則**:
  - クラス: PascalCase (`EntityRepository`)
  - 関数/変数: camelCase (`getEntity`)
  - 定数: UPPER_SNAKE_CASE (`DEFAULT_TIMEOUT`)
  - ファイル: kebab-case または PascalCase

### テスト

- **カバレッジ**: 80% 以上を維持
- **Test-First**: 新機能は必ずテストから実装
- **統合テスト**: インフラ連携はTestcontainersを使用

```typescript
// Good: 説明的なテスト名
describe('NLQService', () => {
  it('should convert natural language to valid Cypher query', async () => {
    // ...
  });
});
```

### ドキュメント

- 公開APIにはJSDocコメントを記載
- 複雑なロジックには説明コメントを追加
- READMEとドキュメントを更新

## 🏗️ アーキテクチャガイドライン

### Library-First (Article I)

```typescript
// Good: ライブラリから機能をエクスポート
// libs/nlq/src/index.ts
export { NLQService } from './services/NLQService.js';

// apps/yagokoro/src/index.ts
import { NLQService } from '@yagokoro/nlq';
```

### Dependency Inversion (Article II)

```typescript
// Good: インターフェースに依存
interface EntityRepository {
  findById(id: string): Promise<Entity | null>;
}

// 実装はインフラ層で
class Neo4jEntityRepository implements EntityRepository {
  // ...
}
```

### Test-First (Article III)

```typescript
// Step 1: テストを書く
describe('ConsistencyChecker', () => {
  it('should detect inconsistent claims', async () => {
    const result = await checker.check(response);
    expect(result.isConsistent).toBe(false);
  });
});

// Step 2: 実装する
class ConsistencyChecker {
  async check(response: string): Promise<CheckResult> {
    // ...
  }
}
```

## 🧪 テストの実行

```bash
# すべてのテストを実行
pnpm test

# 特定のパッケージのテストを実行
pnpm --filter @yagokoro/nlq test

# ウォッチモードで実行
pnpm test:watch

# カバレッジレポートを生成
pnpm test:coverage
```

## 📦 パッケージの追加

新しいライブラリパッケージを追加する場合:

1. `libs/` ディレクトリにパッケージを作成
2. `package.json` を設定
3. `tsconfig.json` を設定
4. `vitest.config.ts` を設定
5. `steering/project.yml` に追加

## 🔍 レビュープロセス

1. **自動チェック**: CI/CDが lint, test, build を実行
2. **コードレビュー**: メンテナーが変更をレビュー
3. **フィードバック**: 必要に応じて修正を依頼
4. **マージ**: 承認後、メインブランチにマージ

## 📞 連絡先

- **Issues**: GitHub Issues で報告
- **Discussions**: GitHub Discussions で質問

## 🎉 謝辞

すべての貢献者の皆様に感謝いたします！

---

このガイドラインは [MUSUBI SDD](https://github.com/your-org/musubi) に基づいています。
