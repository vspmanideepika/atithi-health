import { Request, Response } from "express";
import { SurgicalBooking, BookingStatus } from "../entities/booking.entity";
import { MedicalTrip } from "../entities/trip.entity";
import { User, UserRole } from "../entities/user.entity";
import { ClinicalReview } from "../entities/review.entity";
import { sendBookingConfirmationEmail, sendBookingCancellationEmail } from "./email.controller";
import { clearCachePattern } from "../config/redis.config";

export const createBooking = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.authUser || req.authUser.role !== UserRole.PATIENT) {
            res.status(403).json({
                success: false,
                message: "Access Denied: Only registered patients can book medical packages.",
            });
            return;
        }

        const { tripId, surgeryDate, groupSize, requestedLanguage } = req.body;

        if (!tripId || !surgeryDate || !groupSize || !requestedLanguage) {
            res.status(400).json({
                success: false,
                message: "Missing required booking fields: tripId, surgeryDate, groupSize, and requestedLanguage are required.",
            });
            return;
        }

        if (typeof requestedLanguage !== 'string' || !requestedLanguage.trim() || requestedLanguage.length > 50) {
            res.status(400).json({
                success: false,
                message: "Preferred language(s) must be specified and cannot exceed 50 characters in total.",
            });
            return;
        }

        const parsedGroupSize = Number(groupSize);
        if (isNaN(parsedGroupSize) || parsedGroupSize < 1 || parsedGroupSize > 4) {
            res.status(400).json({
                success: false,
                message: "Invalid group size. Patient group size must be between 1 and 4 people.",
            });
            return;
        }

        const trip = await MedicalTrip.findOne({
            where: { id: tripId },
            relations: ["hospital", "program"],
        });

        if (!trip) {
            res.status(404).json({
                success: false,
                message: "Medical trip package not found.",
            });
            return;
        }

        if (trip.maxGroupCapacity <= 0) {
            res.status(400).json({
                success: false,
                message: "Sorry, this package is fully booked. No intake slots remaining.",
            });
            return;
        }

        const tripArrival = new Date(trip.arrivalDate);
        const requestedDate = new Date(surgeryDate);

        tripArrival.setHours(0, 0, 0, 0);
        requestedDate.setHours(0, 0, 0, 0);

        const minAllowed = new Date(tripArrival);
        minAllowed.setDate(tripArrival.getDate() - 2);

        const maxAllowed = new Date(tripArrival);
        maxAllowed.setDate(tripArrival.getDate() + 1);

        if (requestedDate < minAllowed || requestedDate > maxAllowed) {
            res.status(400).json({
                success: false,
                message: `Invalid arrival date. For this package, you must choose a date between 2 days before and 1 day after the expected arrival date (${minAllowed.toISOString().split('T')[0]} to ${maxAllowed.toISOString().split('T')[0]}).`,
            });
            return;
        }

        trip.maxGroupCapacity -= 1;
        await trip.save();

        const booking = new SurgicalBooking();
        booking.patient = req.authUser;
        booking.trip = trip;
        booking.hospitalName = trip.hospital ? trip.hospital.name : "Unassigned Hospital";
        booking.surgeryDate = new Date(surgeryDate);
        booking.groupSize = parsedGroupSize;
        booking.requestedLanguage = requestedLanguage;
        booking.status = BookingStatus.PENDING;
        booking.attendant = null;
        booking.patientHistoryUrl = null;

        await booking.save();
        await clearCachePattern("trips:*");

        res.status(201).json({
            success: true,
            message: "Booking request submitted successfully! Pending hospital admin approval.",
            booking: {
                id: booking.id,
                hospitalName: booking.hospitalName,
                surgeryDate: booking.surgeryDate,
                groupSize: booking.groupSize,
                requestedLanguage: booking.requestedLanguage,
                status: booking.status,
                patientHistoryUrl: booking.patientHistoryUrl,
                patient: {
                    id: req.authUser.id,
                    name: req.authUser.name,
                    email: req.authUser.email,
                },
                trip: {
                    id: trip.id,
                    title: trip.title,
                    programName: trip.program ? trip.program.name : null,
                },
            },
        });
    } catch (error) {
        console.error("Create booking error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while processing booking request.",
        });
    }
};

