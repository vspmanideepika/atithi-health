import { Router } from "express";
import {
    getPlatformAnalytics,
    getHospitalAuditGrid,
    getHospitalInspectionDetails,
} from "../controllers/admin.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { UserRole } from "../entities/user.entity";

const router = Router();

// Global Platform Analytics (KPI overview cards)
router.get("/analytics", authenticate, authorize(UserRole.ADMIN), getPlatformAnalytics);

// Partner Hospital Audit & Performance Grid
router.get("/hospitals", authenticate, authorize(UserRole.ADMIN), getHospitalAuditGrid);

// Inspect Hospital Modal details
router.get("/hospitals/:id", authenticate, authorize(UserRole.ADMIN), getHospitalInspectionDetails);

export default router;
