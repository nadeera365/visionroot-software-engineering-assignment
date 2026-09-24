import { z } from "zod";

const name = z.string().trim().min(2).max(80);
const email = z.string().trim().toLowerCase().max(254).pipe(z.email());
const password = z.string().min(8).max(72).refine(
  (value) => Buffer.byteLength(value, "utf8") <= 72,
  "Password must be at most 72 UTF-8 bytes."
);

export const registerSchema = z.strictObject({ name, email, password });
export const loginSchema = z.strictObject({
  email, password, accountType: z.enum(["USER", "ADMIN"]),
});
export const emptyBodySchema = z.strictObject({});

const title = z.string().trim().min(3).max(120);
const description = z.string().trim().min(10).max(3000);
const category = z.enum(["Technical", "Billing", "Account", "Other"]);
const priority = z.enum(["LOW", "MEDIUM", "HIGH"]);
const status = z.enum(["PENDING", "IN_PROGRESS", "RESOLVED", "CANCELLED"]);

export const createRequestSchema = z.strictObject({
  title, description, category, priority: priority.default("MEDIUM"),
});
export const editRequestSchema = z.strictObject({
  title: title.optional(), description: description.optional(),
  category: category.optional(), priority: priority.optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one field to update.");
export const statusSchema = z.strictObject({ status });
export const userStatusSchema = z.strictObject({ isActive: z.boolean() });

function positiveInteger(maximum, defaultValue) {
  return z.string().regex(/^[1-9]\d*$/, "Use a positive integer.")
    .transform(Number).pipe(z.number().int().min(1).max(maximum)).default(defaultValue);
}

const listFields = {
  page: positiveInteger(100000, 1),
  limit: positiveInteger(100, 10),
  search: z.string().trim().max(100).optional(),
  sort: z.enum(["newest", "oldest"]).default("newest"),
};

export const requestListSchema = z.strictObject({
  ...listFields, status: status.optional(), category: category.optional(), priority: priority.optional(),
});
export const userListSchema = z.strictObject({
  ...listFields, isActive: z.enum(["true", "false"]).optional(),
});