export const getMyBookings = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.authUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
            return;
        }

        const { role } = req.authUser;
        const { status } = req.query;

        let whereCondition: any = {};

        if (role === UserRole.PATIENT) {
            whereCondition.patient = { id: req.authUser.id };
        } else if (role === UserRole.HOSPITAL_ADMIN) {
            if (!req.authUser.hospital) {
                res.status(400).json({
                    success: false,
                    message: "Hospital information missing from user session.",
                });
                return;
            }
            whereCondition.trip = { hospital: { id: req.authUser.hospital.id } };
        } else if (role === UserRole.ATTENDANT) {
            whereCondition.attendant = { id: req.authUser.id };
        }

        if (status) {
            whereCondition.status = status as BookingStatus;
        }

        const bookings = await SurgicalBooking.find({
            where: whereCondition,
            relations: ["patient", "trip", "trip.hospital", "trip.program", "attendant", "translations", "clinicalReview"],
            order: { createdAt: "DESC" },
        });

        res.status(200).json({
            success: true,
            count: bookings.length,
            bookings: bookings.map((b) => ({
                id: b.id,
                hospitalName: b.hospitalName,
                surgeryDate: b.surgeryDate,
                groupSize: b.groupSize,
                requestedLanguage: b.requestedLanguage,
                status: b.status,
                patientHistoryUrl: b.patientHistoryUrl,
                createdAt: b.createdAt,
                patient: b.patient ? {
                    id: b.patient.id,
                    name: b.patient.name,
                    email: b.patient.email,
                    phone: b.patient.phone,
                } : null,
                trip: b.trip ? {
                    id: b.trip.id,
                    title: b.trip.title,
                    hospital: b.trip.hospital ? { id: b.trip.hospital.id, name: b.trip.hospital.name } : null,
                    program: b.trip.program ? { id: b.trip.program.id, name: b.trip.program.name } : null,
                } : null,
                attendant: b.attendant ? {
                    id: b.attendant.id,
                    name: b.attendant.name,
                    email: b.attendant.email,
                } : null,
                translations: b.translations ? b.translations.map((t) => ({
                    id: t.id,
                    originalLanguage: t.originalLanguage,
                    translatedLanguage: t.translatedLanguage,
                    dischargeSummaryTranslationUrl: t.dischargeSummaryTranslationUrl,
                    createdAt: t.createdAt
                })) : [],
                clinicalReview: b.clinicalReview ? b.clinicalReview.map((r) => ({
                    id: r.id,
                    rating: r.rating,
                    comment: r.comment,
                    createdAt: r.createdAt
                })) : [],
            })),
        });
    } catch (error) {
        console.error("Get bookings error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while fetching bookings.",
        });
    }
};

export const getBookingById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const booking = await SurgicalBooking.findOne({
            where: { id },
            relations: ["patient", "trip", "trip.hospital", "trip.program", "attendant"],
        });

        if (!booking) {
            res.status(404).json({
                success: false,
                message: "Booking not found.",
            });
            return;
        }

        res.status(200).json({
            success: true,
            booking: {
                id: booking.id,
                hospitalName: booking.hospitalName,
                surgeryDate: booking.surgeryDate,
                groupSize: booking.groupSize,
                requestedLanguage: booking.requestedLanguage,
                status: booking.status,
                patientHistoryUrl: booking.patientHistoryUrl,
                createdAt: booking.createdAt,
                patient: booking.patient ? {
                    id: booking.patient.id,
                    name: booking.patient.name,
                    email: booking.patient.email,
                    phone: booking.patient.phone,
                } : null,
                trip: booking.trip ? {
                    id: booking.trip.id,
                    title: booking.trip.title,
                    hospital: booking.trip.hospital ? { id: booking.trip.hospital.id, name: booking.trip.hospital.name } : null,
                    program: booking.trip.program ? { id: booking.trip.program.id, name: booking.trip.program.name } : null,
                } : null,
                attendant: booking.attendant ? {
                    id: booking.attendant.id,
                    name: booking.attendant.name,
                    email: booking.attendant.email,
                } : null,
            },
        });
    } catch (error) {
        console.error("Get booking by id error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while fetching booking details.",
        });
    }
};

