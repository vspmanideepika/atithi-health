import { Request, Response } from "express";
import { UserRole } from "../entities/user.entity";
import { Program } from "../entities/program.entity";
import { MedicalTrip } from "../entities/trip.entity";
import { SurgicalBooking, BookingStatus } from "../entities/booking.entity";
import { Between, ILike, In, LessThanOrEqual, Like, MoreThan, MoreThanOrEqual } from "typeorm";
import { getCache, setCache, clearCachePattern } from "../config/redis.config";

export const createMedicalTrip = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.authUser || req.authUser.role !== UserRole.HOSPITAL_ADMIN || !req.authUser.hospital) {
            res.status(403).json({
                success: false,
                message: "Access Denied: Only hospital administrators can add medical trips.",
            });
            return;
        }

        const { title, description, max_group_capacity, status, arrival_date, media_url, program_id } = req.body;

        if (!title || !arrival_date || !description || !status || !max_group_capacity) {
            res.status(400).json({
                success: false,
                message: "Missing required field: title, arrival_date, description, status, max_group_capacity are required.",
            });
            return;
        }

        const program = await Program.findOne({
            where: { id: program_id },
            relations: ["hospital"],
        });
        if (!program || program.hospital.id !== req.authUser.hospital.id) {
            res.status(400).json({
                success: false,
                message: "Invalid program selection. Program must belong to your hospital.",
            });
            return;
        }

        const existingTitle = await MedicalTrip.findOne({
            where: {
                title,
                program: { id: program.id }
            }
        });

        if (existingTitle) {
            res.status(400).json({
                success: false,
                message: "A medical trip with this title is already registered in your program.",
            });
            return;
        }

        const medicalTrip = new MedicalTrip();
        medicalTrip.title = title;
        medicalTrip.description = description;
        medicalTrip.maxGroupCapacity = max_group_capacity;
        medicalTrip.status = status;
        medicalTrip.arrivalDate = arrival_date;
        medicalTrip.mediaUrl = media_url;
        medicalTrip.hospital = req.authUser.hospital;
        medicalTrip.program = program;
        await medicalTrip.save();

        res.status(201).json({
            success: true,
            message: "Medical trip registered successfully.",
            medicalTrip: {
                id: medicalTrip.id,
                title: medicalTrip.title,
                description: medicalTrip.description,
                maxGroupCapacity: medicalTrip.maxGroupCapacity,
                status: medicalTrip.status,
                arrivalDate: medicalTrip.arrivalDate,
                mediaUrl: medicalTrip.mediaUrl,
                hospital: {
                    id: req.authUser.hospital.id,
                    name: req.authUser.hospital.name,
                },
                program: {
                    id: program.id,
                    name: program.name,
                }
            },
        });
    } catch (error) {
        console.error("Create medical trip error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while registering medical trip.",
        });
    }
};

