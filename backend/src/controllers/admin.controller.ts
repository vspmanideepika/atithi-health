import { Request, Response } from "express";
import { Hospital } from "../entities/hospital.entity";
import { MedicalTrip } from "../entities/trip.entity";
import { SurgicalBooking, BookingStatus } from "../entities/booking.entity";
import { ClinicalReview } from "../entities/review.entity";
import { User, UserRole } from "../entities/user.entity";
import { Program } from "../entities/program.entity";

/**
 * 1. Global Platform Analytics (KPI Overview Cards)
 * - Total Onboarded Hospitals: Count of all registered medical institutions in India.
 * - Global Package Listings: Total care packages listed across all specialty departments.
 * - Total Booking Volume & Capacity Utilization: Total reservations broken down by status.
 * - Platform Satisfaction Score: Overall average rating computed across all patient clinical reviews.
 */
export const getPlatformAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
        // Total onboarded hospitals
        const totalHospitals = await Hospital.count();

        // Total care packages listed across all specialty departments
        const totalPackages = await MedicalTrip.count();

        // Total bookings count & status breakdown
        const totalBookings = await SurgicalBooking.count();
        const pendingBookings = await SurgicalBooking.count({ where: { status: BookingStatus.PENDING } });
        const confirmedBookings = await SurgicalBooking.count({ where: { status: BookingStatus.CONFIRMED } });
        const completedBookings = await SurgicalBooking.count({ where: { status: BookingStatus.COMPLETED } });
        const cancelledBookings = await SurgicalBooking.count({ where: { status: BookingStatus.CANCELLED } });

        // Calculate total capacity offered across all packages and capacity utilized
        const allTrips = await MedicalTrip.find({
            relations: ["bookings"],
        });

        let totalCapacitySlots = 0;
        let activeBookedSlots = 0;

        for (const trip of allTrips) {
            totalCapacitySlots += trip.maxGroupCapacity;
            if (trip.bookings) {
                for (const b of trip.bookings) {
                    if (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.COMPLETED) {
                        activeBookedSlots += b.groupSize || 1;
                    }
                }
            }
        }

        const capacityUtilizationPercentage = totalCapacitySlots > 0
            ? Math.min(100, Math.round((activeBookedSlots / (totalCapacitySlots + activeBookedSlots)) * 100))
            : 0;

        // Platform Satisfaction Score: overall average rating across all patient reviews
        const reviews = await ClinicalReview.find();
        const totalReviews = reviews.length;
        let averageRating = 0;

        if (totalReviews > 0) {
            const sumRatings = reviews.reduce((acc, curr) => acc + curr.rating, 0);
            averageRating = parseFloat((sumRatings / totalReviews).toFixed(1));
        }

        // Star breakdown
        const ratingDistribution = {
            5: reviews.filter((r) => r.rating === 5).length,
            4: reviews.filter((r) => r.rating === 4).length,
            3: reviews.filter((r) => r.rating === 3).length,
            2: reviews.filter((r) => r.rating === 2).length,
            1: reviews.filter((r) => r.rating === 1).length,
        };

        // Total specialty programs/departments
        const totalPrograms = await Program.count();

        // Total attendants registered
        const totalAttendants = await User.count({ where: { role: UserRole.ATTENDANT } });

        res.status(200).json({
            success: true,
            analytics: {
                totalHospitals,
                totalPackages,
                totalPrograms,
                totalAttendants,
                bookingVolume: {
                    total: totalBookings,
                    pending: pendingBookings,
                    confirmed: confirmedBookings,
                    completed: completedBookings,
                    cancelled: cancelledBookings,
                    activeBookedSlots,
                    capacityUtilizationPercentage,
                },
                satisfactionScore: {
                    averageRating: totalReviews > 0 ? averageRating : null,
                    totalReviews,
                    ratingDistribution,
                },
            },
        });
    } catch (error) {
        console.error("Get platform analytics error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while fetching platform analytics.",
        });
    }
};

/**
 * 2. Partner Hospital Audit & Performance Grid
 * Returns all onboarded hospitals with:
 * - Hospital Name, Location, Registered Administrator
 * - Total Specialty Departments (Programs)
 * - Total Bookings Handled & Completion Rate
 * - Average Patient Rating
 */
