import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'

async function createAdminUser() {
  try {
    const email = process.env.ADMIN_EMAIL || 'smcnally@supremeone.net'
    const password = process.env.ADMIN_PASSWORD || 'Smc231488$'
    const name = process.env.ADMIN_NAME || 'Sean McNally'

    // Check if admin already exists
    const existing = await prisma.user.findUnique({
      where: { email }
    })

    if (existing) {
      console.log(`✅ Admin user already exists: ${email}`)
      return
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'ADMIN'
      }
    })

    console.log(`✅ Admin user created successfully!`)
    console.log(`   Email: ${admin.email}`)
    console.log(`   Password: ${password}`)
    console.log(`   ⚠️  IMPORTANT: Change this password after first login!`)

  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUser()
