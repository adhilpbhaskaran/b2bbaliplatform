import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { UploadThingError } from 'uploadthing/server'
import { getCurrentUser } from './auth'
import { db } from './db'
import sharp from 'sharp'
import { z } from 'zod'

const f = createUploadthing()

// File upload configurations
const uploadConfigs = {
  profileImage: {
    maxFileSize: '4MB',
    maxFileCount: 1,
    acceptedFileTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  packageImages: {
    maxFileSize: '8MB',
    maxFileCount: 10,
    acceptedFileTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  documents: {
    maxFileSize: '16MB',
    maxFileCount: 5,
    acceptedFileTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },
  reviewImages: {
    maxFileSize: '4MB',
    maxFileCount: 5,
    acceptedFileTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
}

// Authentication middleware
const authMiddleware = async () => {
  const user = await getCurrentUser()
  if (!user) {
    throw new UploadThingError('Unauthorized')
  }
  return { userId: user.id }
}

// Image processing middleware
const processImage = async (file: File, options: {
  width?: number
  height?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
} = {}) => {
  const {
    width = 1920,
    height = 1080,
    quality = 80,
    format = 'webp'
  } = options

  const buffer = Buffer.from(await file.arrayBuffer())
  
  const processedBuffer = await sharp(buffer)
    .resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toFormat(format, { quality })
    .toBuffer()

  return processedBuffer
}

// File router configuration
export const ourFileRouter = {
  // Profile image upload
  profileImage: f({
    image: {
      maxFileSize: uploadConfigs.profileImage.maxFileSize,
      maxFileCount: uploadConfigs.profileImage.maxFileCount,
    },
  })
    .middleware(authMiddleware)
    .onUploadComplete(async ({ metadata, file }) => {
      console.log('Profile image upload completed for user:', metadata.userId)
      console.log('File URL:', file.url)

      // Update user profile with new avatar
      await db.user.update({
        where: { id: metadata.userId },
        data: { avatar: file.url },
      })

      // Create activity log
      await db.activity.create({
        data: {
          type: 'PROFILE_UPDATED',
          description: 'Profile image updated',
          metadata: {
            fileUrl: file.url,
            fileName: file.name,
            fileSize: file.size,
          },
          userId: metadata.userId,
        },
      })

      return { uploadedBy: metadata.userId, url: file.url }
    }),

  // Package images upload
  packageImages: f({
    image: {
      maxFileSize: uploadConfigs.packageImages.maxFileSize,
      maxFileCount: uploadConfigs.packageImages.maxFileCount,
    },
  })
    .middleware(async () => {
      const user = await getCurrentUser()
      if (!user) {
        throw new UploadThingError('Unauthorized')
      }
      
      // Check if user is agent or admin
      if (!['AGENT', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        throw new UploadThingError('Insufficient permissions')
      }
      
      return { userId: user.id, userRole: user.role }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log('Package image upload completed for user:', metadata.userId)
      console.log('File URL:', file.url)

      // Create activity log
      await db.activity.create({
        data: {
          type: 'FILE_UPLOADED',
          description: 'Package image uploaded',
          metadata: {
            fileUrl: file.url,
            fileName: file.name,
            fileSize: file.size,
            fileType: 'package_image',
          },
          userId: metadata.userId,
        },
      })

      return { uploadedBy: metadata.userId, url: file.url }
    }),

  // Document upload
  documents: f({
    pdf: {
      maxFileSize: uploadConfigs.documents.maxFileSize,
      maxFileCount: uploadConfigs.documents.maxFileCount,
    },
  })
    .middleware(authMiddleware)
    .onUploadComplete(async ({ metadata, file }) => {
      console.log('Document upload completed for user:', metadata.userId)
      console.log('File URL:', file.url)

      // Create activity log
      await db.activity.create({
        data: {
          type: 'FILE_UPLOADED',
          description: 'Document uploaded',
          metadata: {
            fileUrl: file.url,
            fileName: file.name,
            fileSize: file.size,
            fileType: 'document',
          },
          userId: metadata.userId,
        },
      })

      return { uploadedBy: metadata.userId, url: file.url }
    }),

  // Review images upload
  reviewImages: f({
    image: {
      maxFileSize: uploadConfigs.reviewImages.maxFileSize,
      maxFileCount: uploadConfigs.reviewImages.maxFileCount,
    },
  })
    .middleware(authMiddleware)
    .onUploadComplete(async ({ metadata, file }) => {
      console.log('Review image upload completed for user:', metadata.userId)
      console.log('File URL:', file.url)

      // Create activity log
      await db.activity.create({
        data: {
          type: 'FILE_UPLOADED',
          description: 'Review image uploaded',
          metadata: {
            fileUrl: file.url,
            fileName: file.name,
            fileSize: file.size,
            fileType: 'review_image',
          },
          userId: metadata.userId,
        },
      })

      return { uploadedBy: metadata.userId, url: file.url }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter

// File validation schemas
export const fileValidationSchemas = {
  image: z.object({
    name: z.string(),
    size: z.number().max(8 * 1024 * 1024, 'File size must be less than 8MB'),
    type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  }),
  document: z.object({
    name: z.string(),
    size: z.number().max(16 * 1024 * 1024, 'File size must be less than 16MB'),
    type: z.enum([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]),
  }),
}

// File upload utilities
export class FileUploadService {
  // Validate file before upload
  static validateFile(file: File, type: 'image' | 'document') {
    const schema = fileValidationSchemas[type]
    return schema.safeParse({
      name: file.name,
      size: file.size,
      type: file.type,
    })
  }

  // Generate unique filename
  static generateFileName(originalName: string, userId: string) {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    const extension = originalName.split('.').pop()
    return `${userId}_${timestamp}_${random}.${extension}`
  }

  // Get file type from MIME type
  static getFileType(mimeType: string) {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType === 'application/pdf') return 'pdf'
    if (mimeType.includes('word')) return 'document'
    return 'unknown'
  }

  // Format file size
  static formatFileSize(bytes: number) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Check if file is image
  static isImage(mimeType: string) {
    return mimeType.startsWith('image/')
  }

  // Check if file is document
  static isDocument(mimeType: string) {
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    return documentTypes.includes(mimeType)
  }

  // Get image dimensions
  static async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        resolve({ width: img.width, height: img.height })
      }
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  // Compress image
  static async compressImage(
    file: File,
    options: {
      maxWidth?: number
      maxHeight?: number
      quality?: number
      format?: string
    } = {}
  ): Promise<File> {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      format = 'image/webp',
    } = options

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: format,
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              reject(new Error('Failed to compress image'))
            }
          },
          format,
          quality
        )
      }

      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  // Create thumbnail
  static async createThumbnail(
    file: File,
    size: number = 200
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        canvas.width = size
        canvas.height = size

        // Calculate crop dimensions for square thumbnail
        const minDimension = Math.min(img.width, img.height)
        const x = (img.width - minDimension) / 2
        const y = (img.height - minDimension) / 2

        ctx?.drawImage(
          img,
          x, y, minDimension, minDimension,
          0, 0, size, size
        )

        resolve(canvas.toDataURL('image/webp', 0.8))
      }

      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }
}

