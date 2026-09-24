import jwt from "jsonwebtoken";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is missing. Set it in backend/.env.");
  }
  return secret;
}

export function signToken(payload) {
  return jwt.sign(payload, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
}

export function verifyToken(token) {
  return jwt.verify(token, getSecret());
}