import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { v2 as cloudinary } from 'cloudinary';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Storage configuration
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local'; // 'local', 'cloudinary', 'wasabi'
const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Cloudinary configuration
if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}

// Wasabi/S3 configuration
let s3Client: S3Client | null = null;
if (process.env.WASABI_ACCESS_KEY) {
    s3Client = new S3Client({
        endpoint: process.env.WASABI_ENDPOINT || 'https://s3.wasabisys.com',
        region: process.env.WASABI_REGION || 'us-east-1',
        credentials: {
            accessKeyId: process.env.WASABI_ACCESS_KEY,
            secretAccessKey: process.env.WASABI_SECRET_KEY || '',
        },
    });
}

export interface UploadResult {
    url: string;
    publicId: string;
    width?: number;
    height?: number;
    size: number;
}

/**
 * Optimize image with Sharp
 */
const optimizeImage = async (buffer: Buffer): Promise<Buffer> => {
    return sharp(buffer)
        .resize(1200, 1200, {
            fit: 'inside',
            withoutEnlargement: true,
        })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();
};

/**
 * Upload to local storage
 */
const uploadToLocal = async (
    buffer: Buffer,
    folder: string,
    filename: string
): Promise<UploadResult> => {
    // Create directory if it doesn't exist
    const uploadPath = path.join(UPLOAD_DIR, folder);
    await fs.mkdir(uploadPath, { recursive: true });

    // Optimize image
    const optimizedBuffer = await optimizeImage(buffer);

    // Save file
    const filePath = path.join(uploadPath, filename);
    await fs.writeFile(filePath, optimizedBuffer);

    // Get file stats
    const stats = await fs.stat(filePath);
    const metadata = await sharp(optimizedBuffer).metadata();

    return {
        url: `/uploads/${folder}/${filename}`,
        publicId: filename,
        width: metadata.width,
        height: metadata.height,
        size: stats.size,
    };
};

/**
 * Upload to Cloudinary
 */
const uploadToCloudinary = async (
    buffer: Buffer,
    folder: string
): Promise<UploadResult> => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: `rtm/${folder}`,
                resource_type: 'image',
                transformation: [
                    { width: 1200, height: 1200, crop: 'limit' },
                    { quality: 'auto:good' },
                ],
            },
            (error, result) => {
                if (error) return reject(error);
                if (!result) return reject(new Error('Upload failed'));

                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                    width: result.width,
                    height: result.height,
                    size: result.bytes,
                });
            }
        );

        uploadStream.end(buffer);
    });
};

/**
 * Upload to Wasabi/S3
 */
const uploadToWasabi = async (
    buffer: Buffer,
    folder: string,
    filename: string
): Promise<UploadResult> => {
    if (!s3Client) {
        throw new Error('Wasabi/S3 client not configured');
    }

    // Optimize image
    const optimizedBuffer = await optimizeImage(buffer);
    const metadata = await sharp(optimizedBuffer).metadata();

    const key = `${folder}/${filename}`;
    const command = new PutObjectCommand({
        Bucket: process.env.WASABI_BUCKET || 'rtm-photos',
        Key: key,
        Body: optimizedBuffer,
        ContentType: 'image/jpeg',
        ACL: 'public-read',
    });

    await s3Client.send(command);

    const url = `${process.env.WASABI_ENDPOINT}/${process.env.WASABI_BUCKET}/${key}`;

    return {
        url,
        publicId: key,
        width: metadata.width,
        height: metadata.height,
        size: optimizedBuffer.length,
    };
};

/**
 * Upload image (auto-detects storage type)
 */
export const uploadImage = async (
    buffer: Buffer,
    folder: string,
    originalFilename?: string
): Promise<UploadResult> => {
    const filename = `${uuidv4()}${path.extname(originalFilename || '.jpg')}`;

    // Determine storage type
    const storageType = STORAGE_TYPE;

    switch (storageType) {
        case 'cloudinary':
            if (!process.env.CLOUDINARY_CLOUD_NAME) {
                console.warn('Cloudinary not configured, falling back to local storage');
                return uploadToLocal(buffer, folder, filename);
            }
            return uploadToCloudinary(buffer, folder);

        case 'wasabi':
            if (!s3Client) {
                console.warn('Wasabi not configured, falling back to local storage');
                return uploadToLocal(buffer, folder, filename);
            }
            return uploadToWasabi(buffer, folder, filename);

        case 'local':
        default:
            return uploadToLocal(buffer, folder, filename);
    }
};

/**
 * Delete from local storage
 */
const deleteFromLocal = async (publicId: string): Promise<void> => {
    const filePath = path.join(UPLOAD_DIR, publicId);
    try {
        await fs.unlink(filePath);
    } catch (error) {
        console.error('Error deleting local file:', error);
    }
};

/**
 * Delete from Cloudinary
 */
const deleteFromCloudinary = async (publicId: string): Promise<void> => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
    }
};

/**
 * Delete from Wasabi/S3
 */
const deleteFromWasabi = async (publicId: string): Promise<void> => {
    if (!s3Client) {
        throw new Error('Wasabi/S3 client not configured');
    }

    try {
        const command = new DeleteObjectCommand({
            Bucket: process.env.WASABI_BUCKET || 'rtm-photos',
            Key: publicId,
        });
        await s3Client.send(command);
    } catch (error) {
        console.error('Error deleting from Wasabi:', error);
    }
};

/**
 * Delete image (auto-detects storage type)
 */
export const deleteImage = async (publicId: string, url: string): Promise<void> => {
    // Detect storage type from URL
    if (url.includes('cloudinary.com')) {
        return deleteFromCloudinary(publicId);
    } else if (url.includes('wasabisys.com') || url.includes('s3.')) {
        return deleteFromWasabi(publicId);
    } else {
        return deleteFromLocal(publicId);
    }
};

/**
 * Get storage info
 */
export const getStorageInfo = () => {
    return {
        type: STORAGE_TYPE,
        cloudinaryConfigured: !!process.env.CLOUDINARY_CLOUD_NAME,
        wasabiConfigured: !!s3Client,
        localPath: UPLOAD_DIR,
    };
};
