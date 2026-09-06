import { Router } from "express";
import { listRelatedSystems } from "../controllers/relatedSystems.controller";

const router = Router();

// GET /api/related-systems — Ref: docs/lab-02/api-spec.md section 3
router.get("/", listRelatedSystems);

export default router;
