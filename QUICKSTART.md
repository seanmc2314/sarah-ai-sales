# Quick Start Guide - Multi-Agent Sales System

Get your two AI sales agents up and running in **5 minutes**.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL running locally
- API keys configured in `.env`

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd sarah-ai
npm install
```

### 2. Configure Environment

Make sure your `.env` file has these keys:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sarahai"

# API Keys
ANTHROPIC_API_KEY="your-claude-api-key"
OPENAI_API_KEY="your-openai-key" # Optional

# Email (Microsoft 365)
EMAIL_HOST="smtp.office365.com"
EMAIL_PORT=587
EMAIL_USER="your-email@domain.com"
EMAIL_PASSWORD="your-password"

# NextAuth
NEXTAUTH_URL="http://localhost:4000"
NEXTAUTH_SECRET="generate-a-random-secret-here"
```

### 3. Set Up Database

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Optional: Open Prisma Studio to view data
npx prisma studio
```

### 4. Seed the Two Agents

```bash
npx tsx scripts/seed-agents.ts
```

This creates:
- ✅ Training Program Agent 🎓
- ✅ F&I Products Agent 🚗
- ✅ Email templates for both agents

### 5. Start the Application

```bash
npm run dev
```

Access the app at: **http://localhost:4000**

### 6. Login

Default credentials (if you have a user):
- Email: `demo@sarahai.com`
- Password: `demo123`

Or create a new user via the signup page.

---

## Quick Test Workflow

### Test 1: View Your Agents

1. Navigate to `/dashboard/agents`
2. You should see both agents with their stats

### Test 2: Add a Test Prospect

```bash
curl -X POST http://localhost:4000/api/prospects \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Smith",
    "email": "john@testdealership.com",
    "company": "Test Auto Group",
    "position": "F&I Manager",
    "linkedinUrl": "https://linkedin.com/in/johnsmith",
    "agentId": "your-training-agent-id"
  }'
```

Or use the dashboard at `/dashboard/prospects`

### Test 3: Generate LinkedIn Message

```bash
curl -X POST http://localhost:4000/api/linkedin/generate-message \
  -H "Content-Type: application/json" \
  -d '{
    "prospectId": "your-prospect-id",
    "agentId": "your-agent-id",
    "messageType": "connection_request"
  }'
```

### Test 4: Score a Prospect

```bash
curl -X POST http://localhost:4000/api/prospects/score \
  -H "Content-Type: application/json" \
  -d '{
    "prospectIds": ["prospect-id-here"]
  }'
```

### Test 5: Send Email Campaign

```bash
curl -X POST http://localhost:4000/api/email/send-campaign \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "your-agent-id",
    "prospectIds": ["prospect-id-here"],
    "customSubject": "Quick question about {{company}}",
    "customBody": "Hi {{firstName}}, I help F&I professionals..."
  }'
```

---

## Common Use Cases

### Use Case 1: LinkedIn Outreach Campaign

```
1. Import prospects from CSV
   → POST /api/prospects/bulk-import

2. Assign to appropriate agent
   → PATCH /api/prospects/{id} with agentId

3. Score prospects
   → POST /api/prospects/score

4. Generate connection requests
   → POST /api/linkedin/generate-message

5. Manually send on LinkedIn
   → Copy/paste generated messages
```

### Use Case 2: Email Drip Campaign

```
1. Create email templates
   → Use existing templates or create new ones

2. Import prospect list
   → CSV or manual entry

3. Send initial email
   → POST /api/email/send-campaign

4. Set up follow-up sequence
   → Will auto-send based on schedule
```

### Use Case 3: Mixed Channel Outreach

```
Day 1: LinkedIn connection request
Day 3: Email if no LinkedIn response
Day 7: LinkedIn message (if connected)
Day 10: Follow-up email
Day 14: Phone call (for hot leads)
```

---

## Next Steps

Once you've tested the basic functionality:

1. **Import Real Prospects**
   - Export from LinkedIn Sales Navigator
   - Import CSV via dashboard
   - Assign to correct agents

2. **Customize Templates**
   - Edit email templates in database
   - Adjust AI personas in agent settings
   - Create follow-up sequences

3. **Launch First Campaign**
   - Start small (10-20 prospects)
   - Test message quality
   - Monitor response rates
   - Scale up based on results

4. **Set Up Integrations**
   - Proxycurl for LinkedIn enrichment
   - Calendly for appointment booking
   - Zapier for additional automation

---

## Troubleshooting

**Database connection error?**
```bash
# Make sure PostgreSQL is running
# Check DATABASE_URL in .env
# Try: npx prisma db push
```

**Agents not showing up?**
```bash
# Re-run seed script
npx tsx scripts/seed-agents.ts
```

**Email not sending?**
```bash
# Verify email credentials in .env
# Test with a single prospect first
# Check spam folder
```

**API errors?**
```bash
# Check if server is running on port 4000
# Verify you're authenticated
# Check browser console for errors
```

---

## Resources

- **Full Guide**: `MULTI_AGENT_GUIDE.md`
- **Database Schema**: `prisma/schema.prisma`
- **API Endpoints**: Browse to `/api/*` for route files
- **Dashboard**: http://localhost:4000/dashboard/agents

---

**Support**: For issues or questions, refer to the main documentation or create an issue in the project repository.

Happy selling! 🚀
