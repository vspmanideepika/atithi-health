import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from "typeorm";
import { AppBaseEntity } from "./base.entity";
import { MedicalTrip } from "./trip.entity";
import { SurgicalBooking } from "./booking.entity";
import { Hospital } from "./hospital.entity";
import { Program } from "./program.entity";

export enum UserRole {
    PATIENT = "PATIENT",
    ATTENDANT = "ATTENDANT",
    HOSPITAL_ADMIN = "HOSPITAL_ADMIN",
    ADMIN = "ADMIN",
}

@Entity("users")
export class User extends AppBaseEntity {

    @Column({ type: "varchar", length: 100 })
    name!: string;

    @Column({ type: "varchar", length: 255, unique: true })
    email!: string;

    @Column({ type: "varchar", length: 255, select: false })
    password!: string;

    @Column({ type: "varchar", length: 20, nullable: true })
    phone!: string | null;

    @Column({ type: "enum", enum: UserRole, default: UserRole.PATIENT, name: "role" })
    role!: UserRole;

    @Column({ type: "simple-array", nullable: true, name: "languages_spoken" })
    languagesSpoken!: string[] | null;

    @Column({ type: "varchar", length: 100, nullable: true, name: "nationality" })
    nationality!: string | null;

    @Column({ type: "varchar", length: 100, nullable: true, name: "passport_number" })
    passportNumber!: string | null;

    @OneToMany(() => SurgicalBooking, (booking) => booking.patient)
    bookings!: SurgicalBooking[];

    @OneToMany(() => SurgicalBooking, (booking) => booking.attendant)
    coordinatedBookings!: SurgicalBooking[];

    @ManyToOne(() => Hospital, (hospital) => hospital.users, { nullable: true, onDelete: "SET NULL" })
    @JoinColumn({ name: "hospital_id" })
    hospital!: Hospital | null;

    @ManyToOne(() => Program, (program) => program.users, { nullable: true, onDelete: "SET NULL" })
    @JoinColumn({ name: "program_id" })
    program!: Program | null;
}
