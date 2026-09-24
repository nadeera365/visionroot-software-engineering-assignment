import User from "../models/User.js";

// view and manage users.
export async function listUsers(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

    const [items, total] = await Promise.all([
      User.find().sort("-createdAt").skip((page - 1) * limit).limit(limit),
      User.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
}
