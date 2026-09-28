-- CreateTable
CREATE TABLE "fee_reminders" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER NOT NULL,
    "case_id" INTEGER,
    "amount" DECIMAL(12,2) NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "opened_by" TEXT NOT NULL DEFAULT '',
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firm_id" INTEGER NOT NULL,

    CONSTRAINT "fee_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fee_reminders_firm_id_client_id_idx" ON "fee_reminders"("firm_id", "client_id");

-- CreateIndex
CREATE INDEX "fee_reminders_firm_id_case_id_idx" ON "fee_reminders"("firm_id", "case_id");

-- AddForeignKey
ALTER TABLE "fee_reminders" ADD CONSTRAINT "fee_reminders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_reminders" ADD CONSTRAINT "fee_reminders_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_reminders" ADD CONSTRAINT "fee_reminders_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

