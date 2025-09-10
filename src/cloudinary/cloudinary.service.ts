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
  async uploadFile(
    file: Express.Multer.File,
    folder?: string,
    options?: {
      allowedTypes?: string[]; // Optional file type restrictions
      maxSize?: number;        // Max file size in bytes
      resourceType?: 'auto' | 'image' | 'video' | 'raw'; // Cloudinary resource type
    }
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      // Validate file type if restrictions are provided
      if (options?.allowedTypes) {
        const extension = file.originalname.split('.').pop()?.toLowerCase();
        if (!extension || !options.allowedTypes.includes(extension)) {
          return reject(new Error(`File type .${extension} not allowed. Allowed types: ${options.allowedTypes.join(', ')}`));
        }
      }

      // Validate file size
      if (options?.maxSize && file.size > options.maxSize) {
        return reject(new Error(`File size ${file.size} bytes exceeds maximum allowed size ${options.maxSize} bytes`));
      }

      // Determine resource type based on file extension
      const extension = file.originalname.split('.').pop()?.toLowerCase();
      let resourceType = options?.resourceType || 'raw'; // Default to 'raw' for universal support

      if (resourceType === 'auto') {
        const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
        const videoTypes = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'];

        if (imageTypes.includes(extension || '')) {
          resourceType = 'image';
        } else if (videoTypes.includes(extension || '')) {
          resourceType = 'video';
        } else {
          resourceType = 'raw'; // Documents, PDFs, audio, etc.
        }
      }

      // Generate a unique public_id based on original filename + timestamp
      const originalName = file.originalname.split('.').slice(0, -1).join('.');
      const timestamp = Date.now();
      const publicId = `${folder || 'uploads'}/${originalName}_${timestamp}`;

      Logger.log(`Uploading file: ${file.originalname} (${file.size} bytes) as ${resourceType}`);

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          public_id: publicId,
          // Additional options based on file type
          ...(resourceType === 'image' && {
            transformation: [
              { quality: 'auto', fetch_format: 'auto' }, // Optimize images
            ]
          }),
          ...(resourceType === 'video' && {
            video_codec: 'auto',
            quality: 'auto',
          })
        },
        (error, result) => {
          if (error) {
            Logger.error('Cloudinary upload error:', error);
            return reject(error);
          }

          // Construct download URL with proper filename & extension
          const downloadUrl = `https://res.cloudinary.com/${cloudinary.config().cloud_name}/${resourceType}/upload/${publicId}?attachment=${encodeURIComponent(file.originalname)}`;

          Logger.log(
            `File uploaded successfully to Cloudinary:
          Type: ${resourceType}
          Original: ${file.originalname}
          Size: ${file.size} bytes
          Secure URL: ${result!.secure_url}
          Download URL: ${downloadUrl}
          Public ID: ${publicId}`
          );

          resolve({
            public_id: publicId,
            secure_url: result!.secure_url, // direct access / preview
            downloadUrl,                    // download with original filename
            resource_type: resourceType,
            file_size: file.size,
            original_filename: file.originalname,
            format: extension,
          });
        }
      );

      // Pipe the file buffer to Cloudinary
      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

 
  async uploadLessonFile(file: Express.Multer.File): Promise<any> {
    return this.uploadFile(file, 'lessons', {
      allowedTypes: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'mp4', 'mp3'],
      maxSize: 50 * 1024 * 1024, // 50MB limit
      resourceType: 'auto'
    });
  }

  async uploadChatMedia(file: Express.Multer.File): Promise<any> {
    return this.uploadFile(file, 'chat-media', {
      allowedTypes: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mp3', 'wav', 'pdf', 'doc', 'docx'],
      maxSize: 25 * 1024 * 1024, // 25MB limit
      resourceType: 'auto'
    });
  }

  async uploadProfileImage(file: Express.Multer.File): Promise<any> {
    return this.uploadFile(file, 'profiles', {
      allowedTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      maxSize: 5 * 1024 * 1024, 
      resourceType: 'image'
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
