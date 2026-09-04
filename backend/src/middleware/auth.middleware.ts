import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, UserRole } from "../entities/user.entity";

export interface JwtPayload {
    userId: string;
    email: string;
    role: UserRole;
}

declare global {
    namespace Express {
        interface Request {
            authUser?: User;
        }
    }
}

const JWT_SECRET = process.env.JWT_SECRET || "atithi_health_secret_key";

export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                success: false,
                message: "Access denied. No token provided.",
            });
            return;
        }

        const token = authHeader.split(" ")[1];
        let decoded: JwtPayload;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        } catch (jwtError) {
            if (jwtError instanceof jwt.TokenExpiredError) {
                res.status(401).json({
                    success: false,
                    message: "Token has expired. Please log in again.",
                });
                return;
            }

            res.status(401).json({
                success: false,
                message: "Invalid token.",
            });
            return;
        }

        const user = await User.findOne({
            where: { id: decoded.userId },
            relations: ["hospital", "program"]
        });

        if (!user) {
            res.status(401).json({
                success: false,
                message: "User associated with this token no longer exists.",
            });
            return;
        }

        req.authUser = user;
        next();
    } catch (error) {
        console.error("Authentication middleware error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error during authentication.",
        });
    }
};

export const authorize = (...allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.authUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required before authorization.",
            });
            return;
        }

        if (!allowedRoles.includes(req.authUser.role)) {
            res.status(403).json({
                success: false,
                message: `Access denied. Required role(s): ${allowedRoles.join(", ")}.`,
            });
            return;
        }

        next();
    };
};

export const optionalAuthenticate = async (
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next();
        }

        const token = authHeader.split(" ")[1];
        let decoded: JwtPayload;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        } catch {
            return next();
        }

        const user = await User.findOne({
            where: { id: decoded.userId },
            relations: ["hospital", "program"]
        });

        if (user) {
            req.authUser = user;
        }
        next();
    } catch {
        next();
    }
};

