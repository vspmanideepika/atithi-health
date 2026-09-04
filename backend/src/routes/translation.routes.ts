import { Router } from "express";
import { createTranslationLog } from "../controllers/translation.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { UserRole } from "../entities/user.entity";

const router = Router();

router.use(authenticate);

router.post("/", authorize(UserRole.ATTENDANT, UserRole.HOSPITAL_ADMIN), createTranslationLog);

export default router;
