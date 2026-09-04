import { Request, Response } from "express";
import { Program } from "../entities/program.entity";
import { Hospital } from "../entities/hospital.entity";
import { UserRole } from "../entities/user.entity";

export const createProgram = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.authUser || req.authUser.role !== UserRole.HOSPITAL_ADMIN || !req.authUser.hospital) {
            res.status(403).json({
                success: false,
                message: "Access Denied: Only hospital administrators can register programs.",
            });
            return;
        }

        const { name, description } = req.body;

        if (!name) {
            res.status(400).json({
                success: false,
                message: "Missing required program field: name is required.",
            });
            return;
        }

        const existingProgram = await Program.findOne({
            where: {
                name,
                hospital: { id: req.authUser.hospital.id }
            }
        });

        if (existingProgram) {
            res.status(400).json({
                success: false,
                message: "A program with this name is already registered for your hospital.",
            });
            return;
        }

        const program = new Program();
        program.name = name;
        program.description = description;
        program.hospital = req.authUser.hospital;
        await program.save();

        res.status(201).json({
            success: true,
            message: "Program registered successfully.",
            program: {
                id: program.id,
                name: program.name,
                description: program.description,
                hospital: {
                    id: req.authUser.hospital.id,
                    name: req.authUser.hospital.name,
                }
            },
        });
    } catch (error) {
        console.error("Create program error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while registering program.",
        });
    }
};

export const getAllPrograms = async (req: Request, res: Response): Promise<void> => {
    try {
        const { hospitalId } = req.query;

        const findOptions: any = {
            relations: ["hospital"],
            order: { name: "ASC" },
        };

        if (hospitalId) {
            findOptions.where = { hospital: { id: hospitalId as string } };
        }

        const programs = await Program.find(findOptions);

        res.status(200).json({
            success: true,
            programs: programs.map((p) => ({
                id: p.id,
                name: p.name,
                description: p.description,
                hospital: {
                    id: p.hospital.id,
                    name: p.hospital.name,
                }
            })),
        });
    } catch (error) {
        console.error("Get all programs error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while fetching programs.",
        });
    }
};

export const getProgramById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const program = await Program.findOne({
            where: { id },
            relations: ["hospital"],
        });

        if (!program) {
            res.status(404).json({
                success: false,
                message: "Program not found.",
            });
            return;
        }

        res.status(200).json({
            success: true,
            program: {
                id: program.id,
                name: program.name,
                description: program.description,
                hospital: {
                    id: program.hospital.id,
                    name: program.hospital.name,
                }
            },
        });
    } catch (error) {
        console.error("Get program error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while fetching program.",
        });
    }
};

export const updateProgram = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.authUser || req.authUser.role !== UserRole.HOSPITAL_ADMIN || !req.authUser.hospital) {
            res.status(403).json({
                success: false,
                message: "Access Denied: Only hospital administrators can edit programs.",
            });
            return;
        }

        const { id } = req.params;
        const { name, description } = req.body;

        const program = await Program.findOne({
            where: { id },
            relations: ["hospital"],
        });

        if (!program) {
            res.status(404).json({
                success: false,
                message: "Program not found.",
            });
            return;
        }

        if (program.hospital.id !== req.authUser.hospital.id) {
            res.status(403).json({
                success: false,
                message: "Access Denied: You can only update programs belonging to your hospital.",
            });
            return;
        }

        if (name !== undefined) {
            if (!name) {
                res.status(400).json({
                    success: false,
                    message: "Program name cannot be empty.",
                });
                return;
            }
            const duplicate = await Program.findOne({
                where: {
                    name,
                    hospital: { id: req.authUser.hospital.id }
                }
            });
            if (duplicate && duplicate.id !== program.id) {
                res.status(400).json({
                    success: false,
                    message: "A program with this name already exists in your hospital.",
                });
                return;
            }
            program.name = name;
        }

        if (description !== undefined) {
            program.description = description;
        }

        await program.save();

        res.status(200).json({
            success: true,
            message: "Program updated successfully.",
            program: {
                id: program.id,
                name: program.name,
                description: program.description,
                hospital: {
                    id: program.hospital.id,
                    name: program.hospital.name,
                }
            },
        });
    } catch (error) {
        console.error("Update program error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while updating program.",
        });
    }
};

export const deleteProgram = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.authUser || req.authUser.role !== UserRole.HOSPITAL_ADMIN || !req.authUser.hospital) {
            res.status(403).json({
                success: false,
                message: "Access Denied: Only hospital administrators can delete programs.",
            });
            return;
        }

        const { id } = req.params;

        const program = await Program.findOne({
            where: { id },
            relations: ["hospital"],
        });

        if (!program) {
            res.status(404).json({
                success: false,
                message: "Program not found.",
            });
            return;
        }

        if (program.hospital.id !== req.authUser.hospital.id) {
            res.status(403).json({
                success: false,
                message: "Access Denied: You can only delete programs belonging to your hospital.",
            });
            return;
        }

        await program.remove();

        res.status(200).json({
            success: true,
            message: "Program deleted successfully.",
        });
    } catch (error) {
        console.error("Delete program error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while deleting program.",
        });
    }
};