export const getAllMedicalTrips = async (req: Request, res: Response): Promise<void> => {
    try {
        const { programId, hospitalId, hospitalName, programName, startDate, endDate, status, location } = req.query;

        // Check Redis cache first
        const userPrefix = req.authUser ? `user:${req.authUser.id}:` : "public:";
        const cacheKey = `trips:search:${userPrefix}${JSON.stringify(req.query)}`;
        const cachedData = await getCache<any>(cacheKey);
        if (cachedData) {
            res.setHeader("X-Cache", "HIT");
            res.status(200).json(cachedData);
            return;
        }

        const whereCondition: any = {};

        if (programId || programName) {
            whereCondition.program = {};
            if (programId) whereCondition.program.id = programId as string;
            if (programName) whereCondition.program.name = ILike(`%${programName}%`);
        }

        if (hospitalId || hospitalName) {
            whereCondition.hospital = {};
            if (hospitalId) whereCondition.hospital.id = hospitalId as string;
            if (hospitalName) whereCondition.hospital.name = ILike(`%${hospitalName}%`);
        }

        if (status) {
            whereCondition.status = status as string;
        }

        if (status === "PLANNED") {
            whereCondition.maxGroupCapacity = MoreThan(0);
        }

        if (location) {
            whereCondition.hospital = { location: ILike(`%${location}%`) };
        }

        if (startDate && endDate) {
            const start = new Date(startDate as string);
            const end = new Date(endDate as string);
            if (typeof endDate === "string" && !endDate.includes("T")) {
                end.setUTCHours(23, 59, 59, 999);
            }
            whereCondition.arrivalDate = Between(start, end);
        } else if (startDate) {
            whereCondition.arrivalDate = MoreThanOrEqual(new Date(startDate as string));
        } else if (endDate) {
            const end = new Date(endDate as string);
            if (typeof endDate === "string" && !endDate.includes("T")) {
                end.setUTCHours(23, 59, 59, 999);
            }
            whereCondition.arrivalDate = LessThanOrEqual(end);
        }

        const medicalTrips = await MedicalTrip.find({
            where: whereCondition,
            relations: ["hospital", "program", "bookings", "bookings.clinicalReview"],
            order: { arrivalDate: "ASC" },
        });

        // If authenticated as a patient, exclude trips that the patient has already booked in PENDING or CONFIRMED state
        let excludedTripIds: string[] = [];
        if (req.authUser && req.authUser.role === UserRole.PATIENT) {
            const activeBookings = await SurgicalBooking.find({
                where: {
                    patient: { id: req.authUser.id },
                    status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
                },
                relations: ["trip"],
            });
            excludedTripIds = activeBookings
                .filter((b) => b.trip && b.trip.id)
                .map((b) => b.trip.id);
        }

        const visibleTrips = excludedTripIds.length > 0
            ? medicalTrips.filter((m) => !excludedTripIds.includes(m.id))
            : medicalTrips;

        const responsePayload = {
            success: true,
            medicalTrips: visibleTrips.map((m) => {
                let totalRating = 0;
                let reviewCount = 0;

                if (m.bookings && m.bookings.length > 0) {
                    m.bookings.forEach((b) => {
                        if (b.clinicalReview && b.clinicalReview.length > 0) {
                            b.clinicalReview.forEach((r) => {
                                if (r.rating) {
                                    totalRating += r.rating;
                                    reviewCount += 1;
                                }
                            });
                        }
                    });
                }

                const averageRating = reviewCount > 0
                    ? Number((totalRating / reviewCount).toFixed(1))
                    : null;

                return {
                    id: m.id,
                    title: m.title,
                    description: m.description,
                    maxGroupCapacity: m.maxGroupCapacity,
                    status: m.status,
                    arrivalDate: m.arrivalDate,
                    mediaUrl: m.mediaUrl,
                    averageRating,
                    reviewCount,
                    hospital: m.hospital ? {
                        id: m.hospital.id,
                        name: m.hospital.name,
                    } : null,
                    program: m.program ? {
                        id: m.program.id,
                        name: m.program.name,
                    } : null,
                };
            }),
        };

        await setCache(cacheKey, responsePayload, 60);
        res.setHeader("X-Cache", "MISS");
        res.status(200).json(responsePayload);
    } catch (error) {
        console.error("Get all medical trips error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while fetching medical trips.",
        });
    }
};

export const getMedicalTripById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const medicalTrip = await MedicalTrip.findOne({
            where: { id },
            relations: ["hospital", "program", "bookings", "bookings.clinicalReview"],
        });

        if (!medicalTrip) {
            res.status(404).json({
                success: false,
                message: "Medical trip not found.",
            });
            return;
        }

        let totalRating = 0;
        let reviewCount = 0;

        if (medicalTrip.bookings && medicalTrip.bookings.length > 0) {
            medicalTrip.bookings.forEach((b) => {
                if (b.clinicalReview && b.clinicalReview.length > 0) {
                    b.clinicalReview.forEach((r) => {
                        if (r.rating) {
                            totalRating += r.rating;
                            reviewCount += 1;
                        }
                    });
                }
            });
        }

        const averageRating = reviewCount > 0
            ? Number((totalRating / reviewCount).toFixed(1))
            : null;

        res.status(200).json({
            success: true,
            medicalTrip: {
                id: medicalTrip.id,
                title: medicalTrip.title,
                description: medicalTrip.description,
                maxGroupCapacity: medicalTrip.maxGroupCapacity,
                status: medicalTrip.status,
                arrivalDate: medicalTrip.arrivalDate,
                mediaUrl: medicalTrip.mediaUrl,
                averageRating,
                reviewCount,
                hospital: {
                    id: medicalTrip.hospital.id,
                    name: medicalTrip.hospital.name,
                },
                program: {
                    id: medicalTrip.program.id,
                    name: medicalTrip.program.name,
                }
            },
        });
    } catch (error) {
        console.error("Get medical trip error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while fetching medical trip.",
        });
    }
};

