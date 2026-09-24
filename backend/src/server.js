import app from "./app.js";
import connectDB from "./config/db.js";

const port = Number(process.env.PORT || 5000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

async function startServer() {
  try {
    // Wait for MongoDB before accepting API requests.
    await connectDB();

    app.listen(port, () => {
      console.log(`API running at http://localhost:${port}`);
    });
  } catch (error) {
    // connectDB provides safe messages without credentials.
    console.error(error.message);
    process.exit(1);
  }
}

startServer();