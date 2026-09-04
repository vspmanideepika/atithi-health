import { Request, Response } from "express";
import { User } from "../entities/user.entity";

export const getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.authUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
            return;
        }
        res.status(200).json({
            success: true,
            user: {
                id: req.authUser.id,
                name: req.authUser.name,
                email: req.authUser.email,
                role: req.authUser.role,
                phone: req.authUser.phone,
                languagesSpoken: req.authUser.languagesSpoken,
                nationality: req.authUser.nationality,
                passportNumber: req.authUser.passportNumber,
                hospital: req.authUser.hospital ? { id: req.authUser.hospital.id, name: req.authUser.hospital.name } : null,
                program: req.authUser.program ? { id: req.authUser.program.id, name: req.authUser.program.name } : null,
                createdAt: req.authUser.createdAt,
            },
        });
    } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while fetching profile.",
        });
    }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.authUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
            return;
        }
        const { name, phone, languagesSpoken, nationality, passportNumber } = req.body;

        if (name !== undefined) req.authUser.name = name;
        if (phone !== undefined) req.authUser.phone = phone;
        if (languagesSpoken !== undefined) req.authUser.languagesSpoken = languagesSpoken;
        if (nationality !== undefined) req.authUser.nationality = nationality;
        if (passportNumber !== undefined) req.authUser.passportNumber = passportNumber;
        await req.authUser.save();
        res.status(200).json({
            success: true,
            message: "Profile updated successfully.",
            user: {
                id: req.authUser.id,
                name: req.authUser.name,
                email: req.authUser.email,
                role: req.authUser.role,
                phone: req.authUser.phone,
                languagesSpoken: req.authUser.languagesSpoken,
                nationality: req.authUser.nationality,
                passportNumber: req.authUser.passportNumber,
                hospital: req.authUser.hospital ? { id: req.authUser.hospital.id, name: req.authUser.hospital.name } : null,
                program: req.authUser.program ? { id: req.authUser.program.id, name: req.authUser.program.name } : null,
            },
        });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while updating profile.",
        });
    }
};