export const getAvailableAttendants = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.authUser || req.authUser.role !== UserRole.HOSPITAL_ADMIN) {
            res.status(403).json({
                success: false,
                message: "Access Denied: Only hospital admins can fetch available attendants.",
            });
            return;
        }

        if (!req.authUser.hospital) {
            res.status(400).json({
                success: false,
                message: "Hospital information missing from user session.",
            });
            return;
        }

        const hospitalId = req.authUser.hospital.id;

        const attendants = await User.find({
            where: {
                role: UserRole.ATTENDANT,
                hospital: { id: hospitalId }
            },
            relations: ["coordinatedBookings"]
        });

        const availableAttendants = attendants.filter((attendant) => {
            const isBusy = attendant.coordinatedBookings.some(
                (booking) => booking.status === BookingStatus.CONFIRMED
            );
            return !isBusy;
        });

        res.status(200).json({
            success: true,
            count: availableAttendants.length,
            attendants: availableAttendants.map((a) => ({
                id: a.id,
                name: a.name,
                email: a.email,
                phone: a.phone,
                languagesSpoken: a.languagesSpoken || []
            }))
        });
    } catch (error) {
        console.error("Get available attendants error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while fetching available coordinators.",
        });
    }
};

export const updateBookingStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.authUser || req.authUser.role !== UserRole.HOSPITAL_ADMIN) {
            res.status(403).json({
                success: false,
                message: "Access Denied: Only hospital admins can modify booking status.",
            });
            return;
        }

        if (!req.authUser.hospital) {
            res.status(400).json({
                success: false,
                message: "Hospital information missing from user session.",
            });
            return;
        }

        const { id } = req.params;
        const { status, attendantId } = req.body;

        if (!status || !Object.values(BookingStatus).includes(status)) {
            res.status(400).json({
                success: false,
                message: "Valid status (CONFIRMED or CANCELLED) is required.",
            });
            return;
        }

        const booking = await SurgicalBooking.findOne({
            where: { id },
            relations: ["trip", "trip.hospital", "attendant", "patient"],
        });

        if (!booking) {
            res.status(404).json({
                success: false,
                message: "Booking not found.",
            });
            return;
        }

        if (!booking.trip || !booking.trip.hospital || booking.trip.hospital.id !== req.authUser.hospital.id) {
            res.status(403).json({
                success: false,
                message: "Access Denied: You can only update bookings for your own hospital.",
            });
            return;
        }

        if (status === BookingStatus.CONFIRMED) {
            if (!attendantId) {
                res.status(400).json({
                    success: false,
                    message: "Attendant/Coordinator ID is required to confirm a booking.",
                });
                return;
            }

            const attendant = await User.findOne({
                where: { id: attendantId, role: UserRole.ATTENDANT },
                relations: ["coordinatedBookings", "hospital"]
            });

            if (!attendant) {
                res.status(404).json({
                    success: false,
                    message: "Selected coordinator/attendant not found.",
                });
                return;
            }

            if (!attendant.hospital || attendant.hospital.id !== req.authUser.hospital.id) {
                res.status(400).json({
                    success: false,
                    message: "Selected coordinator does not belong to your hospital.",
                });
                return;
            }

            const isBusy = attendant.coordinatedBookings.some(
                (b) => b.status === BookingStatus.CONFIRMED && b.id !== booking.id
            );

            if (isBusy) {
                res.status(400).json({
                    success: false,
                    message: "Selected coordinator is busy with another confirmed booking.",
                });
                return;
            }

            booking.status = BookingStatus.CONFIRMED;
            booking.attendant = attendant;
        } else if (status === BookingStatus.CANCELLED) {
            if (booking.status !== BookingStatus.CANCELLED) {
                booking.trip.maxGroupCapacity += 1;
                await booking.trip.save();
            }

            booking.status = BookingStatus.CANCELLED;
            booking.attendant = null;
        }

        await booking.save();
        await clearCachePattern("trips:*");

        if (status === BookingStatus.CONFIRMED && booking.attendant && booking.patient) {
            sendBookingConfirmationEmail(
                booking.patient.email,
                booking.patient.name,
                {
                    id: booking.id,
                    tripTitle: booking.trip.title,
                    surgeryDate: booking.surgeryDate.toISOString().split('T')[0],
                    hospitalName: booking.hospitalName,
                },
                {
                    name: booking.attendant.name,
                    email: booking.attendant.email,
                }
            ).catch(err => console.error("Error triggering confirmation email:", err));
        } else if (status === BookingStatus.CANCELLED && booking.patient) {
            sendBookingCancellationEmail(
                booking.patient.email,
                booking.patient.name,
                {
                    id: booking.id,
                    tripTitle: booking.trip.title,
                    hospitalName: booking.hospitalName,
                }
            ).catch(err => console.error("Error triggering cancellation email:", err));
        }

        res.status(200).json({
            success: true,
            message: `Booking has been successfully ${status.toLowerCase()}.`,
            booking: {
                id: booking.id,
                status: booking.status,
                attendant: booking.attendant ? {
                    id: booking.attendant.id,
                    name: booking.attendant.name,
                    email: booking.attendant.email
                } : null
            }
        });
    } catch (error) {
        console.error("Update booking status error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while updating booking status.",
        });
    }
};

