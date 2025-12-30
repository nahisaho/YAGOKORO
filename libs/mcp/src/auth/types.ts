/**
 * Authentication and Authorization Types
 *
 * Provides types for API key authentication and RBAC.
 */

/**
 * User role enumeration
 */
export type UserRole = 'admin' | 'reader' | 'writer';

/**
 * Permission types
 */
export type Permission =
  | 'read:entities'
  | 'write:entities'
  | 'delete:entities'
  | 'read:relations'
  | 'write:relations'
  | 'delete:relations'
  | 'read:communities'
  | 'write:communities'
  | 'read:vectors'
  | 'write:vectors'
  | 'admin:backup'
  | 'admin:restore'
  | 'admin:config';

/**
 * API key information
 */
export interface ApiKeyInfo {
  id: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  createdAt: Date;
  expiresAt?: Date | undefined;
  lastUsedAt?: Date | undefined;
  rateLimit?: number | undefined;
}

/**
 * Authentication result
 */
export interface AuthResult {
  success: boolean;
  apiKey?: ApiKeyInfo | undefined;
  error?: string | undefined;
}

/**
 * Authorization result
 */
export interface AuthzResult {
  allowed: boolean;
  reason?: string | undefined;
}

/**
 * Role-permission mapping
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'read:entities',
    'write:entities',
    'delete:entities',
    'read:relations',
    'write:relations',
    'delete:relations',
    'read:communities',
    'write:communities',
    'read:vectors',
    'write:vectors',
    'admin:backup',
    'admin:restore',
    'admin:config',
  ],
  writer: [
    'read:entities',
    'write:entities',
    'read:relations',
    'write:relations',
    'read:communities',
    'read:vectors',
    'write:vectors',
  ],
  reader: [
    'read:entities',
    'read:relations',
    'read:communities',
    'read:vectors',
  ],
};
