import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CloudinaryService {
  async uploadFile(file: Express.Multer.File, folder?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder || 'lessons',
          resource_type: 'raw',      // Required for PDFs, ZIPs, DOCs, etc.
          use_filename: true,
          unique_filename: false,
        },
        (error, result) => {
          if (error) return reject(error);

          // Correct download URL for raw files
          const downloadUrl = `https://res.cloudinary.com/${cloudinary.config().cloud_name}/raw/upload/${result!.public_id}?attachment=${encodeURIComponent(file.originalname)}`;

          Logger.log(
            `File uploaded to Cloudinary.
             Secure URL: ${result!.secure_url},
             Download URL: ${downloadUrl},
             Public ID: ${result!.public_id}`
          );

          resolve({
            public_id: result!.public_id,
            secure_url: result!.secure_url, // direct access / preview
            downloadUrl,                    // download with proper filename
          });
        }
      );

      // Convert buffer to stream and pipe to Cloudinary
      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  async deleteFile(publicId: string): Promise<any> {
    return cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
  }
}
