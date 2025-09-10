/*
  Warnings:

  - You are about to drop the column `groupId` on the `Lesson` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Lesson" DROP CONSTRAINT "Lesson_groupId_fkey";

-- AlterTable
ALTER TABLE "public"."Lesson" DROP COLUMN "groupId";

-- CreateTable
CREATE TABLE "public"."LessonGroup" (
    "id" SERIAL NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonGroup_lessonId_groupId_key" ON "public"."LessonGroup"("lessonId", "groupId");

-- AddForeignKey
ALTER TABLE "public"."LessonGroup" ADD CONSTRAINT "LessonGroup_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "public"."Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LessonGroup" ADD CONSTRAINT "LessonGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
