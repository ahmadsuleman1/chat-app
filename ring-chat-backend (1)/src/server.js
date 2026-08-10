import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initializeSocket } from "./socket/socket.js";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = initializeSocket(server);
app.set("io", io);

// Database connection check
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Ring Chat server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server due to DB connection:", err.message);
    process.exit(1);
  });

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err.message);
  server.close(() => process.exit(1));
});
