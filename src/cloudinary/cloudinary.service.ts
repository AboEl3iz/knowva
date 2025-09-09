import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CloudinaryService {
    async uploadFile(file: Express.Multer.File, folder?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder || 'lessons',
        resource_type: 'raw',
        access_mode: 'public',
      },
      (error, result) => {
        if (error) return reject(error);

        // نبني رابط التحميل بإسم وامتداد محدد
        const downloadUrl = 'https://res.cloudinary.com/${cloudinary.config().cloud_name}/raw/upload/fl_attachment:${result.public_id}.pdf/v${result.version}/${result.public_id}.pdf';

        resolve({
          ...result,
          downloadUrl, // اللينك اللي بينزل كـ PDF بالامتداد
        });
      },
    );

    Readable.from(file.buffer).pipe(uploadStream);
  });
}

    async deleteFile(publicId: string): Promise<any> {
        return cloudinary.uploader.destroy(publicId);
    }
}
