import { Router } from "express";
import {
    createMedicalTrip,
    getAllMedicalTrips,
    getMedicalTripById,
    updateMedicalTrip,
    deleteMedicalTrip
} from "../controllers/trip.controller";
import { authenticate, authorize, optionalAuthenticate } from "../middleware/auth.middleware";
import { UserRole } from "../entities/user.entity";

const router = Router();

router.get("/", optionalAuthenticate, getAllMedicalTrips);
router.get("/:id", getMedicalTripById);

router.post("/", authenticate, authorize(UserRole.HOSPITAL_ADMIN), createMedicalTrip);
router.put("/:id", authenticate, authorize(UserRole.HOSPITAL_ADMIN), updateMedicalTrip);
router.delete("/:id", authenticate, authorize(UserRole.HOSPITAL_ADMIN), deleteMedicalTrip);


export default router;