import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export async function hashPassword(password: string): Promise<string> {
  const validation = validatePasswordStrength(password);
  if (!validation.valid) {
    throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
  }
  
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];
  
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }
  
  if (!PASSWORD_REGEX.test(password)) {
    errors.push('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
  }
  
  if (password.includes(' ')) {
    errors.push('Password cannot contain spaces');
  }
  
  // Check for common weak passwords
  const commonPasswords = ['password', '12345678', 'qwerty', 'abc123', 'password123'];
  if (commonPasswords.some(weak => password.toLowerCase().includes(weak))) {
    errors.push('Password is too common or weak');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&';
  let password = '';
  
  // Ensure at least one of each required character type
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  password += '0123456789'[Math.floor(Math.random() * 10)];
  password += '@$!%*?&'[Math.floor(Math.random() * 7)];
  
  // Fill the rest randomly
  for (let i = 4; i < 16; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}