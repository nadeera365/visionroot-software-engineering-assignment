import { randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import Admin from "../models/Admin.js";
import ApiError from "../utils/ApiError.js";
import { publicAccount } from "../utils/account.js";
import { setSessionCookie, clearSessionCookie } from "../utils/session.js";


const dummyHash = bcrypt.hash(randomBytes(32).toString("hex"), 12);

export async function register(req, res) {
  const { name, email, password } = req.validated.body;
  const passwordHash = await bcrypt.hash(password, 12);
  const account = await User.create({ name, email, passwordHash });
  res.status(201).json({
    success: true, message: "Account created. Please log in.", data: { account: publicAccount(account) },
  });
}

export async function login(req, res) {
  const { email, password, accountType } = req.validated.body;
  const Account = accountType === "ADMIN" ? Admin : User;
  const account = await Account.findOne({ email }).select("+passwordHash +tokenVersion");
  const passwordMatches = await bcrypt.compare(password, account?.passwordHash || await dummyHash);
  if (!account || !passwordMatches || !account.isActive) {
    throw new ApiError(401, "Invalid login details.");
  }
  setSessionCookie(res, account, req.app.locals.config);
  res.json({ success: true, message: "Logged in.", data: { account: publicAccount(account) } });
}

export function me(req, res) {
  res.json({ success: true, data: { account: publicAccount(req.user) } });
}

export async function logout(req, res) {
 
  await req.accountModel.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  clearSessionCookie(res, req.app.locals.config);
  res.json({ success: true, message: "Logged out." });
}
