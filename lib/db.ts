import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Database connection helper
export async function connectToDatabase() {
  try {
    await db.$connect()
    console.log('✅ Database connected successfully')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw error
  }
}

// Database disconnection helper
export async function disconnectFromDatabase() {
  try {
    await db.$disconnect()
    console.log('✅ Database disconnected successfully')
  } catch (error) {
    console.error('❌ Database disconnection failed:', error)
    throw error
  }
}

// Health check function
export async function checkDatabaseHealth() {
  try {
    await db.$queryRaw`SELECT 1`
    return { status: 'healthy', timestamp: new Date().toISOString() }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
  }
}

// Transaction helper
export async function withTransaction<T>(
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return await db.$transaction(callback)
}

// Soft delete helper
export async function softDelete(
  model: keyof PrismaClient,
  id: string
): Promise<any> {
  const modelInstance = db[model] as any
  return await modelInstance.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}

// Restore soft deleted record
export async function restoreSoftDeleted(
  model: keyof PrismaClient,
  id: string
): Promise<any> {
  const modelInstance = db[model] as any
  return await modelInstance.update({
    where: { id },
    data: { deletedAt: null },
  })
}

// Pagination helper
export interface PaginationOptions {
  page: number
  limit: number
}

export interface PaginationResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export function getPaginationParams(page: number = 1, limit: number = 10) {
  const skip = (page - 1) * limit
  return { skip, take: limit }
}

export function createPaginationResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginationResult<T> {
  const totalPages = Math.ceil(total / limit)
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  }
}

// Search helper
export function createSearchFilter(searchTerm: string, fields: string[]) {
  if (!searchTerm) return {}
  
  return {
    OR: fields.map(field => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive' as const,
      },
    })),
  }
}

// Date range filter helper
export function createDateRangeFilter(
  field: string,
  startDate?: Date,
  endDate?: Date
) {
  const filter: any = {}
  
  if (startDate || endDate) {
    filter[field] = {}
    if (startDate) filter[field].gte = startDate
    if (endDate) filter[field].lte = endDate
  }
  
  return filter
}

// Batch operations helper
export async function batchCreate<T>(
  model: keyof PrismaClient,
  data: T[],
  batchSize: number = 100
): Promise<any[]> {
  const results = []
  const modelInstance = db[model] as any
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    const result = await modelInstance.createMany({
      data: batch,
      skipDuplicates: true,
    })
    results.push(result)
  }
  
  return results
}

// Database seeding helper
export async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...')
    
    // Import and run seed script
    const { main } = await import('../prisma/seed')
    await main()
    
    console.log('✅ Database seeding completed')
  } catch (error) {
    console.error('❌ Database seeding failed:', error)
    throw error
  }
}

// Database reset helper (development only)
export async function resetDatabase() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Database reset is not allowed in production')
  }
  
  try {
    console.log('🔄 Resetting database...')
    
    // Delete all data in reverse order of dependencies
    await db.activity.deleteMany()
    await db.message.deleteMany()
    await db.review.deleteMany()
    await db.commission.deleteMany()
    await db.payment.deleteMany()
    await db.booking.deleteMany()
    await db.quote.deleteMany()
    await db.package.deleteMany()
    await db.seasonalRate.deleteMany()
    await db.addOn.deleteMany()
    await db.hotel.deleteMany()
    await db.tierConfig.deleteMany()
    await db.aIConversation.deleteMany()
    await db.whatsAppMessage.deleteMany()
    await db.analyticsEvent.deleteMany()
    await db.agent.deleteMany()
    await db.admin.deleteMany()
    await db.user.deleteMany()
    
    console.log('✅ Database reset completed')
  } catch (error) {
    console.error('❌ Database reset failed:', error)
    throw error
  }
}

export default db