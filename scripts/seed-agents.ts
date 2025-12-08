import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding agents...');

  // Get the first user (you'll need to replace this with your actual user ID or email)
  const user = await prisma.user.findFirst();

  if (!user) {
    console.error('No user found. Please create a user first.');
    return;
  }

  console.log(`Using user: ${user.email}`);

  // Agent 1: Training Program Sales Agent
  const trainingAgent = await prisma.agent.upsert({
    where: { slug: 'training-agent' },
    update: {},
    create: {
      name: 'Training Program Agent',
      slug: 'training-agent',
      description: 'AI sales agent focused on selling Supreme One F&I training programs to dealership professionals',
      persona: `You are an expert F&I training consultant representing Supreme One Training. Your goal is to help dealership managers, F&I professionals, and automotive sales teams improve their skills and increase profitability through world-class training.

Key talking points:
- Supreme One has trained thousands of F&I professionals
- Our training increases F&I product penetration by 20-40%
- We focus on compliance, customer satisfaction, and profitability
- Available in-person, virtual, and on-demand formats
- Proven ROI with measurable results

Your tone is professional, educational, and consultative. You focus on value, expertise, and results.`,
      targetAudience: 'Dealership owners, GMs, F&I managers, F&I directors, sales managers, automotive group executives',
      products: {
        programs: [
          {
            name: 'F&I Mastery Training',
            description: 'Comprehensive F&I skills development program',
            duration: '2-3 days',
            format: 'In-person or Virtual',
          },
          {
            name: 'Online F&I Certification',
            description: 'Self-paced online training with certification',
            duration: '8-12 hours',
            format: 'On-demand',
          },
          {
            name: 'Advanced F&I Techniques',
            description: 'Advanced strategies for experienced F&I professionals',
            duration: '1-2 days',
            format: 'In-person or Virtual',
          },
          {
            name: 'Dealership F&I Consulting',
            description: 'Custom consulting and process optimization',
            duration: 'Ongoing',
            format: 'Custom',
          },
        ],
      },
      color: '#10b981',
      icon: '🎓',
      userId: user.id,
    },
  });

  console.log('Created Training Program Agent:', trainingAgent.name);

  // Agent 2: F&I Products Sales Agent
  const fiProductsAgent = await prisma.agent.upsert({
    where: { slug: 'fi-products-agent' },
    update: {},
    create: {
      name: 'F&I Products Agent',
      slug: 'fi-products-agent',
      description: 'AI sales agent focused on selling F&I products (warranties, GAP, protection plans) to automotive dealers',
      persona: `You are a F&I products specialist helping automotive dealers increase their F&I revenue and provide valuable protection products to their customers.

Key talking points:
- High-margin F&I products that increase per-vehicle profit
- Customer protection products (extended warranties, GAP, maintenance plans)
- Competitive rates and comprehensive coverage
- Dealer support, training, and marketing materials
- Quick approvals and fast contracting
- Increase F&I penetration and customer satisfaction

Your tone is professional, revenue-focused, and consultative. You focus on dealer profitability, customer value, and ease of implementation.`,
      targetAudience: 'Dealership owners, GMs, F&I managers, dealer groups, automotive finance directors',
      products: {
        products: [
          {
            name: 'Vehicle Service Contracts (VSC)',
            description: 'Extended warranty coverage for new and used vehicles',
            type: 'Protection Product',
          },
          {
            name: 'GAP Insurance',
            description: 'Guaranteed Asset Protection for financed/leased vehicles',
            type: 'Protection Product',
          },
          {
            name: 'Tire & Wheel Protection',
            description: 'Coverage for tire and wheel damage',
            type: 'Protection Product',
          },
          {
            name: 'Prepaid Maintenance Plans',
            description: 'Scheduled maintenance coverage',
            type: 'Service Product',
          },
          {
            name: 'Paint & Interior Protection',
            description: 'Protective coatings and appearance coverage',
            type: 'Protection Product',
          },
          {
            name: 'Key Replacement Coverage',
            description: 'Lost or stolen key replacement',
            type: 'Protection Product',
          },
        ],
      },
      color: '#3b82f6',
      icon: '🚗',
      userId: user.id,
    },
  });

  console.log('Created F&I Products Agent:', fiProductsAgent.name);

  // Create initial email templates for Training Agent
  const trainingTemplates = [
    {
      name: 'Initial Outreach - Training Program',
      description: 'First contact email for training program prospects',
      subject: 'Boost Your F&I Performance by 20-40%',
      body: `Hi {{firstName}},

I noticed that {{company}} is always looking for ways to improve F&I performance and profitability.

At Supreme One Training, we've helped over 1,000 dealerships increase their F&I product penetration by 20-40% through our proven training programs.

Our clients typically see:
• Higher F&I PVR (Product Per Vehicle Retailed)
• Improved CSI scores
• Better compliance and reduced chargebacks
• More confident F&I managers

Would you be open to a 15-minute call to discuss how we can help {{company}} achieve similar results?

Best regards,
Sean McNally
Supreme One Training`,
      category: 'initial_outreach',
      agentId: trainingAgent.id,
      userId: user.id,
      tags: ['training', 'first-contact', 'value-prop'],
    },
    {
      name: 'Follow-up - Training Program',
      description: 'Follow-up email for training prospects',
      subject: 'Quick follow-up on F&I training',
      body: `Hi {{firstName}},

I wanted to follow up on my previous email about Supreme One's F&I training programs.

I understand you're busy, so I'll keep this brief. We're currently offering a complimentary F&I performance assessment for {{company}}.

This 30-minute call will help identify:
• Current F&I performance gaps
• Specific training needs for your team
• Potential ROI from our programs

No obligation, just value. What does your calendar look like this week?

Best,
Sean McNally`,
      category: 'follow_up',
      agentId: trainingAgent.id,
      userId: user.id,
      tags: ['training', 'follow-up', 'value'],
    },
  ];

  for (const template of trainingTemplates) {
    await prisma.emailTemplate.create({
      data: template,
    });
  }

  console.log('Created training agent email templates');

  // Create initial email templates for F&I Products Agent
  const fiProductTemplates = [
    {
      name: 'Initial Outreach - F&I Products',
      description: 'First contact email for F&I product prospects',
      subject: 'Increase Your F&I Revenue with High-Margin Products',
      body: `Hi {{firstName}},

I help dealerships like {{company}} increase F&I profitability through competitive, customer-friendly protection products.

Our dealers typically see:
• $300-600 increase in F&I PVR
• 70%+ product penetration rates
• Fast approvals and easy contracting
• Complete dealer support and training

We specialize in:
• Vehicle Service Contracts (VSC)
• GAP Insurance
• Tire & Wheel Protection
• Prepaid Maintenance Plans

Would you be open to a quick call to see how we can help increase {{company}}'s F&I revenue?

Best regards,
Sean McNally`,
      category: 'initial_outreach',
      agentId: fiProductsAgent.id,
      userId: user.id,
      tags: ['fi-products', 'first-contact', 'revenue'],
    },
    {
      name: 'Follow-up - F&I Products',
      description: 'Follow-up email for F&I product prospects',
      subject: 'Re: F&I Products for {{company}}',
      body: `Hi {{firstName}},

Following up on my previous email about increasing {{company}}'s F&I profitability.

I wanted to share a quick case study:

One of our dealer partners increased their F&I PVR from $1,200 to $1,750 within 90 days by adding our protection products to their F&I menu.

That's an extra $550 per vehicle. On 100 vehicles/month, that's $55,000 in additional monthly profit.

Would you like to see how we can create similar results for {{company}}?

I'm available for a brief call this week.

Best,
Sean McNally`,
      category: 'follow_up',
      agentId: fiProductsAgent.id,
      userId: user.id,
      tags: ['fi-products', 'follow-up', 'case-study'],
    },
  ];

  for (const template of fiProductTemplates) {
    await prisma.emailTemplate.create({
      data: template,
    });
  }

  console.log('Created F&I products agent email templates');

  console.log('\n✅ Agents seeded successfully!');
  console.log('\nAgents created:');
  console.log(`1. ${trainingAgent.name} (${trainingAgent.slug})`);
  console.log(`2. ${fiProductsAgent.name} (${fiProductsAgent.slug})`);
}

main()
  .catch((e) => {
    console.error('Error seeding agents:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
