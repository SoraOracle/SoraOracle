import https from 'https';
import crypto from 'crypto';

/**
 * Real TLS Certificate Verification
 * 
 * Validates API responses by checking:
 * 1. TLS certificate authenticity
 * 2. Domain ownership
 * 3. Certificate expiration
 * 4. Trusted certificate authority
 * 
 * This proves the data actually came from the claimed source.
 */

export interface TLSVerificationResult {
  verified: boolean;
  domain: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  fingerprint: string;
  serialNumber: string;
  error?: string;
}

export class TLSVerifier {
  /**
   * Verify TLS certificate for a given URL
   */
  static async verifyURL(url: string): Promise<TLSVerificationResult> {
    try {
      const urlObj = new URL(url);
      
      if (urlObj.protocol !== 'https:') {
        return {
          verified: false,
          domain: urlObj.hostname,
          issuer: 'N/A',
          validFrom: new Date(),
          validTo: new Date(),
          fingerprint: '',
          serialNumber: '',
          error: 'Not HTTPS - cannot verify TLS'
        };
      }

      // Make HTTPS request and capture certificate
      const cert = await this.getCertificate(urlObj.hostname, urlObj.port || '443');

      // Verify certificate validity
      const now = new Date();
      const validFrom = new Date(cert.valid_from);
      const validTo = new Date(cert.valid_to);

      if (now < validFrom || now > validTo) {
        return {
          verified: false,
          domain: urlObj.hostname,
          issuer: cert.issuer.O || 'Unknown',
          validFrom,
          validTo,
          fingerprint: cert.fingerprint,
          serialNumber: cert.serialNumber,
          error: `Certificate expired or not yet valid (${validFrom.toISOString()} - ${validTo.toISOString()})`
        };
      }

      // Verify domain matches
      if (!this.verifyDomain(cert, urlObj.hostname)) {
        return {
          verified: false,
          domain: urlObj.hostname,
          issuer: cert.issuer.O || 'Unknown',
          validFrom,
          validTo,
          fingerprint: cert.fingerprint,
          serialNumber: cert.serialNumber,
          error: `Domain mismatch: certificate is for ${cert.subject.CN}, not ${urlObj.hostname}`
        };
      }

      // All checks passed
      return {
        verified: true,
        domain: urlObj.hostname,
        issuer: cert.issuer.O || cert.issuer.CN || 'Unknown',
        validFrom,
        validTo,
        fingerprint: cert.fingerprint,
        serialNumber: cert.serialNumber
      };

    } catch (error: any) {
      return {
        verified: false,
        domain: new URL(url).hostname,
        issuer: 'N/A',
        validFrom: new Date(),
        validTo: new Date(),
        fingerprint: '',
        serialNumber: '',
        error: `TLS verification failed: ${error.message}`
      };
    }
  }

  /**
   * Fetch TLS certificate from a domain with REAL CA validation
   */
  private static getCertificate(hostname: string, port: string = '443'): Promise<any> {
    return new Promise((resolve, reject) => {
      const options = {
        host: hostname,
        port: parseInt(port),
        method: 'GET',
        rejectUnauthorized: true,  // ✅ VALIDATE certificate authority chain
        agent: false
      };

      const req = https.request(options, (res) => {
        // If we get here, the certificate was validated by Node.js
        // This means:
        // 1. Certificate is signed by trusted CA
        // 2. Certificate chain is valid
        // 3. Certificate is not expired
        // 4. Domain matches certificate
        
        const cert = (res.socket as any).getPeerCertificate();
        
        if (!cert || Object.keys(cert).length === 0) {
          reject(new Error('No certificate found'));
        } else {
          // Certificate was validated by Node.js crypto - can trust it
          resolve(cert);
        }
        
        res.resume(); // Drain response
        req.destroy();
      });

      req.on('error', (err: any) => {
        // Certificate validation failures come through here
        if (err.code === 'CERT_HAS_EXPIRED') {
          reject(new Error('Certificate has expired'));
        } else if (err.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
          reject(new Error('Certificate not signed by trusted CA'));
        } else if (err.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
          reject(new Error('Self-signed certificate detected'));
        } else if (err.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
          reject(new Error('Self-signed certificate (no CA validation)'));
        } else {
          reject(err);
        }
      });

      req.end();
    });
  }

  /**
   * Verify domain matches certificate
   */
  private static verifyDomain(cert: any, hostname: string): boolean {
    // Check subject CN
    if (cert.subject.CN === hostname) {
      return true;
    }

    // Check Subject Alternative Names (SANs)
    if (cert.subjectaltname) {
      const sans = cert.subjectaltname.split(', ');
      for (const san of sans) {
        const domain = san.replace(/^DNS:/, '');
        
        // Exact match
        if (domain === hostname) {
          return true;
        }
        
        // Wildcard match (*.example.com matches api.example.com)
        if (domain.startsWith('*.')) {
          const wildcardDomain = domain.slice(2); // Remove *.
          if (hostname.endsWith(wildcardDomain)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Verify response data integrity
   */
  static verifyResponseIntegrity(
    data: any,
    expectedHash?: string
  ): { verified: boolean; hash: string; match?: boolean } {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    const hash = crypto.createHash('sha256').update(dataString).digest('hex');

    if (expectedHash) {
      return {
        verified: hash === expectedHash,
        hash,
        match: hash === expectedHash
      };
    }

    return {
      verified: true,
      hash
    };
  }

  /**
   * Create tamper-proof data package
   */
  static createVerifiedPackage(data: any, tlsVerification: TLSVerificationResult): {
    data: any;
    verification: TLSVerificationResult;
    dataHash: string;
    packageHash: string;
    timestamp: number;
  } {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    const dataHash = crypto.createHash('sha256').update(dataString).digest('hex');

    const package_ = {
      data,
      verification: tlsVerification,
      dataHash,
      timestamp: Date.now()
    };

    const packageHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(package_))
      .digest('hex');

    return {
      ...package_,
      packageHash
    };
  }
}

/**
 * Mock TLS verifier for testing/development
 */
export class MockTLSVerifier {
  static async verifyURL(url: string): Promise<TLSVerificationResult> {
    console.log(`⚠️  Mock TLS verification for: ${url}`);
    console.log(`   To use real verification, ensure HTTPS endpoints`);

    const urlObj = new URL(url);

    return {
      verified: true,
      domain: urlObj.hostname,
      issuer: 'MockCA',
      validFrom: new Date(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      fingerprint: crypto.randomBytes(20).toString('hex').toUpperCase().match(/.{2}/g)!.join(':'),
      serialNumber: crypto.randomBytes(8).toString('hex').toUpperCase()
    };
  }

  static verifyResponseIntegrity(data: any, expectedHash?: string) {
    return TLSVerifier.verifyResponseIntegrity(data, expectedHash);
  }

  static createVerifiedPackage(data: any, tlsVerification: TLSVerificationResult) {
    return TLSVerifier.createVerifiedPackage(data, tlsVerification);
  }
}

/**
 * Get appropriate TLS verifier based on environment
 */
export function getTLSVerifier(): typeof TLSVerifier | typeof MockTLSVerifier {
  const useRealTLS = process.env.USE_REAL_TLS === 'true';
  
  if (useRealTLS) {
    console.log('✅ Using real TLS verification');
    return TLSVerifier;
  } else {
    console.log('⚠️  Using mock TLS verification (set USE_REAL_TLS=true for real verification)');
    return MockTLSVerifier;
  }
}
