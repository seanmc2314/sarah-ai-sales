# Autonomous Sales System - Sarah AI

## Overview

Your Sarah AI platform now includes a fully autonomous sales system targeting dealership owners, GMs, and presidents. The system automatically generates prospects, creates personalized proposals, and follows up until deals are closed.

## 🚀 Key Features

### 1. **Prospect Generation (Multi-Channel)**

#### CSV/Excel Import
- Navigate to **Prospects** tab → **Upload CSV**
- Required columns: `first_name`, `last_name`
- Optional: `email`, `phone`, `dealership`, `position`, `website`, `location`
- Automatically imports and validates data
- Can auto-enroll prospects in follow-up sequences

#### Web Scraping
- Scrapes dealership websites for contact information
- Extracts: dealership name, phone, email, location
- AI-powered enrichment of prospect data
- Function: `enrichProspectWithAI()` in `/src/lib/scraping/dealershipScraper.ts`

#### Social Media Discovery
- Placeholder for LinkedIn/Facebook integration
- Ready for API integration (requires API keys)

### 2. **AI-Powered Proposal Generation**

The system uses OpenAI GPT-4o to generate personalized training proposals for each prospect.

#### How to Generate a Proposal:
1. Go to **Prospects** tab
2. Find a prospect
3. Click **"Generate Proposal"** button
4. AI creates a proposal including:
   - Personalized opening pitch
   - Supreme One Training program overview
   - ROI calculation (projected revenue increase)
   - Success stories
   - Clear call-to-action

#### Proposal Components:
- **Personalized Pitch**: Tailored to prospect's specific situation
- **ROI Calculation**: Shows potential F&I performance improvement
  - Estimates monthly vehicle sales based on team size
  - Projects 25% PVR increase (conservative)
  - Calculates payback period
- **Training Program Details**: F&I products, objection handling, compliance, Sarah AI coaching

#### API Endpoints:
- `POST /api/proposals/generate` - Generate proposal for prospect
- `POST /api/proposals/[id]/send` - Send proposal via email

### 3. **Automated Follow-Up Sequences**

The system automatically follows up with prospects based on their behavior.

#### How It Works:
1. **Create Sequences**: Define multi-step follow-up workflows
   - Each step has a delay (days + hours)
   - Content can be AI-personalized per prospect
   - Supports: Email, LinkedIn, SMS, phone reminders

2. **Auto-Enrollment Triggers**:
   - `proposal_sent` - When proposal is sent
   - `no_response_7days` - 7 days after proposal with no response
   - `viewed_not_accepted` - Prospect viewed but didn't accept

3. **Smart Scheduling**:
   - AI determines optimal send times
   - Tracks engagement and adjusts timing
   - Pauses/resumes sequences as needed

#### Cron Automation:
The system runs on a 15-minute schedule via `/api/automation/cron`:
- Processes due follow-ups
- Checks for prospects to auto-enroll
- Sends scheduled communications

**Setup Cron Job** (Vercel, Railway, or external cron):
```bash
# Call every 15 minutes
curl -X POST https://your-domain.com/api/automation/cron \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Set `CRON_SECRET` in your `.env.local`:
```
CRON_SECRET=your-secure-secret-here
```

### 4. **Prospect Enrichment**

Automatically enriches prospect data from web sources:

```typescript
// Enrich a single prospect
await enrichProspectWithAI(prospectId, dealershipWebsite)

// Bulk enrich all prospects with websites
await bulkEnrichProspects(userId, limit)
```

## 📊 Database Schema

### New Models Added:

#### **Proposal**
- Stores AI-generated proposals
- Tracks views, accepts, rejections
- Links to prospects and templates

#### **ProposalTemplate**
- Reusable proposal templates
- Support variables like `{{firstName}}`, `{{dealership}}`
- Category-based (owner, GM, president)

#### **FollowUpSequence**
- Multi-step automated sequences
- Trigger-based enrollment
- Smart delay scheduling

#### **FollowUpStep**
- Individual steps in sequences
- AI-generated content option
- Multi-channel support (email, LinkedIn, SMS)

#### **SequenceEnrollment**
- Tracks which prospects are in which sequences
- Current step and status
- Next step due date

#### **EmailTemplate**
- Email templates with placeholders
- Categorized by use case

## 🎯 Autonomous Workflow Example

### Complete End-to-End Process:

1. **Import Prospects** (CSV upload)
   ```
   Upload dealership_owners.csv
   → 100 prospects imported
   → Auto-enroll in "Cold Outreach" sequence
   ```

2. **Enrichment** (Automatic or manual trigger)
   ```
   System scrapes dealership websites
   → Extracts contact info
   → AI identifies decision makers
   → Updates prospect records
   ```

3. **Initial Outreach** (Sequence Step 1 - Day 0)
   ```
   Email sent with personalized introduction
   → "Hi John, noticed your dealership in Austin..."
   → Mentions Supreme One Training benefits
   ```

4. **Generate Proposal** (Sequence Step 2 - Day 3)
   ```
   If prospect opens email:
   → AI generates custom proposal
   → Includes ROI: "$75K annual increase from 25% PVR improvement"
   → Sent automatically
   → Prospect marked as "PROPOSAL_SENT"
   ```

5. **Follow-Up Sequence** (Steps 3-6)
   ```
   Day 5: Follow-up email asking for feedback
   Day 8: LinkedIn message with case study
   Day 12: SMS reminder (if phone provided)
   Day 15: Final email with special offer
   ```

6. **Auto Re-Enrollment** (If no response after Day 15)
   ```
   Prospect auto-enrolled in "Long-term nurture" sequence
   → Monthly check-ins for 6 months
   → Different messaging approach
   ```

## 🔧 Configuration

### Environment Variables Required:

```env
# OpenAI for AI generation
OPENAI_API_KEY=sk-...

