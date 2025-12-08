import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  console.log('🚀 Setting up SarahAI database...')

  // Create default admin user
  const hashedPassword = await bcrypt.hash('supreme123', 12)

  const user = await prisma.user.upsert({
    where: { email: 'admin@supremeone.net' },
    update: {},
    create: {
      email: 'admin@supremeone.net',
      name: 'Supreme One Admin',
      password: hashedPassword,
      role: 'ADMIN'
    }
  })

  console.log('✅ Created admin user:', user.email)

  // Create sample prospects
  const sampleProspects = [
    {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@autodealer.com',
      phone: '+1-555-0101',
      company: 'Premium Auto Group',
      position: 'General Manager',
      source: 'linkedin',
      status: 'COLD',
      industry: 'Automotive',
      dealership: 'Premium Auto Group',
      userId: user.id
    },
    {
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.j@luxurycars.com',
      phone: '+1-555-0102',
      company: 'Luxury Cars Inc',
      position: 'F&I Manager',
      source: 'cold_list',
      status: 'CONTACTED',
      industry: 'Automotive',
      dealership: 'Luxury Cars Inc',
      userId: user.id
    },
    {
      firstName: 'Mike',
      lastName: 'Davis',
      email: 'mdavis@cityauto.com',
      phone: '+1-555-0103',
      company: 'City Auto Dealership',
      position: 'VP of Sales',
      source: 'referral',
      status: 'INTERESTED',
      industry: 'Automotive',
      dealership: 'City Auto Dealership',
      userId: user.id
    }
  ]

  for (const prospectData of sampleProspects) {
    await prisma.prospect.create({
      data: {
        ...prospectData,
        status: prospectData.status as any
      }
    })
  }

  console.log('✅ Created sample prospects')

  // Create sample appointments
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(10, 0, 0, 0)

  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  nextWeek.setHours(14, 0, 0, 0)

  const sampleAppointments = [
    {
      title: 'F&I Training Consultation',
      description: 'Initial consultation about F&I training program implementation',
      startTime: tomorrow,
      endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000), // 1 hour later
      status: 'SCHEDULED',
      meetingLink: 'https://zoom.us/j/123456789',
      userId: user.id,
      prospectId: (await prisma.prospect.findFirst({ where: { email: 'mdavis@cityauto.com' } }))?.id || ''
    },
    {
      title: 'Follow-up Meeting',
      description: 'Follow-up discussion about training program details',
      startTime: nextWeek,
      endTime: new Date(nextWeek.getTime() + 90 * 60 * 1000), // 1.5 hours later
      status: 'CONFIRMED',
      location: 'Client Office',
      userId: user.id,
      prospectId: (await prisma.prospect.findFirst({ where: { email: 'sarah.j@luxurycars.com' } }))?.id || ''
    }
  ]

  for (const appointmentData of sampleAppointments) {
    if (appointmentData.prospectId) {
      await prisma.appointment.create({
        data: {
          ...appointmentData,
          status: appointmentData.status as any
        }
      })
    }
  }

  console.log('✅ Created sample appointments')

  // Create F&I knowledge base entries
  const knowledgeEntries = [
    {
      category: 'F&I Basics',
      title: 'Introduction to F&I',
      content: `Finance and Insurance (F&I) is a crucial profit center in automotive dealerships. The F&I department handles:

• Vehicle financing options
• Extended warranties and service contracts
• Gap insurance and credit life insurance
• Aftermarket products and accessories
• Compliance with federal and state regulations

Key success factors:
- Proper menu presentation
- Building customer trust
- Understanding payment structures
- Regulatory compliance
- Product knowledge`,
      tags: ['basics', 'introduction', 'overview'],
      active: true
    },
    {
      category: 'Sales Techniques',
      title: 'Menu Selling Best Practices',
      content: `Effective menu selling in F&I requires:

1. **Proper Setup**: Create a comfortable, professional environment
2. **Needs Assessment**: Understand customer's financial situation and needs
3. **Payment Presentation**: Show payments with and without products
4. **Value Proposition**: Explain benefits, not just features
5. **Objection Handling**: Address concerns with facts and empathy
6. **Closing Techniques**: Guide customer to decision without pressure

Common mistakes to avoid:
- Rushing the presentation
- Focusing only on price
- Not explaining product benefits
- Inadequate follow-up`,
      tags: ['menu-selling', 'sales', 'best-practices'],
      active: true
    },
    {
      category: 'Compliance',
      title: 'Regulatory Compliance in F&I',
      content: `F&I departments must comply with various regulations:

**Federal Regulations:**
- Truth in Lending Act (TILA)
- Equal Credit Opportunity Act (ECOA)
- Fair Credit Reporting Act (FCRA)
- Gramm-Leach-Bliley Act

**State Regulations:**
- Licensing requirements for F&I managers
- Interest rate limitations
- Insurance licensing requirements
- Consumer protection laws

**Best Practices:**
- Regular compliance training
- Proper documentation
- Disclosure requirements
- Fair lending practices
- Customer privacy protection`,
      tags: ['compliance', 'regulations', 'legal'],
      active: true
    }
  ]

  for (const entry of knowledgeEntries) {
    await prisma.knowledgeBase.create({
      data: entry
    })
  }

  console.log('✅ Created F&I knowledge base entries')

  // Create sample social media posts
  const samplePosts = [
    {
      platform: 'LINKEDIN',
      content: `🚀 Just helped another dealership increase their F&I profits by 30%!

The key? Proper training and consistent processes. When F&I managers understand both the technical aspects and the customer psychology behind menu selling, magic happens.

Here's what made the difference:
✅ Structured menu presentation
✅ Value-based selling approach
✅ Compliance-focused processes
✅ Ongoing coaching and support

Ready to transform your F&I department? Let's talk about how our proven training program can boost your profits too.

#FinanceAndInsurance #AutomotiveSales #DealershipProfits #F&ITraining`,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      engagement: {
        likes: 45,
        comments: 12,
        shares: 8
      },
      userId: user.id
    },
    {
      platform: 'LINKEDIN',
      content: `💡 F&I Tip of the Day: The Power of the "Assumption Close"

Instead of asking "Would you like gap insurance?" try:
"Based on your loan amount, I'm including gap coverage to protect your investment. This ensures you won't owe more than your car is worth if something happens."

This approach:
🎯 Assumes the customer wants protection
🎯 Explains the benefit upfront
🎯 Reduces objections
🎯 Increases acceptance rates

What's your favorite closing technique in F&I? Share below! 👇

#F&ITips #AutomotiveSales #SalesTraining #DealershipSuccess`,
      status: 'DRAFT',
      userId: user.id
    }
  ]

  for (const postData of samplePosts) {
    await prisma.socialPost.create({
      data: {
        ...postData,
        platform: postData.platform as any,
        status: postData.status as any
      }
    })
  }

  console.log('✅ Created sample social media posts')

  console.log('🎉 Setup complete!')
  console.log('\nLogin credentials:')
  console.log('Email: admin@supremeone.net')
  console.log('Password: supreme123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })