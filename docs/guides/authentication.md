# YAGOKORO 認証・認可ガイド

YAGOKOROのAPIキー認証とRole-Based Access Control (RBAC)の設定方法を説明します。

## 概要

YAGOKOROは以下の認証・認可機能を提供します:

- **APIキー認証**: リクエストの認証
- **RBAC**: ロールベースのアクセス制御
- **パーミッション**: 細粒度のアクセス権限

## 認証の有効化/無効化

### 開発環境（認証無効）

```typescript
import { YagokoroMCPServer } from '@yagokoro/mcp';

const server = new YagokoroMCPServer({
  name: 'yagokoro-dev',
  version: '0.4.0',
  auth: {
    enabled: false,  // 認証無効
  },
});
```

### 本番環境（認証有効）

```typescript
const server = new YagokoroMCPServer({
  name: 'yagokoro',
  version: '0.4.0',
  auth: {
    enabled: true,
    publicOperations: ['health_check'],  // 認証不要の操作
    apiKeys: [
      {
        key: 'ykg_admin_xxxxx',
        name: 'Admin Key',
        role: 'admin',
      },
      {
        key: 'ykg_reader_yyyyy',
        name: 'Reader Key',
        role: 'reader',
      },
    ],
  },
});
```

## ロールと権限

### ロール一覧

| ロール | 説明 | 用途 |
|-------|------|------|
| `admin` | 全権限 | システム管理者 |
| `writer` | 読み取り + 書き込み | データ編集者 |
| `reader` | 読み取りのみ | 閲覧ユーザー |

### パーミッション一覧

| パーミッション | admin | writer | reader |
|--------------|-------|--------|--------|
| `read:entities` | ✅ | ✅ | ✅ |
| `write:entities` | ✅ | ✅ | ❌ |
| `delete:entities` | ✅ | ❌ | ❌ |
| `read:relations` | ✅ | ✅ | ✅ |
| `write:relations` | ✅ | ✅ | ❌ |
| `delete:relations` | ✅ | ❌ | ❌ |
| `read:communities` | ✅ | ✅ | ✅ |
| `write:communities` | ✅ | ✅ | ❌ |
| `read:vectors` | ✅ | ✅ | ✅ |
| `write:vectors` | ✅ | ✅ | ❌ |
| `admin:backup` | ✅ | ❌ | ❌ |
| `admin:restore` | ✅ | ❌ | ❌ |
| `admin:config` | ✅ | ❌ | ❌ |

## APIキーの使用

### リクエストヘッダー

```bash
curl -H "Authorization: Bearer ykg_your_api_key" \
  http://localhost:3000/api/entities
```

### MCP クライアント設定

Claude Desktopの設定ファイル:

```json
{
  "mcpServers": {
    "yagokoro": {
      "command": "node",
      "args": ["/path/to/yagokoro/apps/yagokoro/dist/mcp-server.js"],
      "env": {
        "MCP_API_KEY": "ykg_your_api_key"
      }
    }
  }
}
```

## プログラムでの使用

### APIキー認証サービス

```typescript
import {
  createApiKeyAuth,
  createInMemoryApiKeyStore,
} from '@yagokoro/mcp';

// インメモリストアを作成
const store = createInMemoryApiKeyStore();

// 認証サービスを作成
const auth = createApiKeyAuth(store);

// APIキーを作成
const { rawKey } = await auth.createApiKey('My App', 'reader');
console.log('Your API key:', rawKey);

// 認証
const result = await auth.authenticate(rawKey);
if (result.success) {
  console.log('認証成功:', result.apiKey);
}

// 認可
const authz = auth.authorize(result.apiKey!, 'read:entities');
if (authz.allowed) {
  // エンティティ読み取りを許可
}
```

### RBACミドルウェア

```typescript
import {
  createRBACMiddleware,
  createApiKeyAuth,
  createInMemoryApiKeyStore,
  createAllowAllMiddleware,
} from '@yagokoro/mcp';

// 認証有効
const auth = createApiKeyAuth(createInMemoryApiKeyStore());
const middleware = createRBACMiddleware(auth, {
  enabled: true,
  publicOperations: ['health_check', 'version'],
});

// 認証無効（開発用）
const devMiddleware = createAllowAllMiddleware();

// リクエストチェック
const context = {
  apiKey: 'ykg_xxx',
  operation: 'write',
  resource: 'entity',
};

const result = await middleware.checkAccess(context);
if (!result.allowed) {
  console.error('Access denied:', result.reason);
}
```

## 環境変数での設定

```env
# 認証を有効化
MCP_AUTH_ENABLED=true

# デフォルトAPIキー
MCP_API_KEY=ykg_default_key

# APIキー設定（JSON形式）
MCP_API_KEYS='[
  {"key": "ykg_admin_xxx", "name": "Admin", "role": "admin"},
  {"key": "ykg_reader_yyy", "name": "Reader", "role": "reader"}
]'

# 公開操作（カンマ区切り）
MCP_PUBLIC_OPERATIONS=health_check,version
```

## セキュリティベストプラクティス

### 1. APIキーの管理

- APIキーは環境変数またはシークレット管理サービスで管理
- 本番環境ではハードコードしない
- 定期的にローテーション

### 2. 最小権限の原則

- 必要最小限のロールを付与
- `admin`ロールは慎重に

### 3. 公開操作の制限

- 認証不要の操作は最小限に
- ヘルスチェック以外は認証必須を推奨

### 4. ログと監査

```typescript
// 認証イベントのログ
auth.authenticate(apiKey).then(result => {
  if (!result.success) {
    logger.warn('Authentication failed', {
      error: result.error,
      keyPrefix: apiKey.substring(0, 8),
    });
  }
});
```

## トラブルシューティング

### 認証エラー

| エラー | 原因 | 対処 |
|-------|------|------|
| `API key is required` | キー未指定 | ヘッダーにAPIキーを追加 |
| `Invalid API key` | キーが不正 | 正しいキーを使用 |
| `API key has expired` | キー期限切れ | 新しいキーを発行 |
| `Missing required permission` | 権限不足 | 適切なロールを付与 |

### デバッグモード

```typescript
const middleware = createRBACMiddleware(auth, {
  enabled: true,
});

// 認証状態を確認
console.log('Auth enabled:', middleware.isEnabled());

// パーミッションマッピングを確認
console.log(
  'Permission:',
  middleware.mapOperationToPermission('write', 'entity')
);
```

## 次のステップ

- [MCPセットアップガイド](mcp-setup.md)
- [CLIリファレンス](../api/cli-reference.md)
