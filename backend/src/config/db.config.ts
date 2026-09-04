import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { User } from "../entities/user.entity";
import { MedicalTrip } from "../entities/trip.entity";
import { SurgicalBooking } from "../entities/booking.entity";
import { TranslationLog } from "../entities/translation.entity";
import { ClinicalReview } from "../entities/review.entity";
import { Hospital } from "../entities/hospital.entity";
import { Program } from "../entities/program.entity";

dotenv.config();

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5433"),
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "atithi_health",
    synchronize: true,
    logging: true,
    entities: [User, MedicalTrip, SurgicalBooking, TranslationLog, ClinicalReview, Hospital, Program],
});
