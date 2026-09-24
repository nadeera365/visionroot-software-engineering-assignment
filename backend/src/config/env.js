export function getConfig() {
  const port = Number(process.env.PORT || 5000);
  const jwtSecret = process.env.JWT_SECRET || "";
  const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }
  if (Buffer.byteLength(jwtSecret) < 32 || jwtSecret.startsWith("replace-")) {
    throw new Error("Set JWT_SECRET to a random secret of at least 32 bytes.");
  }
  let url;
  try {
    url = new URL(clientOrigin);
  } catch {
    throw new Error("CLIENT_ORIGIN must be a valid HTTP or HTTPS origin.");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.origin !== clientOrigin) {
    throw new Error("CLIENT_ORIGIN must contain only an origin, without a trailing slash or path.");
  }
  const production = process.env.NODE_ENV === "production";
  if (production && url.protocol !== "https:") {
    throw new Error("CLIENT_ORIGIN must use HTTPS in production.");
  }

  return { port, jwtSecret, clientOrigin, production, apiRateLimit: 300, authRateLimit: 10 };
}
