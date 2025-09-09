import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CloudinaryService {
    async uploadFile(file: Express.Multer.File, folder?: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: folder || 'lessons'  , access_mode : 'public' , resource_type : 'raw' },
                 // optional folder
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                },
            );

            // convert buffer to stream
            Readable.from(file.buffer).pipe(uploadStream);
        });
    }

    async deleteFile(publicId: string): Promise<any> {
        return cloudinary.uploader.destroy(publicId);
    }
}