export const cancelBooking = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.authUser) {
            res.status(401).json({
                success: false,
                message: "Unauthorized: Please log in to cancel bookings.",
            });
            return;
        }

        const { id } = req.params;
        const { role, id: userId } = req.authUser;

        const booking = await SurgicalBooking.findOne({
            where: { id },
            relations: ["trip", "trip.hospital", "patient", "attendant"],
        });

        if (!booking) {
            res.status(404).json({
                success: false,
                message: "Booking not found.",
            });
            return;
        }

        if (role === UserRole.PATIENT) {
            if (booking.patient.id !== userId) {
                res.status(403).json({
                    success: false,
                    message: "Access Denied: You can only cancel your own bookings.",
                });
                return;
            }
        } else if (role === UserRole.HOSPITAL_ADMIN) {
            if (!req.authUser.hospital || !booking.trip || !booking.trip.hospital || booking.trip.hospital.id !== req.authUser.hospital.id) {
                res.status(403).json({
                    success: false,
                    message: "Access Denied: You can only cancel bookings for your own hospital.",
                });
                return;
            }
        } else {
            res.status(403).json({
                success: false,
                message: "Access Denied: You do not have permission to cancel bookings.",
            });
            return;
        }

        if (booking.status === BookingStatus.CANCELLED) {
            res.status(400).json({
                success: false,
                message: "This booking is already cancelled.",
            });
            return;
        }

        if (booking.status === 'COMPLETED') {
            res.status(400).json({
                success: false,
                message: "Cannot cancel a completed medical trip booking.",
            });
            return;
        }

        booking.trip.maxGroupCapacity += 1;
        await booking.trip.save();

        booking.status = BookingStatus.CANCELLED;
        booking.attendant = null;

        await booking.save();
        await clearCachePattern("trips:*");

        if (booking.patient) {
            sendBookingCancellationEmail(
                booking.patient.email,
                booking.patient.name,
                {
                    id: booking.id,
                    tripTitle: booking.trip.title,
                    hospitalName: booking.hospitalName,
                }
            ).catch(err => console.error("Error triggering cancellation email:", err));
        }

        res.status(200).json({
            success: true,
            message: "Booking has been successfully cancelled.",
            booking: {
                id: booking.id,
                status: booking.status,
            }
        });
    } catch (error) {
        console.error("Cancel booking error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while cancelling booking.",
        });
    }
};

