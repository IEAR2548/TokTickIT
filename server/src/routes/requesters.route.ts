import { Router } from "express";
import { listRequesters } from "../controllers/requesters.controller";

const router = Router();

// GET /api/requesters
router.get("/", listRequesters);

export default router;