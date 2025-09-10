-- CreateEnum
CREATE TYPE "public"."GroupStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- AlterTable
ALTER TABLE "public"."Group" ADD COLUMN     "status" "public"."GroupStatus" NOT NULL DEFAULT 'ACTIVE';
