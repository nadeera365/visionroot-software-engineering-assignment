import ServiceRequest from "../models/ServiceRequest.js";
import { AppError } from "../middleware/errorHandler.js";

const ALLOWED_TRANSITIONS = {
  PENDING: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["RESOLVED", "CANCELLED"],
  RESOLVED: [],
  CANCELLED: [],
};

const CANCELLABLE_STATUSES = ["PENDING", "IN_PROGRESS"];

async function findRequestForUser(id, auth) {
  const request = await ServiceRequest.findById(id);
  if (!request) {
    throw new AppError("Service request not found.", 404);
  }
  if (auth.role !== "ADMIN" && String(request.createdBy) !== String(auth.id)) {
    throw new AppError("You can only access your own requests.", 403);
  }
  return request;
}

//Creates a request under the logged-in user's own account.
export async function createRequest(req, res, next) {
  try {
    const { title, description, category, priority } = req.body;

    if (!title || !description || !category) {
      throw new AppError("Title, description, and category are required.", 400);
    }

    const request = await ServiceRequest.create({
      title,
      description,
      category,
      priority, 
      createdBy: req.auth.id,
    });

    res.status(201).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
}

export async function listRequests(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

    const filter = {};

    if (req.auth.role !== "ADMIN") {
      filter.createdBy = req.auth.id;
    }

    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    const sortParam = req.query.sort || "-createdAt";

    const [items, total] = await Promise.all([
      ServiceRequest.find(filter)
        .sort(sortParam)
        .skip((page - 1) * limit)
        .limit(limit),
      ServiceRequest.countDocuments(filter),
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

export async function getRequestById(req, res, next) {
  try {
    const request = await findRequestForUser(req.params.id, req.auth);
    res.status(200).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
}

export async function updateRequest(req, res, next) {
  try {
    const request = await findRequestForUser(req.params.id, req.auth);

    if (request.status !== "PENDING") {
      throw new AppError("Only pending requests can be edited.", 400);
    }

    const { title, description, category, priority } = req.body;
    if (title !== undefined) request.title = title;
    if (description !== undefined) request.description = description;
    if (category !== undefined) request.category = category;
    if (priority !== undefined) request.priority = priority;

    await request.save(); 

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
}

//Cancelling is a status change
export async function cancelRequest(req, res, next) {
  try {
    const request = await findRequestForUser(req.params.id, req.auth);

    if (!CANCELLABLE_STATUSES.includes(request.status)) {
      throw new AppError(
        `A request that is ${request.status} can no longer be cancelled.`,
        400
      );
    }

    request.status = "CANCELLED";
    await request.save();

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
}

// ADMIN can Moves a request to a new status
export async function updateStatus(req, res, next) {
  try {
    const { status: nextStatus } = req.body;
    const request = await ServiceRequest.findById(req.params.id);

    if (!request) {
      throw new AppError("Service request not found.", 404);
    }

    const allowedNext = ALLOWED_TRANSITIONS[request.status] || [];
    if (!allowedNext.includes(nextStatus)) {
      throw new AppError(
        `Cannot change status from ${request.status} to ${nextStatus}.`,
        400
      );
    }

    request.status = nextStatus;
    await request.save();

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
}