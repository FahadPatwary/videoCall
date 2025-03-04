import CryptoJS from "crypto-js";

/**
 * Encryption utility for end-to-end encrypted video calls
 * Uses AES-256 for encryption and provides methods for key generation and exchange
 */
export class EncryptionService {
  private encryptionKey: string | null = null;

  /**
   * Generate a secure random encryption key
   * @returns A random 256-bit key encoded as a hex string
   */
  generateEncryptionKey(): string {
    // Generate a random 256-bit (32-byte) key
    const keyArray = new Uint8Array(32);
    window.crypto.getRandomValues(keyArray);

    // Convert to hex string
    const key = Array.from(keyArray)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    this.encryptionKey = key;
    return key;
  }

  /**
   * Set the encryption key
   * @param key The encryption key as a hex string
   */
  setEncryptionKey(key: string): void {
    this.encryptionKey = key;
  }

  /**
   * Get the current encryption key
   * @returns The current encryption key
   */
  getEncryptionKey(): string | null {
    return this.encryptionKey;
  }

  /**
   * Encrypt data using AES-256
   * @param data The data to encrypt
   * @returns Encrypted data as a string
   */
  encrypt(data: string): string {
    if (!this.encryptionKey) {
      throw new Error("Encryption key not set");
    }

    return CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
  }

  /**
   * Decrypt data using AES-256
   * @param encryptedData The encrypted data
   * @returns Decrypted data as a string
   */
  decrypt(encryptedData: string): string {
    if (!this.encryptionKey) {
      throw new Error("Encryption key not set");
    }

    const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Generate a key fingerprint for verification
   * @returns A shortened fingerprint of the current key
   */
  getKeyFingerprint(): string {
    if (!this.encryptionKey) {
      throw new Error("Encryption key not set");
    }

    const hash = CryptoJS.SHA256(this.encryptionKey).toString();
    // Return first 8 characters of the hash as a fingerprint
    return hash.substring(0, 8);
  }
}

// Export a singleton instance
export const encryptionService = new EncryptionService();
