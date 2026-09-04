import { Request, Response } from "express";
import { TranslationLog } from "../entities/translation.entity";
import { SurgicalBooking, BookingStatus } from "../entities/booking.entity";
import { UserRole } from "../entities/user.entity";

export const createTranslationLog = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.authUser) {
            res.status(401).json({
                success: false,
                message: "Unauthorized: Please log in.",
            });
            return;
        }

        const { bookingId, originalLanguage, translatedLanguage, dischargeSummaryTranslationUrl } = req.body;

        if (!bookingId || !originalLanguage || !translatedLanguage || !dischargeSummaryTranslationUrl) {
            res.status(400).json({
                success: false,
                message: "Missing required parameters: bookingId, originalLanguage, translatedLanguage, and dischargeSummaryTranslationUrl are required.",
            });
            return;
        }

        const booking = await SurgicalBooking.findOne({
            where: { id: bookingId },
            relations: ["trip", "trip.hospital", "attendant"],
        });

        if (!booking) {
            res.status(404).json({
                success: false,
                message: "Associated booking not found.",
            });
            return;
        }

        const { role, id: userId } = req.authUser;

        // Verify permissions:
        // - ATTENDANT: Must be the assigned coordinator for this booking
        // - HOSPITAL_ADMIN: Booking's trip must belong to their hospital
        if (role === UserRole.ATTENDANT) {
            if (!booking.attendant || booking.attendant.id !== userId) {
                res.status(403).json({
                    success: false,
                    message: "Access Denied: You are not the assigned coordinator for this booking.",
                });
                return;
            }
        } else if (role === UserRole.HOSPITAL_ADMIN) {
            if (!req.authUser.hospital || !booking.trip || !booking.trip.hospital || booking.trip.hospital.id !== req.authUser.hospital.id) {
                res.status(403).json({
                    success: false,
                    message: "Access Denied: You can only add translation logs for bookings under your hospital.",
                });
                return;
            }
        } else {
            res.status(403).json({
                success: false,
                message: "Access Denied: You do not have permission to upload translation logs.",
            });
            return;
        }

        // Verify booking status (only allowed for confirmed or completed bookings)
        if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.COMPLETED) {
            res.status(400).json({
                success: false,
                message: "Translation logs can only be uploaded for confirmed or completed bookings.",
            });
            return;
        }

        // Create and save the new TranslationLog
        const log = new TranslationLog();
        log.originalLanguage = originalLanguage;
        log.translatedLanguage = translatedLanguage;
        log.dischargeSummaryTranslationUrl = dischargeSummaryTranslationUrl;
        log.booking = booking;

        await log.save();

        res.status(201).json({
            success: true,
            message: "Translation log created successfully.",
            log: {
                id: log.id,
                originalLanguage: log.originalLanguage,
                translatedLanguage: log.translatedLanguage,
                dischargeSummaryTranslationUrl: log.dischargeSummaryTranslationUrl,
                createdAt: log.createdAt,
            }
        });
    } catch (error) {
        console.error("Create translation log error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while creating translation log.",
        });
    }
};
