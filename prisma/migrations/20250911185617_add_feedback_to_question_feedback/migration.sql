/*
  Warnings:

  - Added the required column `feedback` to the `QuestionFeedback` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."QuestionFeedback" ADD COLUMN     "feedback" TEXT NOT NULL;
