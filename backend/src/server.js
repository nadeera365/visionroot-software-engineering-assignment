import mongoose from "mongoose";
import createApp from "./app.js";
import connectDB from "./config/db.js";
import { getConfig } from "./config/env.js";
import User from "./models/User.js";
import Admin from "./models/Admin.js";
import ServiceRequest from "./models/ServiceRequest.js";

let server;

async function startServer() {
  try {
    const config = getConfig();
    await connectDB();
    // Unique indexes must exist before accepting registrations.
    await Promise.all([User.init(), Admin.init(), ServiceRequest.init()]);
    server = createApp(config).listen(config.port, () => {
      console.log("API running at http://localhost:" + config.port);
    });
    server.on("error", async (error) => {
      console.error("HTTP server could not start (" + (error.code || error.name) + ").");
      await mongoose.disconnect();
      process.exitCode = 1;
    });
  } catch (error) {
    console.error(error.name === "Error" ? error.message : "Startup failed (" + error.name + ").");
    await mongoose.disconnect();
    process.exitCode = 1;
  }
}

function shutdown() {
  const timeout = setTimeout(() => process.exit(1), 10000);
  timeout.unref();
  if (server) {
    server.close(async () => { await mongoose.disconnect(); });
  } else {
    mongoose.disconnect();
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
startServer();
