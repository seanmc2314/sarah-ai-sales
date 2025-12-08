# Sarah AI - F&I Sales Automation Platform

The most advanced AI-powered sales automation platform specifically designed for Finance & Insurance professionals.

## 🚀 Features

- **AI-Powered Automation**: Complete sales process automation from lead generation to deal closing
- **Email Campaigns**: Automated, personalized email sequences with real email integration
- **Personalized Videos**: Generate custom video messages using HeyGen AI avatars
- **LinkedIn Integration**: Professional LinkedIn content generation with F&I expertise
- **CRM & Analytics**: Complete prospect management with campaign tracking
- **F&I Expertise**: Powered by Supreme One's proven F&I training methodologies

## 🛠 Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (via Prisma)
- **Authentication**: NextAuth.js
- **AI Integration**: Anthropic Claude, HeyGen Video AI
- **Email**: Nodemailer with Microsoft 365 (sarahai@supremeone.net)
- **F&I Content**: Local Supreme One platform integration

## 📧 Email Configuration

The platform uses **sarahai@supremeone.net** (Microsoft 365 via GoDaddy) for automated email campaigns:

```env
EMAIL_HOST="smtp.office365.com"
EMAIL_PORT=587
EMAIL_USER="sarahai@supremeone.net"
EMAIL_PASSWORD="SupremeOne2025$"
```

## 🎥 Video Generation

HeyGen AI integration for personalized video messages:

```env
HEYGEN_API_KEY="MDE5MDQxOTgwMTljNDUzZWJmZWVmMmNjMThjOTMxYWYtMTc1MDAxOTY2OQ=="
HEYGEN_DEFAULT_AVATAR_ID="4dbe5004d80c4a35b98b100c2bd26c62"
HEYGEN_DEFAULT_VOICE_ID="PVNJps1qJSgo6Ln99fWO"
```

## 🏢 F&I Expertise Integration

Sarah AI leverages Supreme One F&I training content from the local platform:

```env
SUPREME_ONE_LOCAL_PATH="/Users/seanmcnally/Desktop/supreme-one-platform"
SUPREME_ONE_CONTENT_ACCESS="enabled"
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Supreme One platform folder access

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd sarah-ai
   npm install
   ```

2. **Set up environment variables:**
   - Copy `.env.example` to `.env`
   - Configure all required environment variables

3. **Set up database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Access the platform:**
   - Open http://localhost:4000
   - Use demo credentials: `demo@sarahai.com` / `demo123`

## 📱 Platform Structure

### Public Pages
- **Homepage** (`/`) - Marketing landing page
- **Sign In** (`/auth/signin`) - User authentication

### Dashboard Pages
- **Overview** (`/dashboard`) - Main dashboard with stats
- **Prospects** (`/dashboard/prospects`) - CRM prospect management
- **Campaigns** (`/dashboard/campaigns`) - Email campaign tracking
- **Sarah AI** (`/dashboard/sarah`) - AI content generation

## 🔧 Core Functionality

### 1. Prospect Management
- Add individual prospects
- Bulk import from CSV
- Status tracking and filtering
- Contact history

### 2. Email Automation
- Automated email campaigns
- Personalized content generation
- Real email delivery via sarahai@supremeone.net
- Campaign performance tracking

### 3. LinkedIn Integration
- Generate connection requests
- Create personalized messages
- Professional post content
- Copy/paste ready format

### 4. Video Generation
- HeyGen AI avatar videos
- Prospect-specific content
- F&I expertise integration
- Automated video emails

### 5. F&I Expertise
- Supreme One content integration
- Compliance-focused messaging
- Real F&I scenarios
- Proven sales methodologies

## 🎯 Target Audience

Sarah AI is specifically designed for:
- Finance & Insurance professionals
- Automotive dealership F&I managers
- F&I training organizations
- Sales automation consultants

## 🔒 Security & Compliance

- Secure authentication with NextAuth.js
- Environment variable encryption
- GDPR-compliant data handling
- F&I compliance-focused messaging

## 📊 Analytics & Tracking

- Campaign performance metrics
- Email open and click rates
- Prospect engagement tracking
- ROI analysis and reporting

## 🌐 Deployment

### Production Environment Variables

```env
NEXTAUTH_URL="https://your-domain.com"
DATABASE_URL="your-production-database-url"
EMAIL_PASSWORD="your-production-email-password"
HEYGEN_API_KEY="your-production-heygen-key"
```

### Domain Setup

Configure your custom domain:
1. Update `NEXTAUTH_URL` in production
2. Set up DNS records
3. Configure SSL certificate
4. Update email configuration

## 🤝 Support

For support and questions:
- Email: support@sarahai.com
- Documentation: Built-in help system
- F&I Expertise: Powered by Supreme One Training

## 📄 License

© 2024 Sarah AI. All rights reserved. Powered by Supreme One F&I expertise.

---

**Sarah AI - Transforming F&I Sales Through AI Automation** 🚀