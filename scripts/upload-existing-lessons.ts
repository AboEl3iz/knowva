import { PrismaClient } from "@prisma/client";
import axios from "axios";

async function uploadExistingLessons(prisma: PrismaClient) {
  // هات كل الدروس مع الـ groups
  const lessons = await prisma.lesson.findMany({
    include: { groups: { include: { group: true } } }
  });

  for (const lesson of lessons) {
    for (const lessonGroup of lesson.groups) {
      const aiPayload = {
        group_id: lessonGroup.groupId.toString(),
        pdf_path: lesson.url
      };

      try {
        console.log(`Uploading lesson ${lesson.id} to AI model for group ${lessonGroup.groupId}`);
        await axios.post(
          'https://8080-01k4nxc27xwgyn4vsge9kda40b.cloudspaces.litng.ai/ai/embedding/upload-document',
          aiPayload,
          { headers: { 'Content-Type': 'application/json' } }
        );
      } catch (e) {
        console.error(`Failed to upload lesson ${lesson.id} for group ${lessonGroup.groupId}:`, e.message);
      }
    }
  }
}

uploadExistingLessons(new PrismaClient());