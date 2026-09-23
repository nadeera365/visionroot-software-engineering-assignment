import express from "express";

const app = express();

// Avoid advertising the framework in response headers.
app.disable("x-powered-by");

// This checks the HTTP server only; database checks come later.
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Service Request API is running",
  });
});

// Give unknown URLs a predictable JSON response.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

export default app;