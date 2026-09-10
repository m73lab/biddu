import {
  createHandler,
  withAuth,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from "@/lib/api";
import type { ApiHandler, Middleware } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getStorage, getPublicUrl } from "@/lib/storage";
import { uploadLogger as logger } from "@/lib/logger";
import { canUserCreateItems, isUserAdmin } from "@/utils/auction-helpers";
import formidable from "formidable";
import fs from "fs";
import sharp from "sharp";

// Disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
// Self-hosted: unlimited quota, hard cap per auction only
const MAX_IMAGES_PER_AUCTION = 50;

async function parseForm(
  req: Parameters<ApiHandler>[0],
): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  const form = formidable({
    maxFileSize: MAX_FILE_SIZE,
    filter: ({ mimetype }) => {
      return mimetype ? ALLOWED_TYPES.includes(mimetype) : false;
    },
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

/**
 * Parse JSON body manually since bodyParser is disabled for file uploads
 */
async function parseJsonBody<T>(req: Parameters<ApiHandler>[0]): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new BadRequestError("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

async function processImage(filePath: string): Promise<Buffer> {
  // Resize and optimize image
  return sharp(filePath)
    .resize(1200, 1200, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer();
}

interface AuctionImagePermissions {
  canUpload: boolean;
  canManage: boolean;
}

type ContextWithAuction = { auctionPerms: AuctionImagePermissions };

/**
 * Middleware to check membership and attach image permissions.
 * Photos belong to the auction and are shared by all its items.
 */
const withAuctionPermission: Middleware = (next) => async (req, res, ctx) => {
  const auctionId = ctx.params.id;

  const membership = await prisma.auctionMember.findUnique({
    where: {
      auctionId_userId: {
        auctionId,
        userId: ctx.session!.user.id,
      },
    },
  });

  if (!membership) {
    throw new ForbiddenError("Not a member of this auction");
  }

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: { id: true },
  });

  if (!auction) {
    throw new NotFoundError("Auction not found");
  }

  ctx.membership = membership;
  (ctx as typeof ctx & ContextWithAuction).auctionPerms = {
    // Same set of roles that could upload item photos before
    canUpload: canUserCreateItems(membership.role),
    canManage: isUserAdmin(membership.role),
  };

  return next(req, res, ctx);
};

const requireCanUpload: Middleware = (next) => async (req, res, ctx) => {
  const { auctionPerms } = ctx as typeof ctx & ContextWithAuction;
  if (!auctionPerms?.canUpload) {
    throw new ForbiddenError(
      "You don't have permission to upload images to this auction",
    );
  }
  return next(req, res, ctx);
};

const requireCanManage: Middleware = (next) => async (req, res, ctx) => {
  const { auctionPerms } = ctx as typeof ctx & ContextWithAuction;
  if (!auctionPerms?.canManage) {
    throw new ForbiddenError(
      "You don't have permission to manage images for this auction",
    );
  }
  return next(req, res, ctx);
};

const getImages: ApiHandler = async (_req, res, ctx) => {
  const auctionId = ctx.params.id;
  const { auctionPerms } = ctx as typeof ctx & ContextWithAuction;

  const images = await prisma.auctionImage.findMany({
    where: { auctionId },
    orderBy: { order: "asc" },
  });

  res.status(200).json({
    images: images.map((img) => ({
      id: img.id,
      url: img.url,
      publicUrl: getPublicUrl(img.url),
      order: img.order,
    })),
    limit: MAX_IMAGES_PER_AUCTION,
    used: images.length,
    remaining: Math.max(0, MAX_IMAGES_PER_AUCTION - images.length),
    canUpload: auctionPerms.canUpload,
    canManage: auctionPerms.canManage,
  });
};

const uploadImage: ApiHandler = async (req, res, ctx) => {
  const auctionId = ctx.params.id;

  logger.info({ auctionId }, "Starting auction image upload");

  // Check hard cap
  const currentCount = await prisma.auctionImage.count({
    where: { auctionId },
  });
  if (currentCount >= MAX_IMAGES_PER_AUCTION) {
    logger.warn({ imageCount: currentCount }, "Auction image limit reached");
    throw new BadRequestError(
      `Maximum ${MAX_IMAGES_PER_AUCTION} images allowed per auction`,
    );
  }

  let files;
  try {
    const formResult = await parseForm(req);
    files = formResult.files;
    logger.debug({ files: Object.keys(files) }, "Form parsed");
  } catch (parseError) {
    logger.error({ err: parseError }, "Form parse error");
    throw new BadRequestError(
      `Failed to parse upload: ${
        parseError instanceof Error ? parseError.message : "Unknown error"
      }`,
    );
  }

  const fileArray = files.image;

  if (!fileArray || (Array.isArray(fileArray) && fileArray.length === 0)) {
    logger.warn("No image file in request");
    throw new BadRequestError("No image file provided");
  }

  const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
  logger.debug(
    {
      originalFilename: file.originalFilename,
      mimetype: file.mimetype,
      size: file.size,
    },
    "File received",
  );

  if (!file.mimetype || !ALLOWED_TYPES.includes(file.mimetype)) {
    logger.warn({ mimetype: file.mimetype }, "Invalid file type");
    throw new BadRequestError(
      "Invalid file type. Allowed: JPEG, PNG, WebP, GIF",
    );
  }

  // Process image
  let processedBuffer: Buffer;
  try {
    processedBuffer = await processImage(file.filepath);
    logger.debug({ bufferSize: processedBuffer.length }, "Image processed");
  } catch (processError) {
    logger.error({ err: processError }, "Image processing error");
    throw new BadRequestError(
      `Failed to process image: ${
        processError instanceof Error ? processError.message : "Unknown error"
      }`,
    );
  }

  // Generate unique filename
  const ext = ".jpg"; // Always save as JPEG after processing
  const filename = `${auctionId}/${Date.now()}-${Math.random()
    .toString(36)
    .substring(7)}${ext}`;
  logger.debug({ filename }, "Generated filename");

  // Upload to storage
  let storage;
  try {
    storage = getStorage();
  } catch (storageError) {
    logger.error({ err: storageError }, "Failed to get storage");
    throw new BadRequestError(
      `Storage configuration error: ${
        storageError instanceof Error ? storageError.message : "Unknown error"
      }`,
    );
  }

  let result;
  try {
    result = await storage.addFileFromBuffer({
      buffer: processedBuffer,
      targetPath: filename,
    });
    logger.debug(
      { error: result.error, value: result.value },
      "Storage upload result",
    );
  } catch (uploadError) {
    logger.error({ err: uploadError }, "Storage upload exception");
    throw new BadRequestError(
      `Storage upload failed: ${
        uploadError instanceof Error ? uploadError.message : "Unknown error"
      }`,
    );
  }

  if (result.error) {
    logger.error({ error: result.error }, "Storage upload error");
    throw new BadRequestError(`Failed to upload image: ${result.error}`);
  }

  // Get current max order
  const maxOrder = await prisma.auctionImage.aggregate({
    where: { auctionId },
    _max: { order: true },
  });

  // Save to database
  const image = await prisma.auctionImage.create({
    data: {
      auctionId,
      url: filename,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  // Clean up temp file
  fs.unlink(file.filepath, () => {});

  res.status(201).json({
    ...image,
    publicUrl: getPublicUrl(filename),
  });
};

const deleteImage: ApiHandler = async (req, res, ctx) => {
  const auctionId = ctx.params.id;
  const { imageId } = req.query;

  if (!imageId || typeof imageId !== "string") {
    throw new BadRequestError("Image ID required");
  }

  const image = await prisma.auctionImage.findUnique({
    where: { id: imageId },
  });

  if (!image || image.auctionId !== auctionId) {
    throw new NotFoundError("Image not found");
  }

  // Delete from storage
  const storage = getStorage();
  await storage.removeFile(image.url);

  // Delete from database
  await prisma.auctionImage.delete({
    where: { id: imageId },
  });

  res.status(200).json({ message: "Image deleted" });
};

const reorderImages: ApiHandler = async (req, res, ctx) => {
  const auctionId = ctx.params.id;
  const body = await parseJsonBody<{ imageIds?: string[] }>(req);
  const { imageIds } = body;

  if (!Array.isArray(imageIds)) {
    throw new BadRequestError("imageIds array required");
  }

  // Update order for each image
  await Promise.all(
    imageIds.map((id: string, index: number) =>
      prisma.auctionImage.updateMany({
        where: { id, auctionId },
        data: { order: index },
      }),
    ),
  );

  res.status(200).json({ message: "Images reordered" });
};

export default createHandler({
  GET: [[withAuth, withAuctionPermission], getImages],
  POST: [[withAuth, withAuctionPermission, requireCanUpload], uploadImage],
  DELETE: [[withAuth, withAuctionPermission, requireCanManage], deleteImage],
  PATCH: [[withAuth, withAuctionPermission, requireCanManage], reorderImages],
});