# Database
DATABASE_URL=prisma+postgres://localhost:51213/...

# Email (Optional - for sending emails)
EMAIL_PROVIDER=sendgrid # or smtp, ses
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.xxx

# Twilio (Optional - for SMS)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1234567890

# Cron Secret
CRON_SECRET=your-secure-random-string

# NextAuth
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:4000
```

## 📈 ROI Calculation Logic

The system automatically calculates ROI for each prospect:

```typescript
// Default Assumptions:
- Monthly vehicles: employeeCount * 25 (or 100 default)
- Current F&I PVR: $1,500 (industry average)
- Projected increase: 25% (conservative)
- Training cost: $500/person/month

// Example Calculation:
Dealership: 5 employees
Monthly vehicles: 125
Current PVR: $1,500
Increase: $375/vehicle (25%)
Monthly revenue increase: $46,875
Annual increase: $562,500
Training investment: $30,000/year
ROI: 1,775%
Payback period: 0.6 months
```

## 🎨 User Interface

### Prospects Panel
- **Search & Filter**: By status, name, company
- **CSV Upload**: Bulk import with auto-enrollment option
- **Generate Proposal**: One-click AI proposal creation
- **View Details**: See full prospect history and interactions

### Future Enhancements
- **Dashboard**: Show pipeline metrics, proposal stats, sequence performance
- **Social Media Panel**: LinkedIn/Facebook automation
- **Appointments**: Calendar integration for meetings
- **Analytics**: Conversion rates, response times, ROI tracking

## 📝 Creating Custom Follow-Up Sequences

### Via Database (Prisma):

```typescript
// Create a new sequence
const sequence = await prisma.followUpSequence.create({
  data: {
    name: "No Response After Proposal",
    description: "Follow up with prospects who haven't responded to proposal",
    triggerEvent: "no_response_7days",
    delayDays: 0,
    active: true,
    userId: userId,
    steps: {
      create: [
        {
          stepNumber: 1,
          name: "Friendly Check-in",
          type: "EMAIL",
          delayDays: 2,
          subject: "Just checking in - Supreme One Training",
          content: "Hi {{firstName}}, I wanted to check if you had a chance to review the proposal...",
          channel: "email",
          aiGenerated: true
        },
        {
          stepNumber: 2,
          name: "LinkedIn Message",
          type: "LINKEDIN_MESSAGE",
          delayDays: 4,
          content: "Hi {{firstName}}, sharing a case study from a similar dealership...",
          channel: "linkedin",
          aiGenerated: true
        }
      ]
    }
  }
})
```

## 🔒 Security Notes

- All AI-generated content is reviewed before sending
- Prospect data is encrypted at rest
- API endpoints require authentication
- Cron endpoint requires secret token
- User permissions control access to features

## 📞 Support

For questions or issues:
- Check logs: Browser console + Server logs
- Database: `npx prisma studio` (view data)
- API testing: Use Postman or curl
- Cron testing: `GET /api/automation/cron` (dev only)

## 🚦 Getting Started

1. **Import Prospects**: Upload CSV or add manually
2. **Generate First Proposal**: Test AI generation
3. **Create Sequence**: Set up basic follow-up workflow
4. **Setup Cron**: Enable automation
5. **Monitor**: Watch sequences process and proposals send

## 📊 Success Metrics to Track

- Prospects imported per week
- Proposals generated
- Proposal view rate
- Proposal acceptance rate
- Email open rates
- Sequence completion rates
- Deals closed (CLOSED_WON status)
- Average time to close
- ROI delivered to customers

---

**Built with**: Next.js, Prisma, OpenAI GPT-4o, TypeScript
**Last Updated**: October 2025
