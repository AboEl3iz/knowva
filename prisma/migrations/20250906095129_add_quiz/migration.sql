/*
  Warnings:

  - You are about to drop the column `mode` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `User` table. All the data in the column will be lost.
  - The `gender` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[quizAttemptId,questionId]` on the table `StudentAnswer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `mode` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endsAt` to the `Quiz` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startsAt` to the `Quiz` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "public"."QuestionMode" AS ENUM ('MANUAL', 'AI');

-- AlterTable
ALTER TABLE "public"."Question" ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "mode" "public"."QuestionMode" NOT NULL;

-- AlterTable
ALTER TABLE "public"."Quiz" DROP COLUMN "mode",
ADD COLUMN     "canChangeAnswer" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "endsAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startsAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."QuizAttempt" ALTER COLUMN "score" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "imageUrl",
DROP COLUMN "gender",
ADD COLUMN     "gender" "public"."Gender";

-- DropEnum
DROP TYPE "public"."QuizMode";

-- CreateIndex
CREATE INDEX "Question_id_createdById_idx" ON "public"."Question"("id", "createdById");

-- CreateIndex
CREATE INDEX "Quiz_id_createdById_idx" ON "public"."Quiz"("id", "createdById");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAnswer_quizAttemptId_questionId_key" ON "public"."StudentAnswer"("quizAttemptId", "questionId");

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
