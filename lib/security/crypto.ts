import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

// Environment variables for encryption
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const ALGORITHM = 'aes-256-gcm';

// Ensure encryption key is properly formatted
function getEncryptionKey(): Buffer {
  if (ENCRYPTION_KEY.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 characters (32 bytes) long');
  }
  return Buffer.from(ENCRYPTION_KEY, 'hex');
}

// Encryption utilities
export class CryptoUtils {
  // Encrypt sensitive data
  static encrypt(text: string): string {
    try {
      const key = getEncryptionKey();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(ALGORITHM, key);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Combine iv, authTag, and encrypted data
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }
  
  // Decrypt sensitive data
  static decrypt(encryptedData: string): string {
    try {
      const key = getEncryptionKey();
      const parts = encryptedData.split(':');
      
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const decipher = crypto.createDecipher(ALGORITHM, key);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }
  
  // Hash passwords
  static async hashPassword(password: string): Promise<string> {
    try {
      const saltRounds = 12;
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      console.error('Password hashing failed:', error);
      throw new Error('Failed to hash password');
    }
  }
  
  // Verify passwords
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      console.error('Password verification failed:', error);
      return false;
    }
  }
  
  // Generate secure random tokens
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
  
  // Generate API keys
  static generateApiKey(): string {
    const prefix = 'bali_';
    const randomPart = crypto.randomBytes(24).toString('base64url');
    return prefix + randomPart;
  }
  
  // Hash API keys for storage
  static hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }
  
  // Generate CSRF tokens
  static generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }
  
  // Verify CSRF tokens
  static verifyCSRFToken(token: string, storedToken: string): boolean {
    if (!token || !storedToken) return false;
    return crypto.timingSafeEqual(
      Buffer.from(token, 'base64url'),
      Buffer.from(storedToken, 'base64url')
    );
  }
}

// JWT utilities for secure tokens
export class JWTUtils {
  private static getSecret(): Uint8Array {
    return new TextEncoder().encode(JWT_SECRET);
  }
  
  // Create JWT tokens
  static async createToken(
    payload: Record<string, any>,
    expiresIn: string = '1h'
  ): Promise<string> {
    try {
      const secret = this.getSecret();
      
      return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .setIssuer('balidmc')
        .setAudience('balidmc-users')
        .sign(secret);
    } catch (error) {
      console.error('JWT creation failed:', error);
      throw new Error('Failed to create token');
    }
  }
  
  // Verify JWT tokens
  static async verifyToken(token: string): Promise<any> {
    try {
      const secret = this.getSecret();
      
      const { payload } = await jwtVerify(token, secret, {
        issuer: 'balidmc',
        audience: 'balidmc-users'
      });
      
      return payload;
    } catch (error) {
      console.error('JWT verification failed:', error);
      throw new Error('Invalid or expired token');
    }
  }
  
  // Create refresh tokens
  static async createRefreshToken(userId: string): Promise<string> {
    return this.createToken(
      { userId, type: 'refresh' },
      '30d'
    );
  }
  
  // Create access tokens
  static async createAccessToken(
    userId: string,
    permissions: string[] = []
  ): Promise<string> {
    return this.createToken(
      { userId, permissions, type: 'access' },
      '15m'
    );
  }
  
  // Create password reset tokens
  static async createPasswordResetToken(userId: string): Promise<string> {
    return this.createToken(
      { userId, type: 'password_reset' },
      '1h'
    );
  }
  
  // Create email verification tokens
  static async createEmailVerificationToken(email: string): Promise<string> {
    return this.createToken(
      { email, type: 'email_verification' },
      '24h'
    );
  }
}

// Secure data masking for logging
export class DataMasking {
  // Mask email addresses
  static maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***';
    
    const [username, domain] = email.split('@');
    const maskedUsername = username.length > 2 
      ? username.substring(0, 2) + '*'.repeat(username.length - 2)
      : '*'.repeat(username.length);
    
