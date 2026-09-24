import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { publicAccount } from "../utils/account.js";
import { paginationInfo } from "../utils/pagination.js";

export async function listUsers(req, res) {
  const { page, limit, search, sort, isActive } = req.validated.query;
  const filter = {};
  if (isActive !== undefined) filter.isActive = isActive === "true";
  if (search) {
    // Treat search as literal text, not a caller-supplied regular expression.
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ name: { $regex: escaped, $options: "i" } }, { email: { $regex: escaped, $options: "i" } }];
  }
  const direction = sort === "oldest" ? 1 : -1;
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: direction, _id: direction }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, data: { users: users.map(publicAccount) }, pagination: paginationInfo(page, limit, total) });
}

export async function getUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found.");
  res.json({ success: true, data: { user: publicAccount(user) } });
}

export async function updateUserStatus(req, res) {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { isActive: req.validated.body.isActive }, $inc: { tokenVersion: 1 } },
    { returnDocument: "after", runValidators: true }
  );
  if (!user) throw new ApiError(404, "User not found.");
  res.json({ success: true, message: "User status updated.", data: { user: publicAccount(user) } });
}
