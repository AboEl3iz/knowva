import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CloudinaryService {
  /**
   * Upload a file to Cloudinary (raw) with a unique public_id
   * @param file Express.Multer.File
   * @param folder optional folder name
   */
  async uploadFile(file: Express.Multer.File, folder?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // Generate a unique public_id based on original filename + timestamp
      const originalName = file.originalname.split('.').slice(0, -1).join('.');
      const extension = file.originalname.split('.').pop();
      const timestamp = Date.now();
      const publicId = `${folder || 'lessons'}/${originalName}_${timestamp}`;

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          public_id: publicId,
        },
        (error, result) => {
          if (error) return reject(error);

          // Construct download URL with proper filename & extension
          const downloadUrl = `https://res.cloudinary.com/${cloudinary.config().cloud_name}/raw/upload/${publicId}?attachment=${encodeURIComponent(file.originalname)}`;

          Logger.log(
            `File uploaded to Cloudinary.
Secure URL: ${result!.secure_url}
Download URL: ${downloadUrl}
Public ID: ${publicId}`
          );

          resolve({
            public_id: publicId,
            secure_url: result!.secure_url, // direct access / preview
            downloadUrl,                    // download with original filename
          });
        }
      );

      // Pipe the file buffer to Cloudinary
      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  /**
   * Delete a file from Cloudinary
   * @param publicId string
   */
  async deleteFile(publicId: string): Promise<any> {
    return cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
  }
}
