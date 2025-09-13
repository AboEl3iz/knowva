/*
  Warnings:

  - A unique constraint covering the columns `[quizId,studentId]` on the table `QuizAttempt` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "QuizAttempt_quizId_studentId_key" ON "public"."QuizAttempt"("quizId", "studentId");