export const getHospitalAuditGrid = async (req: Request, res: Response): Promise<void> => {
    try {
        const hospitals = await Hospital.find({
            relations: [
                "users",
                "programs",
                "trips",
                "trips.bookings",
                "trips.bookings.clinicalReview",
            ],
            order: { name: "ASC" },
        });

        const auditData = hospitals.map((hospital) => {
            // Find registered administrator
            const admin = hospital.users?.find((u) => u.role === UserRole.HOSPITAL_ADMIN);

            // Total programs (specialty departments)
            const programsCount = hospital.programs?.length || 0;

            // Total care packages listed
            const packagesCount = hospital.trips?.length || 0;

            // Total coordinators (attendants)
            const attendantsCount = hospital.users?.filter((u) => u.role === UserRole.ATTENDANT).length || 0;

            // Compute booking metrics for this hospital
            let totalBookings = 0;
            let pendingBookings = 0;
            let confirmedBookings = 0;
            let completedBookings = 0;
            let cancelledBookings = 0;
            const hospitalRatings: number[] = [];

            if (hospital.trips) {
                for (const trip of hospital.trips) {
                    if (trip.bookings) {
                        for (const booking of trip.bookings) {
                            totalBookings += 1;
                            if (booking.status === BookingStatus.PENDING) pendingBookings += 1;
                            else if (booking.status === BookingStatus.CONFIRMED) confirmedBookings += 1;
                            else if (booking.status === BookingStatus.COMPLETED) completedBookings += 1;
                            else if (booking.status === BookingStatus.CANCELLED) cancelledBookings += 1;

                            if (booking.clinicalReview && Array.isArray(booking.clinicalReview)) {
                                for (const rev of booking.clinicalReview) {
                                    if (typeof rev.rating === "number") {
                                        hospitalRatings.push(rev.rating);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            const completionRate = totalBookings > 0
                ? Math.round((completedBookings / totalBookings) * 100)
                : 0;

            const averageRating = hospitalRatings.length > 0
                ? parseFloat((hospitalRatings.reduce((sum, r) => sum + r, 0) / hospitalRatings.length).toFixed(1))
                : null;

            return {
                id: hospital.id,
                name: hospital.name,
                location: hospital.location,
                createdAt: hospital.createdAt,
                admin: admin
                    ? {
                        id: admin.id,
                        name: admin.name,
                        email: admin.email,
                        phone: admin.phone || "Not specified",
                    }
                    : null,
                programsCount,
                packagesCount,
                attendantsCount,
                totalBookings,
                bookingBreakdown: {
                    pending: pendingBookings,
                    confirmed: confirmedBookings,
                    completed: completedBookings,
                    cancelled: cancelledBookings,
                },
                completedBookings,
                completionRate,
                averageRating,
                totalReviews: hospitalRatings.length,
            };
        });

        res.status(200).json({
            success: true,
            hospitals: auditData,
        });
    } catch (error) {
        console.error("Get hospital audit grid error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while fetching hospital audit grid.",
        });
    }
};

/**
 * 3. Inspect Hospital Modal Details
 * Returns comprehensive details for a specific hospital:
 * - Active Programs (Specialty Departments)
 * - Listed Care Packages
 * - Registered Coordinators (Attendants with languages & contacts)
 * - Reviews & Full Performance Metrics
 */
export const getHospitalInspectionDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const hospital = await Hospital.findOne({
            where: { id },
            relations: [
                "users",
                "programs",
                "trips",
                "trips.program",
                "trips.bookings",
                "trips.bookings.patient",
                "trips.bookings.attendant",
                "trips.bookings.clinicalReview",
            ],
        });

        if (!hospital) {
            res.status(404).json({
                success: false,
                message: "Hospital not found.",
            });
            return;
        }

        const admin = hospital.users?.find((u) => u.role === UserRole.HOSPITAL_ADMIN);
        const attendants = (hospital.users?.filter((u) => u.role === UserRole.ATTENDANT) || []).map((att) => ({
            id: att.id,
            name: att.name,
            email: att.email,
            phone: att.phone || "Not specified",
            languagesSpoken: att.languagesSpoken || ["English"],
        }));

        const programs = (hospital.programs || []).map((prog) => ({
            id: prog.id,
            name: prog.name,
            description: prog.description || "Specialty clinical care department",
            createdAt: prog.createdAt,
        }));

        const packages = (hospital.trips || []).map((trip) => ({
            id: trip.id,
            title: trip.title,
            description: trip.description,
            programName: trip.program ? trip.program.name : "General",
            maxGroupCapacity: trip.maxGroupCapacity,
            status: trip.status,
            arrivalDate: trip.arrivalDate,
            mediaUrl: trip.mediaUrl,
            bookingsCount: trip.bookings?.length || 0,
        }));

        // Collect all reviews
        const reviews: Array<{
            id: string;
            rating: number;
            comment: string | null;
            createdAt: Date;
            patientName: string;
            tripTitle: string;
        }> = [];

        let totalBookings = 0;
        let pendingBookings = 0;
        let confirmedBookings = 0;
        let completedBookings = 0;
        let cancelledBookings = 0;

        if (hospital.trips) {
            for (const trip of hospital.trips) {
                if (trip.bookings) {
                    for (const booking of trip.bookings) {
                        totalBookings += 1;
                        if (booking.status === BookingStatus.PENDING) pendingBookings += 1;
                        else if (booking.status === BookingStatus.CONFIRMED) confirmedBookings += 1;
                        else if (booking.status === BookingStatus.COMPLETED) completedBookings += 1;
                        else if (booking.status === BookingStatus.CANCELLED) cancelledBookings += 1;

                        if (booking.clinicalReview && Array.isArray(booking.clinicalReview)) {
                            for (const rev of booking.clinicalReview) {
                                reviews.push({
                                    id: rev.id,
                                    rating: rev.rating,
                                    comment: rev.comment,
                                    createdAt: rev.createdAt,
                                    patientName: booking.patient ? booking.patient.name : "Anonymous Patient",
                                    tripTitle: trip.title,
                                });
                            }
                        }
                    }
                }
            }
        }

        const averageRating = reviews.length > 0
            ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
            : null;

        const completionRate = totalBookings > 0
            ? Math.round((completedBookings / totalBookings) * 100)
            : 0;

        res.status(200).json({
            success: true,
            hospitalDetails: {
                id: hospital.id,
                name: hospital.name,
                location: hospital.location,
                createdAt: hospital.createdAt,
                admin: admin
                    ? {
                        id: admin.id,
                        name: admin.name,
                        email: admin.email,
                        phone: admin.phone || "Not specified",
                    }
                    : null,
                performance: {
                    totalBookings,
                    pending: pendingBookings,
                    confirmed: confirmedBookings,
                    completed: completedBookings,
                    cancelled: cancelledBookings,
                    completionRate,
                    averageRating,
                    totalReviews: reviews.length,
                },
                programs,
                packages,
                attendants,
                reviews: reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
            },
        });
    } catch (error) {
        console.error("Get hospital inspection details error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while fetching hospital inspection details.",
        });
    }
};
