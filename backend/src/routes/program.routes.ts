import { Router } from "express";
import {
    createProgram,
    getAllPrograms,
    getProgramById,
    updateProgram,
    deleteProgram,
} from "../controllers/program.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { UserRole } from "../entities/user.entity";

const router = Router();

router.get("/", getAllPrograms);
router.get("/:id", getProgramById);

router.post("/", authenticate, authorize(UserRole.HOSPITAL_ADMIN), createProgram);
router.put("/:id", authenticate, authorize(UserRole.HOSPITAL_ADMIN), updateProgram);
router.delete("/:id", authenticate, authorize(UserRole.HOSPITAL_ADMIN), deleteProgram);

export default router;
