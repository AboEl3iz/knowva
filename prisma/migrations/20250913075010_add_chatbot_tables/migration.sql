-- CreateTable
CREATE TABLE "public"."ChatbotSession" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatbotSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChatbotMessage" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "aiGenerated" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatbotMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."ChatbotSession" ADD CONSTRAINT "ChatbotSession_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatbotSession" ADD CONSTRAINT "ChatbotSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatbotMessage" ADD CONSTRAINT "ChatbotMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."ChatbotSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
