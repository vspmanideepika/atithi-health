import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { Hospital } from "../entities/hospital.entity";
import { Program } from "../entities/program.entity";
import { User, UserRole } from "../entities/user.entity";

export const createHospital = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            name,
            location,
            programs,
            repName,
            repEmail,
            repPassword,
        } = req.body;


        if (!name || !location || !repName || !repEmail || !repPassword) {
            res.status(400).json({
                success: false,
                message: "Missing required onboarding fields. Please fill in all fields.",
            });
            return;
        }

        const existingHospital = await Hospital.findOne({ where: { name } });
        if (existingHospital) {
            res.status(400).json({
                success: false,
                message: "A hospital with this name is already registered.",
            });
            return;
        }

        const existingUser = await User.findOne({ where: { email: repEmail } });
        if (existingUser) {
            res.status(400).json({
                success: false,
                message: "A user account with this representative email already exists.",
            });
            return;
        }

        const hospital = new Hospital();
        hospital.name = name;
        hospital.location = location;
        await hospital.save();
        const savedPrograms: Program[] = [];
        if (programs && Array.isArray(programs)) {
            for (const progName of programs) {
                const program = new Program();
                program.name = progName;
                program.hospital = hospital;
                await program.save();
                savedPrograms.push(program);
            }
        }
        const hashedRepPassword = await bcrypt.hash(repPassword, 10);
        const repUser = new User();
        repUser.name = repName;
        repUser.email = repEmail;
        repUser.password = hashedRepPassword;
        repUser.role = UserRole.HOSPITAL_ADMIN;
        repUser.hospital = hospital;
        await repUser.save();

        res.status(201).json({
            success: true,
            message: "Hospital and administrator account registered successfully.",
            hospital: {
                id: hospital.id,
                name: hospital.name,
                location: hospital.location,
                programs: savedPrograms.map((p) => ({ id: p.id, name: p.name })),
            },
            representative: {
                id: repUser.id,
                name: repUser.name,
                email: repUser.email,
                role: repUser.role,
            },
        });
    } catch (error) {
        console.error("Create hospital onboarding error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error during hospital onboarding.",
        });
    }
};

export const getAllHospitals = async (req: Request, res: Response): Promise<void> => {
    try {
        const hospitals = await Hospital.find({
            relations: ["programs"],
            order: { name: "ASC" },
        });

        res.status(200).json({
            success: true,
            hospitals: hospitals.map((h) => ({
                id: h.id,
                name: h.name,
                location: h.location,
                programs: h.programs.map((p) => ({ id: p.id, name: p.name })),
            })),
        });
    } catch (error) {
        console.error("Get all hospitals error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while fetching hospitals.",
        });
    }
};

export const getHospital = async (req: Request, res: Response): Promise<void> => {
    try {
        const hospital = await Hospital.findOne({
            where: { id: req.authUser?.hospital?.id },
        });

        if (!hospital) {
            res.status(404).json({
                success: false,
                message: "Hospital not found.",
            });
            return;
        }

        res.status(200).json({
            success: true,
            hospital: {
                id: hospital.id,
                name: hospital.name,
                location: hospital.location
            },
        });
    } catch (error) {
        console.error("Get hospital error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while fetching hospital.",
        });
    }
};

export const getAttendants = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.authUser || !req.authUser.hospital) {
            res.status(400).json({
                success: false,
                message: "Hospital information is missing from session.",
            });
            return;
        }

        const attendants = await User.find({
            where: {
                hospital: { id: req.authUser.hospital.id },
                role: UserRole.ATTENDANT,
            },
            order: { name: "ASC" },
        });

        if (!attendants) {
            res.status(404).json({
                success: false,
                message: "Attendants not found.",
            });
            return;
        }

        res.status(200).json({
            success: true,
            attendants: attendants.map((a) => ({
                id: a.id,
                name: a.name,
                email: a.email,
            })),
        });
    } catch (error) {
        console.error("Get attendants error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while fetching attendants.",
        });
    }
};

export const createAttendant = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.authUser || req.authUser.role !== UserRole.HOSPITAL_ADMIN || !req.authUser.hospital) {
            res.status(403).json({
                success: false,
                message: "Access Denied: Only hospital administrators can register attendants.",
            });
            return;
        }

        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            res.status(400).json({
                success: false,
                message: "Missing required coordinator fields: name, email and password are required.",
            });
            return;
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            res.status(400).json({
                success: false,
                message: "A user account with this email already exists.",
            });
            return;
        }

        const hashedPass = await bcrypt.hash(password, 10);
        const attendant = new User();
        attendant.name = name;
        attendant.email = email;
        attendant.password = hashedPass;
        attendant.role = UserRole.ATTENDANT;
        attendant.hospital = req.authUser.hospital;
        await attendant.save();

        res.status(201).json({
            success: true,
            message: "Attendant/Coordinator registered successfully under your hospital.",
            attendant: {
                id: attendant.id,
                name: attendant.name,
                email: attendant.email,
                role: attendant.role,
                hospital: req.authUser.hospital.name
            },
        });
    } catch (error) {
        console.error("Create attendant error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while registering attendant.",
        });
    }
};

export const updateHospital = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.authUser || req.authUser.role !== UserRole.HOSPITAL_ADMIN || !req.authUser.hospital) {
            res.status(403).json({
                success: false,
                message: "Access Denied: Only hospital administrators can edit hospitals.",
            });
            return;
        }

        const { name, location } = req.body;

        if (!name || !location) {
            res.status(400).json({
                success: false,
                message: "Missing required fields: name and location are required.",
            });
            return;
        }

        const hospital = await Hospital.findOne({ where: { id: req.authUser.hospital.id } });
        if (!hospital) {
            res.status(404).json({
                success: false,
                message: "Hospital not found.",
            });
            return;
        }

        hospital.name = name;
        hospital.location = location;
        await hospital.save();

        res.status(201).json({
            success: true,
            message: "Hospital details updated successfully.",
            hospital: {
                id: hospital.id,
                name: hospital.name,
                location: hospital.location,
                hospital: req.authUser.hospital.name
            },
        });
    } catch (error) {
        console.error("Update hospital error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while updating hospital.",
        });
    }
};
