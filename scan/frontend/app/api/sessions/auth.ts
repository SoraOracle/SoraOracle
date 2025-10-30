import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set - cannot start server');
}

export interface JWTPayload {
  address: string;
  exp: number;
}

export function verifyJWT(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded.address?.toLowerCase() || null;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export function validateSessionAccess(authenticatedAddress: string | null, requestedAddress: string): boolean {
  if (!authenticatedAddress) {
    return false;
  }
  return authenticatedAddress === requestedAddress.toLowerCase();
}
