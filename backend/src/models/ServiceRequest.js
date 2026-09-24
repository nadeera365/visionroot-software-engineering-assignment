import mongoose from "mongoose";

const serviceRequestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minLength: 3,
      maxLength: 120,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minLength: 10,
      maxLength: 3000,
    },
    category: {
      type: String,
      required: true,
      enum: ["Technical", "Billing", "Account", "Other"],
    },
    priority: {
      type: String,
      required: true,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "IN_PROGRESS", "RESOLVED", "CANCELLED"],
      default: "PENDING",
    },
    // The controller will set this from the authenticated user.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

// Support each user's request list and the admin's request lists.
serviceRequestSchema.index({ createdBy: 1, createdAt: -1, _id: -1 });
serviceRequestSchema.index({ createdAt: -1, _id: -1 });
serviceRequestSchema.index({ status: 1, createdAt: -1, _id: -1 });

// Support the required keyword search over titles and descriptions.
serviceRequestSchema.index({ title: "text", description: "text" });

const ServiceRequest = mongoose.model(
  "ServiceRequest",
  serviceRequestSchema,
  "service_requests"
);

export default ServiceRequest;
