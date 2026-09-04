import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { AppBaseEntity } from "./base.entity";
import { Hospital } from "./hospital.entity";
import { User } from "./user.entity";
import { MedicalTrip } from "./trip.entity";

@Entity("programs")
export class Program extends AppBaseEntity {
    @Column({ type: "varchar", length: 100, name: "name" })
    name!: string;

    @Column({ type: "text", nullable: true, name: "description" })
    description?: string;

    @ManyToOne(() => Hospital, (hospital) => hospital.programs, { onDelete: "CASCADE" })
    @JoinColumn({ name: "hospital_id" })
    hospital!: Hospital;

    @OneToMany(() => User, (user) => user.program)
    users!: User[];

    @OneToMany(() => MedicalTrip, (trip) => trip.program)
    trips!: MedicalTrip[];
}
