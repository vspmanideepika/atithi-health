import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";
import { uploadFile } from "../controllers/upload.controller";

const router = Router();

// Protect route and accept file under field name 'file' or 'media'
router.post("/", authenticate, upload.single("file"), uploadFile);

export default router;
