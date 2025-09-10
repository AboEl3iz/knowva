-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('LESSON_ADDED', 'GROUP_JOINED', 'GROUP_LEFT', 'QUIZ_ASSIGNED', 'QUIZ_COMPLETED', 'MESSAGE_RECEIVED', 'GENERAL');

-- AlterTable
ALTER TABLE "public"."Notification" ADD COLUMN     "type" "public"."NotificationType" NOT NULL DEFAULT 'GENERAL';
