import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, UserRole } from "../entities/user.entity";
import { Hospital } from "../entities/hospital.entity";
import { Program } from "../entities/program.entity";

const JWT_SECRET = process.env.JWT_SECRET || "atithi_health_secret_key";

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            name,
            email,
            password,
            phone,
            languagesSpoken,
            nationality,
            passportNumber,
        } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({
                success: false,
                message: "Missing required fields: name, email, and password are required.",
            });
            return;
        }
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            res.status(400).json({
                success: false,
                message: "A user with this email already exists.",
            });
            return;
        }
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const user = new User();
        user.name = name;
        user.email = email;
        user.password = hashedPassword;
        user.role = UserRole.PATIENT;
        user.phone = phone || null;
        user.languagesSpoken = languagesSpoken || null;
        user.nationality = nationality || null;
        user.passportNumber = passportNumber || null;
        await user.save();
        res.status(201).json({
            success: true,
            message: "User registered successfully.",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error during registration.",
        });
    }
};
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: "Please provide both email and password.",
            });
            return;
        }
        const user = await User.findOne({
            where: { email },
            select: ["id", "name", "email", "password", "role"],
            relations: ["hospital", "program"],
        });
        if (!user) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
            return;
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
            return;
        }
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role,
            },
            JWT_SECRET,
            { expiresIn: "24h" }
        );
        res.status(200).json({
            success: true,
            message: "Login successful.",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                hospital: user.hospital ? { id: user.hospital.id, name: user.hospital.name } : null,
                program: user.program ? { id: user.program.id, name: user.program.name } : null,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error during login.",
        });
    }
};