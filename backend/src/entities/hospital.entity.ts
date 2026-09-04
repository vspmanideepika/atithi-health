import { Entity, Column, OneToMany } from "typeorm";
import { AppBaseEntity } from "./base.entity";
import { User } from "./user.entity";
import { Program } from "./program.entity";
import { MedicalTrip } from "./trip.entity";

@Entity("hospitals")
export class Hospital extends AppBaseEntity {
    @Column({ type: "varchar", length: 255, unique: true, name: "name" })
    name!: string;

    @Column({ type: "varchar", length: 255, name: "location" })
    location!: string;

    @OneToMany(() => User, (user) => user.hospital)
    users!: User[];

    @OneToMany(() => Program, (program) => program.hospital)
    programs!: Program[];

    @OneToMany(() => MedicalTrip, (trip) => trip.hospital)
    trips!: MedicalTrip[];
}
