import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { execFile, spawn } from "node:child_process";
import { createServer } from "node:net";
import { promisify } from "node:util";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import createApp from "../src/app.js";
import User from "../src/models/User.js";
import Admin from "../src/models/Admin.js";
import ServiceRequest from "../src/models/ServiceRequest.js";
import { COOKIE_NAME, cookieOptions } from "../src/utils/session.js";

const config = {
  jwtSecret: randomBytes(48).toString("hex"), clientOrigin: "http://localhost:5173",
  production: false, apiRateLimit: 10000, authRateLimit: 10000,
};
const app = createApp(config);
const password = "Test-" + randomUUID();
let database;
let adminCookie;
let adminAccount;
let counter = 0;

function api(method, path, body, cookie, target = app) {
  const call = request(target)[method](path).set("Origin", config.clientOrigin);
  if (cookie) call.set("Cookie", cookie);
  if (method !== "get" && method !== "options") {
    call.set("X-Requested-With", "XMLHttpRequest").set("Content-Type", "application/json").send(body ?? {});
  }
  return call;
}

function responseCookie(response) {
  return response.headers["set-cookie"][0].split(";")[0];
}

async function newUser() {
  const email = "user" + (++counter) + "@example.com";
  const created = await api("post", "/api/auth/register", { name: "Test User", email, password }).expect(201);
  const loggedIn = await api("post", "/api/auth/login", { email, password, accountType: "USER" }).expect(200);
  return { ...created.body.data.account, cookie: responseCookie(loggedIn), email };
}

async function newRequest(cookie, values = {}) {
  const response = await api("post", "/api/requests", {
    title: "A technical issue", description: "Please investigate this service issue.", category: "Technical", ...values,
  }, cookie).expect(201);
  return response.body.data.request;
}

function changeStatus(id, status) {
  return api("patch", "/api/requests/" + id + "/status", { status }, adminCookie);
}

before(async () => {
  // This starts an isolated real MongoDB process; it never uses your .env database.
  database = await MongoMemoryServer.create({
    instance: { dbName: "visionroot_test", args: process.platform === "win32" ? [] : ["--nounixsocket"] },
  });
  await mongoose.connect(database.getUri());
  await Promise.all([User.init(), Admin.init(), ServiceRequest.init()]);
  adminAccount = await Admin.create({ name: "Test Admin", email: "admin@example.com", passwordHash: await bcrypt.hash(password, 12) });
  const login = await api("post", "/api/auth/login", { email: adminAccount.email, password, accountType: "ADMIN" }).expect(200);
  adminCookie = responseCookie(login);
}, { timeout: 180000 });

after(async () => {
  await mongoose.disconnect();
  if (database) await database.stop();
});

test("register stores a bcrypt hash and exposes only public account fields", async () => {
  const user = await newUser();
  const stored = await User.findById(user.id).select("+passwordHash");
  assert.notEqual(stored.passwordHash, password);
  assert.equal(await bcrypt.compare(password, stored.passwordHash), true);
  assert.equal(user.role, "USER");
  const response = await api("get", "/api/auth/me", undefined, user.cookie).expect(200);
  assert.equal(response.body.data.account.id, user.id);
  assert.equal(response.body.data.account.passwordHash, undefined);
  assert.equal(response.body.data.account.tokenVersion, undefined);
  assert.equal(response.body.token, undefined);
  assert.equal(response.headers["cache-control"], "no-store");
});

test("registration rejects role injection, wrong types, weak and oversized UTF-8 passwords", async () => {
  const base = { name: "Test User", email: "invalid@example.com", password };
  for (const change of [
    { role: "ADMIN" }, { isActive: false }, { tokenVersion: 8 }, { passwordHash: "raw" },
    { email: { $ne: null } }, { name: 123 }, { password: "short" }, { password: "අ".repeat(25) },
  ]) {
    const response = await api("post", "/api/auth/register", { ...base, ...change }).expect(400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.stack, undefined);
  }
});