export const uploadMedicalHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.authUser || req.authUser.role !== UserRole.PATIENT) {
            res.status(403).json({
                success: false,
                message: "Access Denied: Only patients can upload medical history.",
            });
            return;
        }

        const { id } = req.params;
        const { patientHistoryUrl } = req.body;

        if (!patientHistoryUrl) {
            res.status(400).json({
                success: false,
                message: "Medical history PDF URL is required.",
            });
            return;
        }

        const booking = await SurgicalBooking.findOne({
            where: { id },
            relations: ["patient"],
        });

        if (!booking) {
            res.status(404).json({
                success: false,
                message: "Booking not found.",
            });
            return;
        }

        // Verify patient ownership
        if (booking.patient.id !== req.authUser.id) {
            res.status(403).json({
                success: false,
                message: "Access Denied: You can only upload medical history for your own bookings.",
            });
            return;
        }

        // Verify booking is confirmed
        if (booking.status !== BookingStatus.CONFIRMED) {
            res.status(400).json({
                success: false,
                message: "Medical history diagnostic PDFs can only be attached to confirmed bookings.",
            });
            return;
        }

        booking.patientHistoryUrl = patientHistoryUrl;
        await booking.save();

        res.status(200).json({
            success: true,
            message: "Medical history diagnostic PDF uploaded successfully.",
            booking: {
                id: booking.id,
                patientHistoryUrl: booking.patientHistoryUrl,
            }
        });
    } catch (error) {
        console.error("Upload medical history error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while uploading medical history.",
        });
    }
};

export const completeBooking = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.authUser) {
            res.status(401).json({
                success: false,
                message: "Unauthorized: Please log in.",
            });
            return;
        }

        const { id } = req.params;
        const { role, id: userId } = req.authUser;

        const booking = await SurgicalBooking.findOne({
            where: { id },
            relations: ["trip", "trip.hospital", "attendant"],
        });

        if (!booking) {
            res.status(404).json({
                success: false,
                message: "Booking not found.",
            });
            return;
        }

        // Verify permissions
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
                    message: "Access Denied: You can only complete bookings under your hospital.",
                });
                return;
            }
        } else {
            res.status(403).json({
                success: false,
                message: "Access Denied: You do not have permission to complete bookings.",
            });
            return;
        }

        // Verify booking status
        if (booking.status !== BookingStatus.CONFIRMED) {
            res.status(400).json({
                success: false,
                message: "Only confirmed bookings can be marked as completed.",
            });
            return;
        }

        booking.status = BookingStatus.COMPLETED;
        await booking.save();

        res.status(200).json({
            success: true,
            message: "Booking has been successfully marked as completed.",
            booking: {
                id: booking.id,
                status: booking.status,
            }
        });
    } catch (error) {
        console.error("Complete booking error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while completing booking.",
        });
    }
};

export const submitClinicalReview = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.authUser || req.authUser.role !== UserRole.PATIENT) {
            res.status(403).json({
                success: false,
                message: "Access Denied: Only patients can submit reviews.",
            });
            return;
        }

        const { id } = req.params;
        const { rating, comment } = req.body;

        // Rating validation
        const ratingNum = Number(rating);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5 || !Number.isInteger(ratingNum)) {
            res.status(400).json({
                success: false,
                message: "Rating must be an integer between 1 and 5.",
            });
            return;
        }

        const booking = await SurgicalBooking.findOne({
            where: { id },
            relations: ["patient"],
        });

        if (!booking) {
            res.status(404).json({
                success: false,
                message: "Booking not found.",
            });
            return;
        }

        // Verify patient ownership
        if (booking.patient.id !== req.authUser.id) {
            res.status(403).json({
                success: false,
                message: "Access Denied: You can only review your own bookings.",
            });
            return;
        }

        // Verify booking status is completed
        if (booking.status !== BookingStatus.COMPLETED) {
            res.status(400).json({
                success: false,
                message: "Reviews can only be submitted for completed surgical bookings.",
            });
            return;
        }

        // Check if review already exists
        const existingReview = await ClinicalReview.findOne({
            where: { booking: { id: booking.id } }
        });

        if (existingReview) {
            res.status(400).json({
                success: false,
                message: "You have already submitted a review for this booking.",
            });
            return;
        }

        // Save the new clinical review
        const review = new ClinicalReview();
        review.rating = ratingNum;
        review.comment = comment || null;
        review.booking = booking;
        review.patient = req.authUser;

        await review.save();

        res.status(201).json({
            success: true,
            message: "Clinical review submitted successfully.",
            review: {
                id: review.id,
                rating: review.rating,
                comment: review.comment,
                createdAt: review.createdAt,
            }
        });
    } catch (error) {
        console.error("Submit clinical review error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while submitting clinical review.",
        });
    }
};