export const updateMedicalTrip = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.authUser || req.authUser.role !== UserRole.HOSPITAL_ADMIN || !req.authUser.hospital) {
            res.status(403).json({
                success: false,
                message: "Access Denied: Only hospital administrators can edit programs.",
            });
            return;
        }

        const { id } = req.params;
        const { title, description, max_group_capacity, status, arrival_date, media_url } = req.body;

        const medicalTrip = await MedicalTrip.findOne({
            where: { id },
            relations: ["hospital", "program"],
        });

        if (!medicalTrip) {
            res.status(404).json({
                success: false,
                message: "Medical trip not found.",
            });
            return;
        }

        if (medicalTrip.hospital.id !== req.authUser.hospital.id) {
            res.status(403).json({
                success: false,
                message: "Access Denied: You can only update medical trips belonging to your hospital.",
            });
            return;
        }

        if (title !== undefined) {
            if (!title) {
                res.status(400).json({
                    success: false,
                    message: "Medical trip title cannot be empty.",
                });
                return;
            }
            const duplicate = await MedicalTrip.findOne({
                where: {
                    title,
                    program: { id: medicalTrip.program.id }
                }
            });
            if (duplicate && duplicate.id !== medicalTrip.id) {
                res.status(400).json({
                    success: false,
                    message: "A medical trip with this title already exists in your program.",
                });
                return;
            }
            medicalTrip.title = title;
        }

        if (description !== undefined) {
            medicalTrip.description = description;
        }

        if (max_group_capacity !== undefined) {
            if (!max_group_capacity) {
                res.status(400).json({
                    success: false,
                    message: "Medical trip max group capacity cannot be empty.",
                });
                return;
            }
            medicalTrip.maxGroupCapacity = max_group_capacity;
        }

        if (status !== undefined) {
            medicalTrip.status = status;
        }

        if (arrival_date !== undefined) {
            medicalTrip.arrivalDate = arrival_date;
        }

        if (media_url !== undefined) {
            medicalTrip.mediaUrl = media_url;
        }

        await medicalTrip.save();

        res.status(200).json({
            success: true,
            message: "Medical trip updated successfully.",
            medicalTrip: {
                id: medicalTrip.id,
                title: medicalTrip.title,
                description: medicalTrip.description,
                maxGroupCapacity: medicalTrip.maxGroupCapacity,
                status: medicalTrip.status,
                arrivalDate: medicalTrip.arrivalDate,
                mediaUrl: medicalTrip.mediaUrl,
                hospital: {
                    id: medicalTrip.hospital.id,
                    name: medicalTrip.hospital.name,
                },
                program: {
                    id: medicalTrip.program.id,
                    name: medicalTrip.program.name,
                }
            },
        });
    } catch (error) {
        console.error("Update medical trip error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while updating medical trip.",
        });
    }
};

export const deleteMedicalTrip = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.authUser || req.authUser.role !== UserRole.HOSPITAL_ADMIN || !req.authUser.hospital) {
            res.status(403).json({
                success: false,
                message: "Access Denied: Only hospital administrators can delete medical trips.",
            });
            return;
        }

        const { id } = req.params;

        const medicalTrip = await MedicalTrip.findOne({
            where: { id },
            relations: ["hospital", "program"],
        });

        if (!medicalTrip) {
            res.status(404).json({
                success: false,
                message: "Medical Trip not found.",
            });
            return;
        }

        if (medicalTrip.hospital.id !== req.authUser.hospital.id) {
            res.status(403).json({
                success: false,
                message: "Access Denied: You can only delete medical trips belonging to your hospital.",
            });
            return;
        }

        await medicalTrip.remove();

        res.status(200).json({
            success: true,
            message: "Medical Trip deleted successfully.",
        });
    } catch (error) {
        console.error("Delete Medical Trip error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while deleting Medical Trip.",
        });
    }
};
