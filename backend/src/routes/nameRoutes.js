import express from "express";
import { suggestNames, generateNames } from "../controllers/nameController.js";

const router = express.Router();

router.post("/suggest", suggestNames);
router.post("/generate", generateNames);

export default router;
