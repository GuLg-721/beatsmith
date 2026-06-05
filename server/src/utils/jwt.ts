import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'beatsmith-dev-secret-change-in-production'
const JWT_EXPIRES = '7d'

export function signToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES })
}

export function verifyToken(token: string): { userId: number } {
  return jwt.verify(token, JWT_SECRET) as { userId: number }
}
