/*
  Warnings:

  - The `status` column on the `Quiz` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."QuizStatus" AS ENUM ('DRAFT', 'PUBLIC');

-- AlterTable
ALTER TABLE "public"."Quiz" DROP COLUMN "status",
ADD COLUMN     "status" "public"."QuizStatus" NOT NULL DEFAULT 'DRAFT';
