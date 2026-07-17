import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role, User } from '@prisma/client';
import { prisma } from '../lib/prisma';

// ─── Constants ────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 10;
const JWT_EXPIRY = '1d';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

// ─── Token payload shape ──────────────────────────────────────────────────────

interface JwtPayload {
  userId: string;
  role: Role;
}

// ─── register ─────────────────────────────────────────────────────────────────

/**
 * Creates a new User record with a bcrypt-hashed password.
 * Throws if the email is already registered (Prisma unique constraint → P2002).
 *
 * Req 8.5: the returned User.id is recorded on every subsequent action.
 */
export async function register(
  email: string,
  password: string,
  role: Role,
): Promise<User> {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  return prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
    },
  });
}

// ─── login ────────────────────────────────────────────────────────────────────

/**
 * Validates credentials and returns a signed JWT plus public user info.
 * Throws a 401-style error when credentials are invalid.
 *
 * Req 8.5: the token carries the authenticated user's identifier so it can be
 * recorded on every check-in, check-out, and discrepancy-resolution action.
 */
export async function login(
  email: string,
  password: string,
): Promise<{ token: string; user: { id: string; email: string; role: Role } }> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const err = new Error('Invalid email or password');
    (err as NodeJS.ErrnoException).code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    const err = new Error('Invalid email or password');
    (err as NodeJS.ErrnoException).code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const payload: JwtPayload = { userId: user.id, role: user.role };
  const token = jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRY });

  return {
    token,
    user: { id: user.id, email: user.email, role: user.role },
  };
}

// ─── verifyToken ──────────────────────────────────────────────────────────────

/**
 * Verifies and decodes a JWT.
 * Throws a 401-style error when the token is invalid, expired, or tampered with.
 */
export function verifyToken(token: string): { userId: string; role: Role } {
  let decoded: JwtPayload;

  try {
    decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
  } catch {
    const err = new Error('Invalid or expired token');
    (err as NodeJS.ErrnoException).code = 'UNAUTHORIZED';
    throw err;
  }

  return { userId: decoded.userId, role: decoded.role };
}
