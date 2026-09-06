import { Router } from "express";
import { getCategoriesHandler } from "../controllers/categories.controller";

const router = Router();

// GET /api/categories
router.get("/", getCategoriesHandler);

export default router;