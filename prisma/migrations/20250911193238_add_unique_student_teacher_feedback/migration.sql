/*
  Warnings:

  - A unique constraint covering the columns `[studentId,teacherId]` on the table `StudentFeedback` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "StudentFeedback_studentId_teacherId_key" ON "public"."StudentFeedback"("studentId", "teacherId");
