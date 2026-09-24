import ServiceRequest from "../models/ServiceRequest.js";
import ApiError from "../utils/ApiError.js";
import { canChangeStatus, canCancel } from "../utils/requestRules.js";
import { paginationInfo } from "../utils/pagination.js";

function visibleRequest(req) {
  const filter = { _id: req.params.id };
  if (req.user.role === "USER") filter.createdBy = req.user._id;
  return filter;
}

export async function listRequests(req, res) {
  const { page, limit, search, sort, status, category, priority } = req.validated.query;
  const filter = {};
  if (req.user.role === "USER") filter.createdBy = req.user._id;
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;
  if (search) filter.$text = { $search: search };
  const direction = sort === "oldest" ? 1 : -1;
  const [requests, total] = await Promise.all([
    ServiceRequest.find(filter).populate("createdBy", "name email")
      .sort({ createdAt: direction, _id: direction }).skip((page - 1) * limit).limit(limit),
    ServiceRequest.countDocuments(filter),
  ]);
  res.json({ success: true, data: { requests }, pagination: paginationInfo(page, limit, total) });
}

export async function createRequest(req, res) {
  const request = await ServiceRequest.create({
    ...req.validated.body, createdBy: req.user._id, status: "PENDING",
  });
  res.status(201).json({ success: true, message: "Request created.", data: { request } });
}

export async function getRequest(req, res) {
  const request = await ServiceRequest.findOne(visibleRequest(req)).populate("createdBy", "name email");
  if (!request) throw new ApiError(404, "Request not found.");
  res.json({ success: true, data: { request } });
}

export async function editRequest(req, res) {
  const filter = visibleRequest(req);
  // Check status in the update to protect against concurrent status changes.
  const request = await ServiceRequest.findOneAndUpdate(
    { ...filter, status: "PENDING" }, { $set: req.validated.body }, { returnDocument: "after", runValidators: true }
  );
  if (!request) {
    if (!await ServiceRequest.exists(filter)) throw new ApiError(404, "Request not found.");
    throw new ApiError(409, "Only pending requests can be edited.");
  }
  res.json({ success: true, message: "Request updated.", data: { request } });
}

export async function cancelRequest(req, res) {
  const filter = visibleRequest(req);
  const current = await ServiceRequest.findOne(filter);
  if (!current) throw new ApiError(404, "Request not found.");
  if (!canCancel(current.status)) throw new ApiError(409, "This request can no longer be cancelled.");
  const request = await ServiceRequest.findOneAndUpdate(
    { ...filter, status: current.status }, { $set: { status: "CANCELLED" } }, { returnDocument: "after", runValidators: true }
  );
  if (!request) throw new ApiError(409, "The request changed. Reload it and try again.");
  res.json({ success: true, message: "Request cancelled.", data: { request } });
}

export async function updateStatus(req, res) {
  const current = await ServiceRequest.findById(req.params.id);
  if (!current) throw new ApiError(404, "Request not found.");
  const nextStatus = req.validated.body.status;
  if (!canChangeStatus(current.status, nextStatus)) throw new ApiError(409, "This status transition is not allowed.");
  const request = await ServiceRequest.findOneAndUpdate(
    { _id: current._id, status: current.status }, { $set: { status: nextStatus } }, { returnDocument: "after", runValidators: true }
  );
  if (!request) throw new ApiError(409, "The request changed. Reload it and try again.");
  res.json({ success: true, message: "Request status updated.", data: { request } });
}
