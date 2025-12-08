# Multi-Agent Sales System Guide

This guide explains how to use the two-agent sales automation system for LinkedIn and email outreach.

## Overview

You now have **two separate AI sales agents** working for you:

### Agent 1: Training Program Agent 🎓
- **Target**: Dealership managers, F&I professionals, automotive sales teams
- **Sells**: Supreme One F&I training programs
- **Focus**: Education, skill development, career advancement
- **Tone**: Consultative, educational, expertise-focused

### Agent 2: F&I Products Agent 🚗
- **Target**: Dealership owners, GMs, F&I managers, dealer groups
- **Sells**: F&I products (warranties, GAP, protection plans, etc.)
- **Focus**: Revenue increase, profit enhancement, dealer benefits
- **Tone**: Revenue-focused, ROI-driven, consultative

---

## Setup Instructions

### 1. Database Setup

First, make sure your PostgreSQL database is running, then push the schema:

```bash
cd sarah-ai
npx prisma generate
npx prisma db push
```

### 2. Seed the Agents

Create the two agents and their initial email templates:

```bash
npx tsx scripts/seed-agents.ts
```

This will create:
- Training Program Agent (slug: `training-agent`)
- F&I Products Agent (slug: `fi-products-agent`)
- Initial email templates for both agents

### 3. View Your Agents

Start the development server:

```bash
npm run dev
```

Navigate to: **http://localhost:4000/dashboard/agents**

---

## Using the Multi-Agent System

### Workflow Overview

```
1. Import Prospects → 2. Assign to Agent → 3. Enrich Data → 4. Launch Campaign → 5. Follow Up → 6. Book Appointments
```

### Step 1: Import Prospects

**Option A: CSV Import**

Upload a CSV with these columns:
- `firstName`, `lastName`, `email`, `phone`, `company`, `position`, `linkedinUrl`

```bash
POST /api/prospects/bulk-import
```

**Option B: Manual Entry**

Add prospects one by one via the dashboard or API:

```bash
POST /api/prospects
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john@dealership.com",
  "company": "Smith Automotive",
  "position": "F&I Manager",
  "linkedinUrl": "https://linkedin.com/in/johnsmith",
  "agentId": "training-agent-id"  // Assign to specific agent
}
```

### Step 2: Assign Prospects to Agents

Prospects can be assigned to specific agents:

**Training Program Agent** prospects:
- F&I Managers
- Sales Managers
- Dealership Trainers
- Automotive Group Training Directors

**F&I Products Agent** prospects:
- Dealership Owners
- General Managers
- F&I Directors
- Dealer Group Executives

Update prospect assignment:

```bash
PATCH /api/prospects/{id}
{
  "agentId": "agent-id-here"
}
```

### Step 3: Enrich LinkedIn Data

For prospects with LinkedIn URLs, enrich their profiles:

```bash
POST /api/linkedin/enrich
{
  "prospectId": "prospect-id"
}
```

This will:
- Extract profile data (in production, integrate with Proxycurl or Sales Navigator)
- Update prospect information
- Mark as enriched

