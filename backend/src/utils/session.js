import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";

export const COOKIE_NAME = "visionroot_token";
export const TOKEN_SECONDS = 8 * 60 * 60;
export const JWT_OPTIONS = { algorithms: ["HS256"], issuer: "visionroot-api", audience: "visionroot-web" };

export function cookieOptions(config) {
  return { httpOnly: true, secure: config.production, sameSite: "lax", path: "/" };
}

export function setSessionCookie(res, account, config) {
  const token = jwt.sign(
    { role: account.role, tokenVersion: account.tokenVersion },
    config.jwtSecret,
    {
      algorithm: "HS256",
      subject: account._id.toString(),
      issuer: JWT_OPTIONS.issuer,
      audience: JWT_OPTIONS.audience,
      expiresIn: TOKEN_SECONDS,
      jwtid: randomUUID(),
    }
  );
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(config), maxAge: TOKEN_SECONDS * 1000 });
}

export function clearSessionCookie(res, config) {
  res.clearCookie(COOKIE_NAME, cookieOptions(config));
}
