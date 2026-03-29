import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export interface DecodedToken {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export function verifyToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    return decoded;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

export function createToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "7d" });
}

export async function verifyUserSession(token?: string): Promise<DecodedToken | null> {
  if (!token) {
    return null;
  }

  return verifyToken(token);
}