// File management utilities
export class FileManager {
  // Get user files
  static async getUserFiles(userId: string, type?: string) {
    const activities = await db.activity.findMany({
      where: {
        userId,
        type: 'FILE_UPLOADED',
        ...(type && {
          metadata: {
            path: ['fileType'],
            equals: type,
          },
        }),
      },
      orderBy: { createdAt: 'desc' },
    })

    return activities.map(activity => ({
      id: activity.id,
      url: activity.metadata?.fileUrl,
      name: activity.metadata?.fileName,
      size: activity.metadata?.fileSize,
      type: activity.metadata?.fileType,
      uploadedAt: activity.createdAt,
    }))
  }

  // Delete file record
  static async deleteFileRecord(activityId: string, userId: string) {
    const activity = await db.activity.findFirst({
      where: {
        id: activityId,
        userId,
        type: 'FILE_UPLOADED',
      },
    })

    if (!activity) {
      throw new Error('File record not found')
    }

    await db.activity.delete({
      where: { id: activityId },
    })

    return true
  }

  // Get file usage statistics
  static async getFileStats(userId: string) {
    const activities = await db.activity.findMany({
      where: {
        userId,
        type: 'FILE_UPLOADED',
      },
    })

    const totalFiles = activities.length
    const totalSize = activities.reduce(
      (sum, activity) => sum + (activity.metadata?.fileSize || 0),
      0
    )

    const filesByType = activities.reduce((acc, activity) => {
      const type = activity.metadata?.fileType || 'unknown'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalFiles,
      totalSize,
      filesByType,
      formattedTotalSize: FileUploadService.formatFileSize(totalSize),
    }
  }
}

export default {
  ourFileRouter,
  FileUploadService,
  FileManager,
  uploadConfigs,
  fileValidationSchemas,
}