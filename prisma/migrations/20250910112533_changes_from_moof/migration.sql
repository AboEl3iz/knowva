/*
  Warnings:

  - You are about to drop the column `canChangeAnswer` on the `Quiz` table. All the data in the column will be lost.
  - Added the required column `quizId` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `durationMins` to the `Quiz` table without a default value. This is not possible if the table is not empty.
  - Added the required column `language` to the `Quiz` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."Language" AS ENUM ('en', 'ar');

-- AlterTable
ALTER TABLE "public"."Question" ADD COLUMN     "quizId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."Quiz" DROP COLUMN "canChangeAnswer",
ADD COLUMN     "durationMins" INTEGER NOT NULL,
ADD COLUMN     "language" "public"."Language" NOT NULL;

-- AlterTable
ALTER TABLE "public"."QuizAttempt" ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."StudentAnswer" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "public"."AttemptFeedback" (
    "id" SERIAL NOT NULL,
    "attemptId" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "weakPoints" TEXT[],
    "goodPoints" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttemptFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuestionFeedback" (
    "id" SERIAL NOT NULL,
    "questionAnswerId" INTEGER NOT NULL,
    "attemptFeedbackId" INTEGER NOT NULL,

    CONSTRAINT "QuestionFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentFeedback" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "progress" TEXT NOT NULL,
    "summaryFeedback" TEXT NOT NULL,
    "strongPoints" TEXT[],
    "weakPoints" TEXT[],
    "improvedPoints" TEXT[],
    "declinedPoints" TEXT[],
    "unchangedPoints" TEXT[],
    "scoreTrend" INTEGER[],
    "riskLevel" TEXT NOT NULL,
    "teachingRecommendation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER,

    CONSTRAINT "StudentFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttemptFeedback_attemptId_key" ON "public"."AttemptFeedback"("attemptId");

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "public"."Quiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttemptFeedback" ADD CONSTRAINT "AttemptFeedback_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "public"."QuizAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionFeedback" ADD CONSTRAINT "QuestionFeedback_questionAnswerId_fkey" FOREIGN KEY ("questionAnswerId") REFERENCES "public"."StudentAnswer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionFeedback" ADD CONSTRAINT "QuestionFeedback_attemptFeedbackId_fkey" FOREIGN KEY ("attemptFeedbackId") REFERENCES "public"."AttemptFeedback"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentFeedback" ADD CONSTRAINT "StudentFeedback_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentFeedback" ADD CONSTRAINT "StudentFeedback_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentFeedback" ADD CONSTRAINT "StudentFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
