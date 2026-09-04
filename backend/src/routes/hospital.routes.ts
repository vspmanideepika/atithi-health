import { Router } from "express";
import { createHospital, getAllHospitals, createAttendant, updateHospital, getHospital, getAttendants } from "../controllers/hospital.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { UserRole } from "../entities/user.entity";

const router = Router();


router.post("/", createHospital);
router.get("/", getAllHospitals);
router.get("/getHospital", authenticate, authorize(UserRole.HOSPITAL_ADMIN), getHospital);
router.put("/updateHospital", authenticate, authorize(UserRole.HOSPITAL_ADMIN), updateHospital);
router.post("/attendants", authenticate, authorize(UserRole.HOSPITAL_ADMIN), createAttendant);
router.get("/attendants", authenticate, authorize(UserRole.HOSPITAL_ADMIN), getAttendants);

export default router;
