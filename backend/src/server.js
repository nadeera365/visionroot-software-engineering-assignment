import app from "./app.js";

// Environment variables are strings, so convert PORT to a number.
const port = Number(process.env.PORT || 5000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

// Keeping listen() separate allows later tests to import app.js directly.
app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
});