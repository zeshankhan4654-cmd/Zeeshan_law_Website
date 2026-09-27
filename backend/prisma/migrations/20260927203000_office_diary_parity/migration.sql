-- DropIndex
DROP INDEX "posts_firm_id_idx";

-- DropIndex
DROP INDEX "push_tokens_firm_id_idx";

-- DropIndex
DROP INDEX "role_caps_firm_id_idx";

-- DropIndex
DROP INDEX "roles_firm_id_idx";

-- DropIndex
DROP INDEX "settings_firm_id_idx";

-- DropIndex
DROP INDEX "testimonials_firm_id_idx";

-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "assigned_to" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "case_no" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "filed_on" DATE,
ADD COLUMN     "fir_details" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "judge" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "opposing_party" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "our_side" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "sections" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "stage" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "cnic" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "father_name" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "communications" ADD COLUMN     "case_id" INTEGER,
ADD COLUMN     "comm_time" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "created_by" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "direction" TEXT NOT NULL DEFAULT 'Received',
ADD COLUMN     "person_name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "person_number" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "person_role" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "subject" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "case_id" INTEGER,
ADD COLUMN     "created_by" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "mode" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "paid_to" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "fees" ADD COLUMN     "created_by" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "mode" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "receipt_no" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "hearings" ADD COLUMN     "attended_by" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "next_date" DATE,
ADD COLUMN     "order_sheet" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "official_fees" ADD COLUMN     "created_by" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "paid_by" TEXT NOT NULL DEFAULT 'office',
ADD COLUMN     "receipt_no" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "recovered_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "diary_tasks" (
    "id" SERIAL NOT NULL,
    "task_date" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "priority" TEXT NOT NULL DEFAULT 'Normal',
    "case_id" INTEGER,
    "client_id" INTEGER,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "done_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "firm_id" INTEGER NOT NULL,

    CONSTRAINT "diary_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "diary_tasks_firm_id_task_date_idx" ON "diary_tasks"("firm_id", "task_date");

-- CreateIndex
CREATE INDEX "diary_tasks_firm_id_done_idx" ON "diary_tasks"("firm_id", "done");

-- CreateIndex
CREATE INDEX "diary_tasks_case_id_idx" ON "diary_tasks"("case_id");

-- CreateIndex
CREATE INDEX "diary_tasks_client_id_idx" ON "diary_tasks"("client_id");

-- CreateIndex
CREATE INDEX "expenses_case_id_idx" ON "expenses"("case_id");

-- AddForeignKey
ALTER TABLE "diary_tasks" ADD CONSTRAINT "diary_tasks_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diary_tasks" ADD CONSTRAINT "diary_tasks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diary_tasks" ADD CONSTRAINT "diary_tasks_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

