-- AlterTable
ALTER TABLE "judgments" ADD COLUMN     "folder_id" INTEGER;

-- AlterTable
ALTER TABLE "media" ADD COLUMN     "folder_id" INTEGER;

-- AlterTable
ALTER TABLE "research" ADD COLUMN     "folder_id" INTEGER;

-- CreateTable
CREATE TABLE "library_folders" (
    "id" SERIAL NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firm_id" INTEGER NOT NULL,

    CONSTRAINT "library_folders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "library_folders_firm_id_kind_idx" ON "library_folders"("firm_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "library_folders_firm_id_kind_name_key" ON "library_folders"("firm_id", "kind", "name");

-- AddForeignKey
ALTER TABLE "library_folders" ADD CONSTRAINT "library_folders_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "judgments" ADD CONSTRAINT "judgments_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "library_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research" ADD CONSTRAINT "research_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "library_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "library_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

