import express from "express";
import bodyParser from "body-parser";
import { applySecurity } from "./middlewares/security.js";
import nameRoutes from "./routes/nameRoutes.js";

const app = express();

// Middleware
app.use(bodyParser.json());
applySecurity(app);

// Health check route (root URL)
app.get("/", (req, res) => {
  res.send("✅ Backend is running!");
});

// Main API routes
app.use("/api", nameRoutes);

export default app;
