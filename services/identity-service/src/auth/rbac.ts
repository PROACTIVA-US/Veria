import { z } from 'zod';

export enum Role {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  COMPLIANCE_OFFICER = 'compliance_officer',
  INVESTOR = 'investor',
  INSTITUTION = 'institution',
  ISSUER = 'issuer',
  VIEWER = 'viewer'
}

export enum Permission {
  // User management
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  
  // Organization management
  ORG_CREATE = 'org:create',
  ORG_READ = 'org:read',
  ORG_UPDATE = 'org:update',
  ORG_DELETE = 'org:delete',
  
  // Policy management
  POLICY_CREATE = 'policy:create',
  POLICY_READ = 'policy:read',
  POLICY_UPDATE = 'policy:update',
  POLICY_DELETE = 'policy:delete',
  
  // Compliance
  COMPLIANCE_REVIEW = 'compliance:review',
  COMPLIANCE_APPROVE = 'compliance:approve',
  COMPLIANCE_REJECT = 'compliance:reject',
  COMPLIANCE_OVERRIDE = 'compliance:override',
  
  // KYC/AML
  KYC_REVIEW = 'kyc:review',
  KYC_APPROVE = 'kyc:approve',
  KYC_REJECT = 'kyc:reject',
  KYC_UPDATE = 'kyc:update',
  
  // Transactions
  TRANSACTION_CREATE = 'transaction:create',
  TRANSACTION_READ = 'transaction:read',
  TRANSACTION_APPROVE = 'transaction:approve',
  TRANSACTION_CANCEL = 'transaction:cancel',
  
  // Audit
  AUDIT_READ = 'audit:read',
  AUDIT_EXPORT = 'audit:export',
  
  // System
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_MONITOR = 'system:monitor',
  SYSTEM_BACKUP = 'system:backup'
}

export const RolePermissions: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission), // All permissions
  
  [Role.ADMIN]: [
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.ORG_CREATE,
    Permission.ORG_READ,
    Permission.ORG_UPDATE,
    Permission.POLICY_CREATE,
    Permission.POLICY_READ,
    Permission.POLICY_UPDATE,
    Permission.POLICY_DELETE,
    Permission.COMPLIANCE_REVIEW,
    Permission.KYC_REVIEW,
    Permission.TRANSACTION_READ,
    Permission.AUDIT_READ,
    Permission.SYSTEM_MONITOR
  ],
  
  [Role.COMPLIANCE_OFFICER]: [
    Permission.USER_READ,
    Permission.ORG_READ,
    Permission.POLICY_READ,
    Permission.COMPLIANCE_REVIEW,
    Permission.COMPLIANCE_APPROVE,
    Permission.COMPLIANCE_REJECT,
    Permission.KYC_REVIEW,
    Permission.KYC_APPROVE,
    Permission.KYC_REJECT,
    Permission.KYC_UPDATE,
    Permission.TRANSACTION_READ,
    Permission.AUDIT_READ,
    Permission.AUDIT_EXPORT
  ],
  
  [Role.INVESTOR]: [
    Permission.USER_READ, // Own profile only
    Permission.USER_UPDATE, // Own profile only
    Permission.ORG_READ, // Own organization only
    Permission.TRANSACTION_CREATE,
    Permission.TRANSACTION_READ, // Own transactions only
    Permission.TRANSACTION_CANCEL // Own pending transactions only
  ],
  
  [Role.INSTITUTION]: [
    Permission.USER_READ, // Organization users
    Permission.USER_CREATE, // Create sub-users
    Permission.USER_UPDATE, // Update organization users
    Permission.ORG_READ, // Own organization
    Permission.ORG_UPDATE, // Own organization
    Permission.TRANSACTION_CREATE,
    Permission.TRANSACTION_READ, // Organization transactions
    Permission.TRANSACTION_APPROVE, // Approve sub-user transactions
    Permission.AUDIT_READ // Organization audit logs
  ],
  
  [Role.ISSUER]: [
    Permission.USER_READ,
    Permission.ORG_READ, // Own organization
    Permission.ORG_UPDATE, // Own organization
    Permission.POLICY_CREATE,
    Permission.POLICY_READ,
    Permission.POLICY_UPDATE,
    Permission.TRANSACTION_READ, // Related transactions
    Permission.AUDIT_READ // Related audit logs
  ],
  
  [Role.VIEWER]: [
    Permission.USER_READ, // Limited access
    Permission.ORG_READ, // Limited access
    Permission.POLICY_READ,
    Permission.TRANSACTION_READ // Limited access
  ]
};

export class RBAC {
  static hasPermission(roles: Role[], permission: Permission): boolean {
    for (const role of roles) {
      const permissions = RolePermissions[role];
      if (permissions && permissions.includes(permission)) {
        return true;
      }
    }
    return false;
  }
  
  static hasAnyPermission(roles: Role[], permissions: Permission[]): boolean {
    for (const permission of permissions) {
      if (this.hasPermission(roles, permission)) {
        return true;
      }
    }
    return false;
  }
  
  static hasAllPermissions(roles: Role[], permissions: Permission[]): boolean {
    for (const permission of permissions) {
      if (!this.hasPermission(roles, permission)) {
        return false;
      }
    }
    return true;
  }
  
  static getRolePermissions(role: Role): Permission[] {
    return RolePermissions[role] || [];
  }
  
  static getAllPermissions(roles: Role[]): Permission[] {
    const allPermissions = new Set<Permission>();
    for (const role of roles) {
      const permissions = RolePermissions[role] || [];
      permissions.forEach(p => allPermissions.add(p));
    }
    return Array.from(allPermissions);
  }
  
  static isValidRole(role: string): role is Role {
    return Object.values(Role).includes(role as Role);
  }
  
  static isValidPermission(permission: string): permission is Permission {
    return Object.values(Permission).includes(permission as Permission);
  }
}

// Middleware helper
export function requirePermission(permission: Permission | Permission[]) {
  return async (request: any, reply: any) => {
    const user = request.user; // Assumes user is attached by auth middleware
    
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    
    const permissions = Array.isArray(permission) ? permission : [permission];
    const userRoles = user.roles.map((r: string) => r as Role);
    
    if (!RBAC.hasAnyPermission(userRoles, permissions)) {
      return reply.status(403).send({ 
        error: 'Forbidden',
        message: 'Insufficient permissions',
        required: permissions
      });
    }
  };
}

// Role assignment schema
export const RoleAssignmentSchema = z.object({
  userId: z.string().uuid(),
  roles: z.array(z.enum(Object.values(Role) as [Role, ...Role[]]))
});

export type RoleAssignment = z.infer<typeof RoleAssignmentSchema>;