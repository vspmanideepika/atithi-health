import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { AppBaseEntity } from "./base.entity";
import { MedicalTrip } from "./trip.entity";
import { User } from "./user.entity";
import { TranslationLog } from "./translation.entity";
import { ClinicalReview } from "./review.entity"
export enum BookingStatus {
    PENDING = "PENDING",
    CONFIRMED = "CONFIRMED",
    CANCELLED = "CANCELLED",
    COMPLETED = "COMPLETED"
}

@Entity("surgical_bookings")
export class SurgicalBooking extends AppBaseEntity {
    @Column({ type: "timestamp", name: "surgery_date" })
    surgeryDate!: Date;

    @Column({ type: "varchar", length: 100, name: "hospital_name" })
    hospitalName!: string;

    @Column({ type: "integer", default: 1, name: "group_size" })
    groupSize!: number;

    @Column({ type: "varchar", length: 50, default: "English", name: "requested_language" })
    requestedLanguage!: string;

    @Column({ type: "enum", enum: BookingStatus, default: BookingStatus.PENDING, name: "status" })
    status!: BookingStatus;

    @Column({ type: "varchar", length: 255, nullable: true, name: "patient_history_url" })
    patientHistoryUrl!: string | null;

    @ManyToOne(() => User, (user) => user.bookings)
    @JoinColumn({ name: "patient_id" })
    patient!: User;

    @ManyToOne(() => MedicalTrip, (trip) => trip.bookings)
    @JoinColumn({ name: "trip_id" })
    trip!: MedicalTrip;

    @OneToMany(() => TranslationLog, (log) => log.booking)
    translations!: TranslationLog[];

    @OneToMany(() => ClinicalReview, (review) => review.booking)
    clinicalReview!: ClinicalReview[];

    @ManyToOne(() => User, (user) => user.coordinatedBookings, { nullable: true, onDelete: "SET NULL" })
    @JoinColumn({ name: "attendant_id" })
    attendant!: User | null;
}