test("the unique email index handles concurrent registrations and case normalization", async () => {
  const responses = await Promise.all([
    api("post", "/api/auth/register", { name: "Duplicate", email: " DUPLICATE@EXAMPLE.COM ", password }),
    api("post", "/api/auth/register", { name: "Duplicate", email: "duplicate@example.com", password }),
  ]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
  assert.equal(await User.countDocuments({ email: "duplicate@example.com" }), 1);
});

test("the login selector chooses a collection without granting an unverified role", async () => {
  const userPassword = "Different-" + randomUUID();
  await api("post", "/api/auth/register", { name: "Same Email User", email: adminAccount.email, password: userPassword }).expect(201);
  await api("post", "/api/auth/login", { email: adminAccount.email, password: userPassword, accountType: "ADMIN" }).expect(401);
  const normal = await api("post", "/api/auth/login", { email: adminAccount.email, password: userPassword, accountType: "USER" }).expect(200);
  assert.equal(normal.body.data.account.role, "USER");
  const admin = await api("get", "/api/auth/me", undefined, adminCookie).expect(200);
  assert.equal(admin.body.data.account.role, "ADMIN");
  assert.equal(admin.body.data.account.email, adminAccount.email);
});

test("login failures are generic and cookies are HttpOnly with SameSite protection", async () => {
  const user = await newUser();
  const badPassword = await api("post", "/api/auth/login", { email: user.email, password: "Wrong-password", accountType: "USER" }).expect(401);
  const unknown = await api("post", "/api/auth/login", { email: "nobody@example.com", password, accountType: "USER" }).expect(401);
  assert.equal(badPassword.body.message, unknown.body.message);
  const login = await api("post", "/api/auth/login", { email: user.email, password, accountType: "USER" }).expect(200);
  assert.match(login.headers["set-cookie"][0], /HttpOnly/);
  assert.match(login.headers["set-cookie"][0], /SameSite=Lax/);
  assert.equal(cookieOptions({ production: true }).secure, true);
});

test("private routes reject missing, modified, expired and wrong-audience tokens", async () => {
  await api("get", "/api/requests").expect(401);
  await api("get", "/api/auth/me", undefined, COOKIE_NAME + "=invalid").expect(401);
  const user = await newUser();
  const token = user.cookie.slice(user.cookie.indexOf("=") + 1);
  const parts = token.split(".");
  const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  parts[1] = Buffer.from(JSON.stringify({ ...claims, role: "ADMIN" })).toString("base64url");
  await api("get", "/api/auth/me", undefined, COOKIE_NAME + "=" + parts.join(".")).expect(401);
  for (const options of [{ expiresIn: -1, audience: "visionroot-web" }, { expiresIn: 60, audience: "wrong-app" }]) {
    const bad = jwt.sign({ role: "USER", tokenVersion: 0 }, config.jwtSecret, {
      subject: user.id, issuer: "visionroot-api", ...options,
    });
    await api("get", "/api/auth/me", undefined, COOKIE_NAME + "=" + bad).expect(401);
  }
  await api("get", "/api/users", undefined, user.cookie).expect(403);
});

test("logout invalidates copied tokens and every existing login for that account", async () => {
  const user = await newUser();
  const second = await api("post", "/api/auth/login", { email: user.email, password, accountType: "USER" }).expect(200);
  const loggedOut = await api("post", "/api/auth/logout", {}, user.cookie).expect(200);
  assert.match(loggedOut.headers["set-cookie"][0], /Expires=Thu, 01 Jan 1970/);
  await api("get", "/api/auth/me", undefined, user.cookie).expect(401);
  await api("get", "/api/auth/me", undefined, responseCookie(second)).expect(401);
  const again = await api("post", "/api/auth/login", { email: user.email, password, accountType: "USER" }).expect(200);
  await api("get", "/api/auth/me", undefined, responseCookie(again)).expect(200);
});

test("user creation and request updates cannot assign owner or status from the client", async () => {
  const user = await newUser();
  const item = await newRequest(user.cookie);
  assert.equal(item.createdBy, user.id);
  assert.equal(item.status, "PENDING");
  assert.equal(item.priority, "MEDIUM");
  assert.ok(item.createdAt && item.updatedAt);
  await api("post", "/api/requests", {
    title: "Forged request", description: "This should never be saved.", category: "Other", status: "RESOLVED",
  }, user.cookie).expect(400);
  await api("patch", "/api/requests/" + item._id, { createdBy: adminAccount.id }, user.cookie).expect(400);
  await api("patch", "/api/requests/" + item._id, { status: "RESOLVED" }, user.cookie).expect(400);
  await api("post", "/api/requests", {}, adminCookie).expect(403);
});

test("users can list and access only their own requests, including edits and cancellations", async () => {
  const owner = await newUser();
  const outsider = await newUser();
  const item = await newRequest(owner.cookie);
  const list = await api("get", "/api/requests", undefined, outsider.cookie).expect(200);
  assert.deepEqual(list.body.data.requests, []);
  for (const method of ["get", "patch", "delete"]) {
    await api(method, "/api/requests/" + item._id, method === "patch" ? { title: "Stolen update" } : {}, outsider.cookie).expect(404);
  }
  const own = await api("get", "/api/requests/" + item._id, undefined, owner.cookie).expect(200);
  assert.equal(own.body.data.request.createdBy._id, owner.id);
  await api("get", "/api/requests/" + item._id, undefined, adminCookie).expect(200);
});

test("only owners can edit pending content and only admins can progress or resolve requests", async () => {
  const user = await newUser();
  const item = await newRequest(user.cookie);
  await api("patch", "/api/requests/" + item._id, { title: "Updated title" }, user.cookie).expect(200);
  await api("patch", "/api/requests/" + item._id, { title: "Admin edit" }, adminCookie).expect(403);
  await api("patch", "/api/requests/" + item._id + "/status", { status: "IN_PROGRESS" }, user.cookie).expect(403);
  await changeStatus(item._id, "RESOLVED").expect(409);
  await changeStatus(item._id, "IN_PROGRESS").expect(200);
  await api("patch", "/api/requests/" + item._id, { title: "Late edit" }, user.cookie).expect(409);
  await changeStatus(item._id, "RESOLVED").expect(200);
  for (const status of ["PENDING", "IN_PROGRESS", "CANCELLED", "RESOLVED"]) await changeStatus(item._id, status).expect(409);
  await api("delete", "/api/requests/" + item._id, {}, user.cookie).expect(409);
});

test("owners and admins can cancel eligible requests; cancelled records remain and cannot reopen", async () => {
  const user = await newUser();
  for (const progressed of [false, true]) {
    for (const actor of ["USER", "ADMIN"]) {
      const item = await newRequest(user.cookie);
      if (progressed) await changeStatus(item._id, "IN_PROGRESS").expect(200);
      const cancelled = actor === "USER"
        ? await api("delete", "/api/requests/" + item._id, {}, user.cookie).expect(200)
        : await changeStatus(item._id, "CANCELLED").expect(200);
      assert.equal(cancelled.body.data.request.status, "CANCELLED");
      await api("get", "/api/requests/" + item._id, undefined, user.cookie).expect(200);
      await changeStatus(item._id, "IN_PROGRESS").expect(409);
      await api("patch", "/api/requests/" + item._id, { title: "Too late" }, user.cookie).expect(409);
    }
  }
});

test("admin keyword search, combined filters, date sorting and pagination use real database queries", async () => {
  const user = await newUser();
  const a = await newRequest(user.cookie, { title: "Quartzledger payment one", category: "Billing", priority: "HIGH" });
  const b = await newRequest(user.cookie, { title: "Quartzledger payment two", category: "Billing", priority: "HIGH" });
  const c = await newRequest(user.cookie, { title: "A different title", description: "Quartzledger appears only in this description.", priority: "LOW" });
  await changeStatus(a._id, "IN_PROGRESS").expect(200);
  const filtered = await api("get", "/api/requests?search=quartzledger&category=Billing&priority=HIGH&status=PENDING", undefined, adminCookie).expect(200);
  assert.deepEqual(filtered.body.data.requests.map((r) => r._id), [b._id]);
  const newest = await api("get", "/api/requests?search=quartzledger&limit=1&page=1&sort=newest", undefined, adminCookie).expect(200);
  assert.equal(newest.body.data.requests[0]._id, c._id);
  assert.deepEqual(newest.body.pagination, { page: 1, limit: 1, total: 3, totalPages: 3, hasNextPage: true, hasPreviousPage: false });
  const oldest = await api("get", "/api/requests?search=quartzledger&limit=1&page=1&sort=oldest", undefined, adminCookie).expect(200);
  assert.equal(oldest.body.data.requests[0]._id, a._id);
  const last = await api("get", "/api/requests?search=quartzledger&limit=1&page=3", undefined, adminCookie).expect(200);
  assert.equal(last.body.pagination.hasNextPage, false);
  assert.equal(last.body.pagination.hasPreviousPage, true);
});

test("admin deactivation blocks current tokens and login; reactivation still requires a fresh login", async () => {
  const user = await newUser();
  const item = await newRequest(user.cookie);
  const path = "/api/users/" + user.id + "/status";
  await api("patch", path, { isActive: false }, user.cookie).expect(403);
  await api("patch", path, { isActive: false }, adminCookie).expect(200);
  await api("get", "/api/auth/me", undefined, user.cookie).expect(401);
  await api("post", "/api/auth/login", { email: user.email, password, accountType: "USER" }).expect(401);
  await api("patch", path, { isActive: true }, adminCookie).expect(200);
  await api("get", "/api/auth/me", undefined, user.cookie).expect(401);
  const login = await api("post", "/api/auth/login", { email: user.email, password, accountType: "USER" }).expect(200);
  await api("get", "/api/requests/" + item._id, undefined, responseCookie(login)).expect(200);
  const list = await api("get", "/api/users?search=" + user.email + "&isActive=true&limit=1", undefined, adminCookie).expect(200);
  assert.equal(list.body.pagination.total, 1);
  assert.equal(list.body.data.users[0].passwordHash, undefined);
  await api("get", "/api/users/" + user.id, undefined, adminCookie).expect(200);
  await api("patch", path, { isActive: "false" }, adminCookie).expect(400);
});

test("invalid IDs, missing resources and invalid query input produce safe errors", async () => {
  const user = await newUser();
  await api("get", "/api/requests/not-an-id", undefined, user.cookie).expect(400);
  await api("get", "/api/requests/" + new mongoose.Types.ObjectId(), undefined, user.cookie).expect(404);
  for (const query of ["page=0", "page=abc", "limit=101", "sort=passwordHash", "status[$ne]=PENDING", "status=PENDING&status=RESOLVED", "category=Unknown"]) {
    const response = await api("get", "/api/requests?" + query, undefined, user.cookie).expect(400);
    assert.equal(response.body.stack, undefined);
  }
  await api("get", "/api/users/not-an-id", undefined, adminCookie).expect(400);
  await api("get", "/api/users/" + new mongoose.Types.ObjectId(), undefined, adminCookie).expect(404);
});

test("cookie writes require the custom header, JSON and an allowed browser origin", async () => {
  const user = await newUser();
  await request(app).post("/api/auth/logout").set("Cookie", user.cookie).send({}).expect(403);
  await request(app).post("/api/auth/logout").set("Cookie", user.cookie)
    .set("Origin", "https://attacker.example").set("X-Requested-With", "XMLHttpRequest").send({}).expect(403);
  await request(app).post("/api/auth/logout").set("Cookie", user.cookie)
    .set("Origin", "null").set("X-Requested-With", "XMLHttpRequest").send({}).expect(403);
  await request(app).post("/api/auth/logout").set("Cookie", user.cookie)
    .set("X-Requested-With", "XMLHttpRequest").set("Content-Type", "text/plain").send("{}").expect(415);
  const preflight = await request(app).options("/api/auth/login").set("Origin", config.clientOrigin)
    .set("Access-Control-Request-Method", "POST").set("Access-Control-Request-Headers", "content-type,x-requested-with").expect(204);
  assert.equal(preflight.headers["access-control-allow-origin"], config.clientOrigin);
  assert.equal(preflight.headers["access-control-allow-credentials"], "true");
  await request(app).post("/api/auth/logout").set("Cookie", user.cookie)
    .set("X-Requested-With", "XMLHttpRequest").send({}).expect(200);
});

test("malformed JSON, large bodies and unknown paths return consistent JSON errors", async () => {
  await request(app).post("/api/auth/register").set("X-Requested-With", "XMLHttpRequest")
    .set("Content-Type", "application/json").send("{bad-json").expect(400);
  await api("post", "/api/auth/register", { name: "a".repeat(20000) }).expect(413);
  const unknown = await api("get", "/api/unknown").expect(404);
  assert.equal(unknown.body.success, false);
  const health = await api("get", "/api/health").expect(200);
  assert.equal(health.headers["x-powered-by"], undefined);
  assert.equal(health.headers["x-content-type-options"], "nosniff");
});

test("auth and general rate limits return 429 with JSON and retry information", async () => {
  const limited = createApp({ ...config, authRateLimit: 2 });
  const invalid = { email: "missing@example.com", password, accountType: "USER" };
  await api("post", "/api/auth/login", invalid, undefined, limited).expect(401);
  await api("post", "/api/auth/login", invalid, undefined, limited).expect(401);
  const blocked = await api("post", "/api/auth/login", invalid, undefined, limited).expect(429);
  assert.equal(blocked.body.success, false);
  assert.ok(blocked.headers["retry-after"]);
  const general = createApp({ ...config, apiRateLimit: 2 });
  await api("get", "/api/health", undefined, undefined, general).expect(200);
  await api("get", "/api/health", undefined, undefined, general).expect(200);
  await api("get", "/api/health", undefined, undefined, general).expect(429);
});

test("concurrent resolve and cancel actions cannot both succeed", { timeout: 10000 }, async () => {
  const user = await newUser();
  const item = await newRequest(user.cookie);
  await changeStatus(item._id, "IN_PROGRESS").expect(200);
  const original = ServiceRequest.findOneAndUpdate;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let waiting = 0;
  // Delay only the two writes, allowing both API handlers to read IN_PROGRESS.
  ServiceRequest.findOneAndUpdate = async function (...args) {
    waiting += 1;
    if (waiting === 2) release();
    await gate;
    return original.apply(this, args);
  };
  try {
    const results = await Promise.all([
      changeStatus(item._id, "RESOLVED"), api("delete", "/api/requests/" + item._id, {}, user.cookie),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  } finally {
    ServiceRequest.findOneAndUpdate = original;
  }
});

test("admin seeding creates a hashed account and repeat runs do not reset its password", async () => {
  const execute = promisify(execFile);
  const seedPassword = "Seed-" + randomUUID();
  const env = { ...process.env, MONGODB_URI: database.getUri(), ADMIN_NAME: "Seeded Admin", ADMIN_EMAIL: "seed@example.com", ADMIN_PASSWORD: seedPassword };
  await execute(process.execPath, ["scripts/seedAdmin.js"], { env });
  const seeded = await Admin.findOne({ email: env.ADMIN_EMAIL }).select("+passwordHash");
  assert.equal(await bcrypt.compare(seedPassword, seeded.passwordHash), true);
  await execute(process.execPath, ["scripts/seedAdmin.js"], { env: { ...env, ADMIN_PASSWORD: "Changed-" + randomUUID() } });
  const unchanged = await Admin.findById(seeded._id).select("+passwordHash");
  assert.equal(unchanged.passwordHash, seeded.passwordHash);
  const login = await api("post", "/api/auth/login", { email: env.ADMIN_EMAIL, password: seedPassword, accountType: "ADMIN" }).expect(200);
  const cookie = responseCookie(login);
  await api("post", "/api/auth/logout", {}, cookie).expect(200);
  await api("get", "/api/auth/me", undefined, cookie).expect(401);
});

test("the server entry point connects, builds indexes, serves HTTP and shuts down", { timeout: 15000 }, async () => {
  const portProbe = createServer();
  await new Promise((resolve) => portProbe.listen(0, "127.0.0.1", resolve));
  const port = portProbe.address().port;
  await new Promise((resolve) => portProbe.close(resolve));
  const server = spawn(process.execPath, ["src/server.js"], {
    env: {
      ...process.env, NODE_ENV: "development", PORT: String(port),
      MONGODB_URI: database.getUri(), JWT_SECRET: config.jwtSecret, CLIENT_ORIGIN: config.clientOrigin,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const exited = new Promise((resolve) => server.once("exit", resolve));
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Server startup timed out.")), 10000);
      server.stdout.on("data", (data) => {
        if (data.toString().includes("API running at")) { clearTimeout(timer); resolve(); }
      });
      server.once("error", (error) => { clearTimeout(timer); reject(error); });
      server.once("exit", (code) => { clearTimeout(timer); reject(new Error("Server exited: " + code)); });
      server.stderr.resume();
    });
    const response = await fetch("http://127.0.0.1:" + port + "/api/health");
    assert.equal(response.status, 200);
    assert.equal((await response.json()).success, true);
  } finally {
    server.kill("SIGTERM");
    await exited;
  }
});
