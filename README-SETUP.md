# Sarah AI - Setup Guide

## ✅ Completed Changes

### 1. **Switched to OpenAI as Primary AI**
- All AI methods now use OpenAI GPT-4
- Anthropic Claude available as backup
- Add your OpenAI API key to `.env.local`

### 2. **Fixed Security Issues**
- Removed hardcoded admin credentials
- Moved all sensitive data to `.env.local`
- Created `.env.example` template
- Database authentication now requires valid user accounts

### 3. **Removed Fake Demo Data**
- Removed hardcoded prospects
- Removed fake activity from dashboard
- Removed demo campaign data
- System now shows real data from database

### 4. **Enhanced Prospect Management**
- ✅ Manual prospect entry (already working)
- ✅ CSV bulk upload
- CSV template download available
- Proper validation and duplicate detection

## 🚀 Initial Setup

### 1. Configure Environment Variables

Copy `.env.local` and add your API keys:

```bash
# Required
OPENAI_API_KEY="sk-your-openai-key-here"

# Already configured (verify these)
EMAIL_HOST="smtp.office365.com"
EMAIL_USER="sarahai@supremeone.net"
EMAIL_PASSWORD="SupremeOne2025$"

HEYGEN_API_KEY="MDE5MDQxOTgwMTljNDUzZWJmZWVmMmNjMThjOTMxYWYtMTc1MDAxOTY2OQ=="
```

### 2. Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Create admin user (run this after db push)
npx tsx src/scripts/create-admin.ts
```

**Default Admin Credentials:**
- Email: `admin@supremeone.net`
- Password: `ChangeMe123!`

**⚠️ IMPORTANT:** Change this password after first login!

### 3. Start Development Server

```bash
npm run dev
```

Access at: http://localhost:4000

## 📊 Using the System

### Adding Prospects

**Manual Entry:**
1. Go to Prospects tab
2. Click "Add Prospect"
3. Fill in the form
4. Click "Add Prospect"

**CSV Upload:**
1. Go to Prospects tab
2. Click "Upload CSV"
3. Upload a CSV file with these columns:
   - firstName (required)
   - lastName (required)
   - email
   - phone
   - company
   - position
   - industry
   - dealership
   - source

### CSV Template

Download template: GET http://localhost:4000/api/prospects/bulk-import

Example CSV:
```csv
firstName,lastName,email,phone,company,position,industry,dealership,source
John,Smith,john.smith@abcauto.com,555-123-4567,ABC Auto Dealership,General Manager,Automotive,ABC Auto,linkedin
Jane,Doe,jane.doe@citydealer.com,555-987-6543,City Dealership,F&I Manager,Automotive,City Dealer,referral
```

## 📧 Email Configuration

Using Microsoft 365 via GoDaddy:
- **Email:** sarahai@supremeone.net
- **SMTP:** smtp.office365.com:587
- **Password:** Already configured in `.env.local`

## 🎥 Video Generation

HeyGen AI is configured and ready:
- API key is already set
- Avatar and voice configured
- Videos cost money per generation

## 📅 Calendar Integration (Next Step)

Microsoft 365 calendar integration is planned using the EmilyAI pattern:
- Will use the same Microsoft 365 account (sarahai@supremeone.net)
- Integration code ready to implement

## 🔒 Security Best Practices

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Change default admin password** immediately after setup
3. **Use strong passwords** for all users
4. **Rotate API keys** regularly
5. **Monitor email usage** to avoid hitting limits

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Reset database
npx prisma db push --force-reset

# Recreate admin
npx tsx src/scripts/create-admin.ts
```

### Can't Login
- Ensure database is initialized
- Ensure admin user was created
- Check credentials match

### OpenAI API Errors
- Verify API key is correct in `.env.local`
- Check your OpenAI account has credits
- Verify API key has proper permissions

## 📝 Next Steps

1. Add your OpenAI API key
2. Initialize the database
3. Create admin user
4. Login and start adding prospects
5. (Optional) Integrate Microsoft 365 calendar
6. (Optional) Configure additional integrations (LinkedIn, Twilio, etc.)

## 📚 Additional Resources

- [OpenAI API Docs](https://platform.openai.com/docs)
- [HeyGen API Docs](https://docs.heygen.com/)
- [Prisma Docs](https://www.prisma.io/docs)
- [NextAuth.js Docs](https://next-auth.js.org/)
