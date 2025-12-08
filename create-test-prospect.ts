import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find your user
  const user = await prisma.user.findFirst({
    where: { email: 'smcnally@supremeone.net' }
  })

  if (!user) {
    console.error('User not found')
    return
  }

  console.log('Creating test prospect...')

  // Create a test prospect
  const prospect = await prisma.prospect.create({
    data: {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@example-dealership.com',
      phone: '555-123-4567',
      dealership: 'Smith Auto Group',
      position: 'General Manager',
      location: 'Austin, TX',
      dealershipWebsite: 'https://www.smithautogroup.com',
      employeeCount: 25,
      revenue: '$10M-$25M',
      industry: 'Automotive',
      source: 'manual_entry',
      status: 'COLD',
      notes: 'Large dealership group in Austin area. Focus on F&I training needs.',
      userId: user.id
    }
  })

  console.log('✅ Test prospect created:', prospect.id)
  console.log('Name:', prospect.firstName, prospect.lastName)
  console.log('Dealership:', prospect.dealership)
  console.log('\nNow go to the Prospects tab and click "Generate Proposal"!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
