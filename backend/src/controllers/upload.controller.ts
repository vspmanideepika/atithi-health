import { Request, Response } from "express";

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({
                success: false,
                message: "No file uploaded. Please select a valid file.",
            });
            return;
        }

        const fileUrl = `/uploads/${req.file.filename}`;

        res.status(200).json({
            success: true,
            message: "File uploaded successfully.",
            url: fileUrl,
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size,
        });
    } catch (error) {
        console.error("Upload file error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while uploading file.",
        });
    }
};