    return `${maskedUsername}@${domain}`;
  }
  
  // Mask phone numbers
  static maskPhone(phone: string): string {
    if (!phone) return '***';
    
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 4) return '*'.repeat(cleaned.length);
    
    const lastFour = cleaned.slice(-4);
    const masked = '*'.repeat(cleaned.length - 4);
    
    return masked + lastFour;
  }
  
  // Mask credit card numbers
  static maskCreditCard(cardNumber: string): string {
    if (!cardNumber) return '***';
    
    const cleaned = cardNumber.replace(/\D/g, '');
    if (cleaned.length < 4) return '*'.repeat(cleaned.length);
    
    const lastFour = cleaned.slice(-4);
    const masked = '*'.repeat(cleaned.length - 4);
    
    return masked + lastFour;
  }
  
  // Mask sensitive object properties
  static maskSensitiveData(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'creditCard',
      'ssn', 'socialSecurityNumber', 'bankAccount'
    ];
    
    const masked = { ...obj };
    
    for (const [key, value] of Object.entries(masked)) {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        masked[key] = '***';
      } else if (lowerKey.includes('email') && typeof value === 'string') {
        masked[key] = this.maskEmail(value);
      } else if (lowerKey.includes('phone') && typeof value === 'string') {
        masked[key] = this.maskPhone(value);
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = this.maskSensitiveData(value);
      }
    }
    
    return masked;
  }
}

// Secure random generators
export class SecureRandom {
  // Generate secure passwords
  static generatePassword(
    length: number = 16,
    options: {
      includeUppercase?: boolean;
      includeLowercase?: boolean;
      includeNumbers?: boolean;
      includeSymbols?: boolean;
    } = {}
  ): string {
    const {
      includeUppercase = true,
      includeLowercase = true,
      includeNumbers = true,
      includeSymbols = true
    } = options;
    
    let charset = '';
    if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (includeNumbers) charset += '0123456789';
    if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    if (!charset) {
      throw new Error('At least one character type must be included');
    }
    
    let password = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }
  
  // Generate secure PINs
  static generatePIN(length: number = 6): string {
    let pin = '';
    for (let i = 0; i < length; i++) {
      pin += crypto.randomInt(0, 10).toString();
    }
    return pin;
  }
  
  // Generate secure session IDs
  static generateSessionId(): string {
    return crypto.randomBytes(32).toString('base64url');
  }
  
  // Generate secure file names
  static generateSecureFileName(originalName: string): string {
    const extension = originalName.split('.').pop() || '';
    const randomName = crypto.randomBytes(16).toString('hex');
    return extension ? `${randomName}.${extension}` : randomName;
  }
}

// Key derivation functions
export class KeyDerivation {
  // Derive keys using PBKDF2
  static async deriveKey(
    password: string,
    salt: string,
    iterations: number = 100000,
    keyLength: number = 32
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, iterations, keyLength, 'sha256', (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
  }
  
  // Generate salt for key derivation
  static generateSalt(length: number = 16): string {
    return crypto.randomBytes(length).toString('hex');
  }
  
  // Create HMAC signatures
  static createHMAC(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }
  
  // Verify HMAC signatures
  static verifyHMAC(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.createHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
}

// Secure storage utilities
export class SecureStorage {
  // Encrypt data for storage
  static encryptForStorage(data: any): string {
    const jsonString = JSON.stringify(data);
    return CryptoUtils.encrypt(jsonString);
  }
  
  // Decrypt data from storage
  static decryptFromStorage(encryptedData: string): any {
    const jsonString = CryptoUtils.decrypt(encryptedData);
    return JSON.parse(jsonString);
  }
  
  // Create secure backup of sensitive data
  static createSecureBackup(data: any, backupKey?: string): {
    encryptedData: string;
    checksum: string;
    timestamp: string;
  } {
    const key = backupKey || CryptoUtils.generateSecureToken();
    const jsonString = JSON.stringify(data);
    const encryptedData = CryptoUtils.encrypt(jsonString);
    const checksum = crypto.createHash('sha256').update(jsonString).digest('hex');
    
    return {
      encryptedData,
      checksum,
      timestamp: new Date().toISOString()
    };
  }
  
  // Verify and restore secure backup
  static restoreSecureBackup(backup: {
    encryptedData: string;
    checksum: string;
    timestamp: string;
  }): any {
    const jsonString = CryptoUtils.decrypt(backup.encryptedData);
    const calculatedChecksum = crypto.createHash('sha256').update(jsonString).digest('hex');
    
    if (calculatedChecksum !== backup.checksum) {
      throw new Error('Backup integrity check failed');
    }
    
    return JSON.parse(jsonString);
  }
}

// Export all utilities
export const cryptoUtils = {
  CryptoUtils,
  JWTUtils,
  DataMasking,
  SecureRandom,
  KeyDerivation,
  SecureStorage
};

// Default exports for common operations
export const {
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  generateSecureToken,
  generateApiKey,
  hashApiKey
} = CryptoUtils;

export const {
  createToken,
  verifyToken,
  createAccessToken,
  createRefreshToken
} = JWTUtils;

export const {
  maskEmail,
  maskPhone,
  maskSensitiveData
} = DataMasking;