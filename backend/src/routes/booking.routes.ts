import { Router } from "express";
import {
    createBooking,
    getMyBookings,
    getBookingById,
    getAvailableAttendants,
    updateBookingStatus,
    cancelBooking,
    uploadMedicalHistory,
    completeBooking,
    submitClinicalReview
} from "../controllers/booking.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { UserRole } from "../entities/user.entity";

const router = Router();

router.use(authenticate);

router.post("/", authorize(UserRole.PATIENT), createBooking);

router.get("/", getMyBookings);

router.get("/available-attendants", authorize(UserRole.HOSPITAL_ADMIN), getAvailableAttendants);

router.get("/:id", getBookingById);

router.put("/:id/status", authorize(UserRole.HOSPITAL_ADMIN), updateBookingStatus);

router.put("/:id/cancel", cancelBooking);

router.put("/:id/medical-history", authorize(UserRole.PATIENT), uploadMedicalHistory);

router.put("/:id/complete", authorize(UserRole.ATTENDANT, UserRole.HOSPITAL_ADMIN), completeBooking);

router.post("/:id/review", authorize(UserRole.PATIENT), submitClinicalReview);

export default router;
