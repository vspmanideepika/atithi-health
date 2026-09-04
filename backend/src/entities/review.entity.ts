import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { AppBaseEntity } from "./base.entity";
import { SurgicalBooking } from "./booking.entity";
import { User } from "./user.entity";

@Entity("clinical_reviews")
export class ClinicalReview extends AppBaseEntity {
    @Column({ type: "integer" })
    rating!: number;

    @Column({ type: "text", nullable: true })
    comment!: string | null;

    @ManyToOne(() => SurgicalBooking, (booking) => booking.clinicalReview)
    @JoinColumn({ name: "booking_id" })
    booking!: SurgicalBooking;

    @ManyToOne(() => User)
    @JoinColumn({ name: "patient_id" })
    patient!: User;
}