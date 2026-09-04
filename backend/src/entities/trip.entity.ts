import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { AppBaseEntity } from "./base.entity";
import { SurgicalBooking } from "./booking.entity";
import { User } from "./user.entity";
import { Hospital } from "./hospital.entity";
import { Program } from "./program.entity";

export enum TripStatus {
    PLANNED = "PLANNED",
    ONGOING = "ONGOING",
    COMPLETED = "COMPLETED"
}

@Entity("medical_trips")
export class MedicalTrip extends AppBaseEntity {
    @Column({ type: "varchar", length: 100 })
    title!: string;

    @Column({ type: "text" })
    description!: string;

    @ManyToOne(() => Hospital, (hospital) => hospital.trips, { onDelete: "CASCADE" })
    @JoinColumn({ name: "hospital_id" })
    hospital!: Hospital;

    @ManyToOne(() => Program, (program) => program.trips, { onDelete: "CASCADE" })
    @JoinColumn({ name: "program_id" })
    program!: Program;

    @Column({ type: "integer", default: 3, name: "max_group_capacity" })
    maxGroupCapacity!: number;

    @Column({ type: "enum", enum: TripStatus, default: TripStatus.PLANNED, name: "status" })
    status!: TripStatus;

    @Column({ type: "timestamp", name: "arrival_date" })
    arrivalDate!: Date;

    @Column({ type: "varchar", length: 255, nullable: true, name: "media_url" })
    mediaUrl!: string | null;

    @OneToMany(() => SurgicalBooking, (booking) => booking.trip)
    bookings!: SurgicalBooking[];

}
