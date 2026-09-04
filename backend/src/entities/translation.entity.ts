import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { AppBaseEntity } from "./base.entity";
import { SurgicalBooking } from "./booking.entity";

@Entity("translation_logs")
export class TranslationLog extends AppBaseEntity {
    @Column({ type: "varchar", length: 50, name: "original_language" })
    originalLanguage!: string;

    @Column({ type: "varchar", length: 50, name: "translated_language" })
    translatedLanguage!: string;

    @Column({ type: "varchar", length: 255, nullable: true, name: "discharge_summary_translation_url" })
    dischargeSummaryTranslationUrl!: string | null;

    @ManyToOne(() => SurgicalBooking, (booking) => booking.translations)
    @JoinColumn({ name: "booking_id" })
    booking!: SurgicalBooking;

}