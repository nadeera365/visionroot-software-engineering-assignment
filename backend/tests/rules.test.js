import { test } from "node:test";
import assert from "node:assert/strict";
import { canChangeStatus, canCancel } from "../src/utils/requestRules.js";
import { getConfig } from "../src/config/env.js";

const allowed = new Set(["PENDING:IN_PROGRESS", "PENDING:CANCELLED", "IN_PROGRESS:RESOLVED", "IN_PROGRESS:CANCELLED"]);
const statuses = ["PENDING", "IN_PROGRESS", "RESOLVED", "CANCELLED"];

for (const current of statuses) {
  for (const next of statuses) {
    test("workflow: " + current + " -> " + next, () => {
      assert.equal(canChangeStatus(current, next), allowed.has(current + ":" + next));
    });
  }
}

test("owners can cancel only pending or in-progress requests", () => {
  assert.equal(canCancel("PENDING"), true);
  assert.equal(canCancel("IN_PROGRESS"), true);
  assert.equal(canCancel("RESOLVED"), false);
  assert.equal(canCancel("CANCELLED"), false);
  assert.equal(canCancel("UNKNOWN"), false);
});

test("unknown workflow states are rejected", () => {
  assert.equal(canChangeStatus("UNKNOWN", "PENDING"), false);
  assert.equal(canChangeStatus("PENDING", "UNKNOWN"), false);
});

test("startup rejects missing secrets and unsafe production origins", () => {
  const saved = { ...process.env };
  try {
    process.env.PORT = "5000";
    process.env.NODE_ENV = "development";
    process.env.CLIENT_ORIGIN = "http://localhost:5173";
    delete process.env.JWT_SECRET;
    assert.throws(getConfig, /JWT_SECRET/);
    process.env.JWT_SECRET = "test-only-secret-not-for-deployment-123456789";
    process.env.NODE_ENV = "production";
    assert.throws(getConfig, /HTTPS/);
    process.env.CLIENT_ORIGIN = "https://example.com";
    assert.equal(getConfig().production, true);
    process.env.CLIENT_ORIGIN = "https://example.com/path";
    assert.throws(getConfig, /origin/);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});
