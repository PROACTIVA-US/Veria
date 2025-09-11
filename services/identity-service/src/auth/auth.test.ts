import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { hashPassword, verifyPassword, validatePasswordStrength } from './password.js';
import { RBAC, Role, Permission } from './rbac.js';

describe('Password Security', () => {
  describe('validatePasswordStrength', () => {
    it('should accept strong passwords', () => {
      const result = validatePasswordStrength('MyStr0ng!Pass123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short passwords', () => {
      const result = validatePasswordStrength('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject passwords without uppercase', () => {
      const result = validatePasswordStrength('weak1234!');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('uppercase letter');
    });

    it('should reject passwords without lowercase', () => {
      const result = validatePasswordStrength('WEAK1234!');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('lowercase letter');
    });

    it('should reject passwords without numbers', () => {
      const result = validatePasswordStrength('WeakPass!');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('one number');
    });

    it('should reject passwords without special characters', () => {
      const result = validatePasswordStrength('WeakPass123');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('special character');
    });

    it('should reject common passwords', () => {
      const result = validatePasswordStrength('Password123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is too common or weak');
    });

    it('should reject passwords with spaces', () => {
      const result = validatePasswordStrength('My Pass123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password cannot contain spaces');
    });
  });

  describe('hashPassword and verifyPassword', () => {
    it('should hash and verify correct password', async () => {
      const password = 'MySecure!Pass123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(50);
      expect(hash).not.toBe(password);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'MySecure!Pass123';
      const wrongPassword = 'WrongPass123!';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'MySecure!Pass123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
      
      // Both should still verify correctly
      expect(await verifyPassword(password, hash1)).toBe(true);
      expect(await verifyPassword(password, hash2)).toBe(true);
    });

    it('should reject weak password during hashing', async () => {
      const weakPassword = 'weak';
      
      await expect(hashPassword(weakPassword)).rejects.toThrow('Password validation failed');
    });
  });
});

describe('RBAC System', () => {
  describe('hasPermission', () => {
    it('should grant super_admin all permissions', () => {
      const roles = [Role.SUPER_ADMIN];
      
      expect(RBAC.hasPermission(roles, Permission.USER_CREATE)).toBe(true);
      expect(RBAC.hasPermission(roles, Permission.SYSTEM_CONFIG)).toBe(true);
      expect(RBAC.hasPermission(roles, Permission.COMPLIANCE_OVERRIDE)).toBe(true);
    });

    it('should grant admin appropriate permissions', () => {
      const roles = [Role.ADMIN];
      
      expect(RBAC.hasPermission(roles, Permission.USER_CREATE)).toBe(true);
      expect(RBAC.hasPermission(roles, Permission.USER_DELETE)).toBe(true);
      expect(RBAC.hasPermission(roles, Permission.POLICY_CREATE)).toBe(true);
      expect(RBAC.hasPermission(roles, Permission.SYSTEM_CONFIG)).toBe(false);
    });

    it('should grant compliance_officer compliance permissions', () => {
      const roles = [Role.COMPLIANCE_OFFICER];
      
      expect(RBAC.hasPermission(roles, Permission.COMPLIANCE_REVIEW)).toBe(true);
      expect(RBAC.hasPermission(roles, Permission.KYC_APPROVE)).toBe(true);
      expect(RBAC.hasPermission(roles, Permission.AUDIT_EXPORT)).toBe(true);
      expect(RBAC.hasPermission(roles, Permission.USER_DELETE)).toBe(false);
    });

    it('should limit investor permissions', () => {
      const roles = [Role.INVESTOR];
      
      expect(RBAC.hasPermission(roles, Permission.USER_READ)).toBe(true);
      expect(RBAC.hasPermission(roles, Permission.TRANSACTION_CREATE)).toBe(true);
      expect(RBAC.hasPermission(roles, Permission.USER_DELETE)).toBe(false);
      expect(RBAC.hasPermission(roles, Permission.POLICY_CREATE)).toBe(false);
    });

    it('should combine permissions for multiple roles', () => {
      const roles = [Role.INVESTOR, Role.COMPLIANCE_OFFICER];
      
      // Should have permissions from both roles
      expect(RBAC.hasPermission(roles, Permission.TRANSACTION_CREATE)).toBe(true); // From investor
      expect(RBAC.hasPermission(roles, Permission.COMPLIANCE_REVIEW)).toBe(true); // From compliance
      expect(RBAC.hasPermission(roles, Permission.SYSTEM_CONFIG)).toBe(false); // Neither has this
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if user has any of the required permissions', () => {
      const roles = [Role.ADMIN];
      const permissions = [Permission.SYSTEM_CONFIG, Permission.USER_CREATE, Permission.POLICY_DELETE];
      
      expect(RBAC.hasAnyPermission(roles, permissions)).toBe(true);
    });

    it('should return false if user has none of the required permissions', () => {
      const roles = [Role.INVESTOR];
      const permissions = [Permission.SYSTEM_CONFIG, Permission.COMPLIANCE_OVERRIDE];
      
      expect(RBAC.hasAnyPermission(roles, permissions)).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if user has all required permissions', () => {
      const roles = [Role.ADMIN];
      const permissions = [Permission.USER_CREATE, Permission.USER_DELETE, Permission.POLICY_CREATE];
      
      expect(RBAC.hasAllPermissions(roles, permissions)).toBe(true);
    });

    it('should return false if user lacks any required permission', () => {
      const roles = [Role.ADMIN];
      const permissions = [Permission.USER_CREATE, Permission.SYSTEM_CONFIG];
      
      expect(RBAC.hasAllPermissions(roles, permissions)).toBe(false);
    });
  });

  describe('getRolePermissions', () => {
    it('should return all permissions for a role', () => {
      const permissions = RBAC.getRolePermissions(Role.VIEWER);
      
      expect(permissions).toContain(Permission.USER_READ);
      expect(permissions).toContain(Permission.POLICY_READ);
      expect(permissions).not.toContain(Permission.USER_DELETE);
    });

    it('should return empty array for invalid role', () => {
      const permissions = RBAC.getRolePermissions('invalid_role' as Role);
      
      expect(permissions).toEqual([]);
    });
  });

  describe('getAllPermissions', () => {
    it('should combine permissions from multiple roles without duplicates', () => {
      const roles = [Role.INVESTOR, Role.VIEWER];
      const permissions = RBAC.getAllPermissions(roles);
      
      // Should have unique permissions from both roles
      expect(permissions).toContain(Permission.TRANSACTION_CREATE); // From investor
      expect(permissions).toContain(Permission.POLICY_READ); // From viewer
      
      // Should not have duplicates
      const uniquePermissions = new Set(permissions);
      expect(permissions.length).toBe(uniquePermissions.size);
    });
  });

  describe('isValidRole', () => {
    it('should validate correct roles', () => {
      expect(RBAC.isValidRole('admin')).toBe(true);
      expect(RBAC.isValidRole('investor')).toBe(true);
      expect(RBAC.isValidRole('compliance_officer')).toBe(true);
    });

    it('should reject invalid roles', () => {
      expect(RBAC.isValidRole('invalid_role')).toBe(false);
      expect(RBAC.isValidRole('')).toBe(false);
    });
  });

  describe('isValidPermission', () => {
    it('should validate correct permissions', () => {
      expect(RBAC.isValidPermission('user:create')).toBe(true);
      expect(RBAC.isValidPermission('policy:read')).toBe(true);
      expect(RBAC.isValidPermission('system:config')).toBe(true);
    });

    it('should reject invalid permissions', () => {
      expect(RBAC.isValidPermission('invalid:permission')).toBe(false);
      expect(RBAC.isValidPermission('')).toBe(false);
    });
  });
});