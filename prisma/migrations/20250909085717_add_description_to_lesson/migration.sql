/*
  Warnings:

  - Added the required column `description` to the `Lesson` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Lesson" ADD COLUMN     "description" TEXT NOT NULL;
