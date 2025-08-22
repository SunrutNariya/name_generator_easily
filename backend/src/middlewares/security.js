import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";

export const applySecurity = (app) => {
  // Secure HTTP headers
  app.use(helmet());

  // Enable CORS
  app.use(cors({ origin: "*" }));

  // Rate limiting (100 requests per 15 minutes per IP)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests, please try again later.",
  });
  app.use(limiter);
};
