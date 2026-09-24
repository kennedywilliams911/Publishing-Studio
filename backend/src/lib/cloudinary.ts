import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export type UploadResult = {
  url: string;
  publicId: string;
  width: number;
  height: number;
};

export type AudioUploadResult = {
  url: string;
  publicId: string;
  duration: number;
};
/**
 * Uploads an image buffer to Cloudinary, applying automatic format + quality
 * optimization and a sane max size.
 */
export async function uploadImage(
  fileBuffer: Buffer,
  folder: "profile" | "articles" | "watermark",
): Promise<UploadResult> {
  const result = await new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `pastor-articles/${folder}`,
        resource_type: "image",
        transformation: [
          { width: 1600, height: 1600, crop: "limit" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, uploaded) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(uploaded);
      },
    );

    uploadStream.end(fileBuffer);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
  };
}

export async function deleteImage(publicId: string) {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Failed to delete image from Cloudinary", err);
  }
}

export async function uploadAudio(
  fileBuffer: Buffer,
  folder: "audio" = "audio",
): Promise<AudioUploadResult> {
  const result = await new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `pastor-articles/${folder}`,
        resource_type: "video",
        allowed_formats: [
          "mp3",
          "wav",
          "webm",
          "aac",
          "ogg",
          "oga",
          "opus",
          "m4a",
          "mp4",
        ],
        chunk_size: 6 * 1024 * 1024,
        timeout: 10 * 60 * 1000,
      },
      (error, uploaded) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(uploaded);
      },
    );

    uploadStream.end(fileBuffer);
  });

  return {
    url: result.secure_url || result.url,
    publicId: result.public_id,
    duration: result.duration || 0,
  };
}
export default cloudinary;
