import "reflect-metadata";
import * as dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";
import { AppDataSource } from "./config/db.config";
import { connectRedis } from "./config/redis.config";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import hospitalRoutes from "./routes/hospital.routes";
import programRoutes from "./routes/program.routes";
import tripRoutes from "./routes/trip.routes";
import uploadRoutes from "./routes/upload.routes";
import bookingRoutes from "./routes/booking.routes";
import translationRoutes from "./routes/translation.routes";
import adminRoutes from "./routes/admin.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve static uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/health", (req, res) => {
    res.json({ status: "OK", message: "Server is running!" });
});

AppDataSource.initialize()
    .then(async () => {
        await connectRedis();
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("Database connection error: ", error);
    });

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/programs", programRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/translations", translationRoutes);
app.use("/api/admin", adminRoutes);