**Recommended Integration**: [Proxycurl](https://nubela.co/proxycurl/) for automated LinkedIn scraping

### Step 4: LinkedIn Outreach

#### Generate Connection Request

```bash
POST /api/linkedin/generate-message
{
  "prospectId": "prospect-id",
  "agentId": "agent-id",
  "messageType": "connection_request"
}
```

Response includes:
- Personalized 300-character connection note
- Tailored to prospect's role and company
- Agent-specific messaging

#### Generate LinkedIn Message

For existing connections:

```bash
POST /api/linkedin/generate-message
{
  "prospectId": "prospect-id",
  "agentId": "agent-id",
  "messageType": "message"
}
```

#### LinkedIn Campaign

Create a LinkedIn outreach campaign:

```bash
POST /api/linkedin/campaigns
{
  "name": "Q1 Training Program Outreach",
  "agentId": "training-agent-id",
  "targetAudience": "F&I Managers",
  "prospectIds": ["id1", "id2", "id3"]
}
```

**LinkedIn Compliance Note**:
LinkedIn has strict automation policies. This system generates messages for **manual copy/paste** to comply with LinkedIn ToS. For automation, consider:
- LinkedIn Sales Navigator API
- Meet Alfred, Expandi, or similar compliant tools
- Manual workflow with generated messages

### Step 5: Email Campaigns

#### Send Email Campaign

```bash
POST /api/email/send-campaign
{
  "agentId": "fi-products-agent-id",
  "prospectIds": ["id1", "id2", "id3"],
  "templateId": "template-id" // Optional, or use customSubject/customBody
}
```

#### Use Custom Email

```bash
POST /api/email/send-campaign
{
  "agentId": "agent-id",
  "prospectIds": ["id1"],
  "customSubject": "Increase {{company}}'s F&I Revenue",
  "customBody": "Hi {{firstName}},\n\nI help dealerships..."
}
```

**Available Variables**:
- `{{firstName}}`, `{{lastName}}`
- `{{company}}`, `{{dealership}}`
- `{{position}}`
- `{{location}}`

### Step 6: Lead Scoring

Score prospects to prioritize outreach:

```bash
POST /api/prospects/score
{
  "prospectIds": ["id1", "id2", "id3"]
}
```

**Scoring Factors** (0-100):
- Profile completeness (20 points)
- Job title/decision-making power (25 points)
- Company size (15 points)
- Industry fit (10 points)
- Engagement level (20 points)
- LinkedIn profile quality (10 points)

High-value prospects (80+ score):
- Complete profile
- Decision-maker title (Owner, GM, President)
- Large dealership
- Previous engagement

### Step 7: Follow-Up Sequences

Create automated follow-up sequences:

```bash
POST /api/follow-up-sequences
{
  "name": "Training Program 5-Touch Sequence",
  "agentId": "training-agent-id",
  "triggerEvent": "no_response_7days",
  "steps": [
    {
      "stepNumber": 1,
      "type": "EMAIL",
      "delayDays": 3,
      "subject": "Following up on F&I training",
      "content": "..."
    },
    {
      "stepNumber": 2,
      "type": "LINKEDIN_MESSAGE",
      "delayDays": 4,
      "content": "..."
    }
  ]
}
```

---

## Agent-Specific Strategies

### Training Program Agent Strategy

**Best Prospects**:
- F&I Managers at high-volume dealerships
- Sales managers interested in training
- Dealership groups with training budgets

**Messaging Focus**:
- Proven ROI (20-40% increase in F&I penetration)
- Compliance and risk reduction
- Career development
- Measurable results

**Sample Outreach**:
1. Email: Value proposition + free assessment offer
2. LinkedIn: Connect with educational insight
3. Follow-up: Case study with ROI
4. Call: Discuss specific training needs

### F&I Products Agent Strategy

**Best Prospects**:
- Dealership owners (decision makers)
- General managers with P&L responsibility
- F&I directors at dealer groups

**Messaging Focus**:
- Revenue increase ($300-600 PVR increase)
- High margins and profitability
- Easy implementation
- Competitive rates

**Sample Outreach**:
1. Email: Revenue-focused value prop
2. LinkedIn: Connect with profit insight
3. Follow-up: Share case study with numbers
4. Call: Discuss specific products and pricing

---

## Dashboard Features

### Agent Management Page
**URL**: `/dashboard/agents`

Features:
- View both agents side-by-side
- See prospect and campaign counts
- Quick access to agent-specific workflows
- Performance metrics per agent

### Agent-Specific Views

Navigate to agent-specific pages:
- `/dashboard/agents/{agentId}/prospects` - View prospects assigned to this agent
- `/dashboard/agents/{agentId}/campaigns` - View campaigns for this agent

---

## API Reference

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents` | GET | List all agents |
| `/api/agents` | POST | Create new agent |
| `/api/agents/{id}` | GET | Get agent details |
| `/api/agents/{id}` | PATCH | Update agent |
| `/api/prospects` | POST | Create prospect |
| `/api/prospects/bulk-import` | POST | Import CSV |
| `/api/prospects/score` | POST | Score leads |
| `/api/linkedin/enrich` | POST | Enrich LinkedIn profile |
| `/api/linkedin/generate-message` | POST | Generate LinkedIn message |
| `/api/linkedin/campaigns` | GET/POST | LinkedIn campaigns |
| `/api/email/send-campaign` | POST | Send email campaign |

---

## Integration Recommendations

### For LinkedIn Automation

**Option 1: Manual Workflow (Recommended for compliance)**
- Generate messages via API
- Copy/paste to LinkedIn manually
- Log interactions in system

**Option 2: LinkedIn Sales Navigator**
- Use official LinkedIn API
- Requires Sales Navigator license
- Fully compliant

**Option 3: Third-Party Tools**
- Phantombuster (be careful with LinkedIn ToS)
- Meet Alfred (more compliant)
- Expandi (cloud-based, safer)

### For Prospect Enrichment

1. **Proxycurl** - LinkedIn profile scraping API
   - https://nubela.co/proxycurl/
   - $0.01-0.02 per profile

2. **Hunter.io** - Email finding
   - Find email addresses from LinkedIn profiles
   - Email verification

3. **Clearbit** - Company data enrichment
   - Company size, revenue, industry
   - Technographics

### For Appointment Scheduling

1. **Calendly** - Easy scheduling links
   ```bash
   # Add to email templates
   Book time: https://calendly.com/your-link
   ```

2. **Cal.com** - Open-source alternative
   - Self-hosted option
   - More customization

---

## Best Practices

### Prospect Management

1. **Segment by Agent**
   - Assign prospects to the right agent based on their role
   - Training prospects → Training Agent
   - Product prospects → F&I Products Agent

2. **Score Before Outreach**
   - Score all prospects first
   - Focus on 70+ scores initially
   - Warm up with lower scores later

3. **Enrich LinkedIn Data**
   - Always enrich before LinkedIn outreach
   - Better personalization = higher response rates

### Campaign Strategy

1. **Multi-Channel Approach**
   - LinkedIn connection request
   - Email outreach (3 days later)
   - LinkedIn message (if connected)
   - Phone call (for high-score leads)

2. **Timing**
   - Tuesday-Thursday for emails (best open rates)
   - 8-10 AM or 4-6 PM for LinkedIn
   - Avoid Mondays and Fridays

3. **Personalization**
   - Use AI-generated messages (already personalized)
   - Add custom context when needed
   - Reference specific dealership or market

### Email Best Practices

1. **Subject Lines**
   - Keep under 60 characters
   - Avoid spam words (free, guarantee, act now)
   - Personalize with company name

2. **Email Body**
   - Short paragraphs (2-3 lines max)
   - Clear value proposition in first sentence
   - Single, clear CTA

3. **Follow-Up Cadence**
   - Day 1: Initial email
   - Day 4: Follow-up email
   - Day 7: LinkedIn message
   - Day 11: Final email
   - Day 14: Phone call (if high-score)

---

## Monitoring & Optimization

### Key Metrics to Track

**Per Agent**:
- Total prospects assigned
- Active campaigns
- Response rate
- Appointment booking rate
- Conversion rate

**Per Campaign**:
- Emails sent
- Open rate (requires tracking pixels)
- Click rate
- Reply rate
- Appointments booked

### A/B Testing

Test different approaches:
1. Subject lines
2. Email length (short vs. detailed)
3. CTA types (calendar link vs. reply)
4. Timing
5. Personalization level

---

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
# Update DATABASE_URL in .env
# Then:
npx prisma db push
```

### Email Sending Fails

1. Check email credentials in `.env`
2. Verify SMTP settings
3. Check spam folder
4. Test with a single email first

### LinkedIn Enrichment Not Working

- This is a placeholder in the current setup
- Integrate with Proxycurl or similar service
- Update `/api/linkedin/enrich/route.ts`

### Agent Not Found

- Run seed script: `npx tsx scripts/seed-agents.ts`
- Check database: `npx prisma studio`

---

## Next Steps

1. **Set up database and seed agents**
2. **Import your first prospects**
3. **Test LinkedIn message generation**
4. **Launch first email campaign**
5. **Monitor results and optimize**

For questions or support, refer to the main README.md or API documentation.

---

**Pro Tip**: Start small. Import 10-20 prospects, test the workflows, then scale up once you're comfortable with the system.
