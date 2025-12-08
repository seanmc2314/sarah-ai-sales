-- CreateEnum
CREATE TYPE "public"."ProspectStatus" AS ENUM ('COLD', 'CONTACTED', 'INTERESTED', 'APPOINTMENT_SET', 'PROPOSAL_SENT', 'CLOSED_WON', 'CLOSED_LOST', 'DO_NOT_CONTACT');

-- CreateEnum
CREATE TYPE "public"."InteractionType" AS ENUM ('EMAIL', 'LINKEDIN_MESSAGE', 'LINKEDIN_CONNECTION', 'PHONE_CALL', 'SOCIAL_MEDIA_COMMENT', 'SOCIAL_MEDIA_POST', 'MEETING');

-- CreateEnum
CREATE TYPE "public"."AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "public"."CampaignType" AS ENUM ('LINKEDIN_OUTREACH', 'EMAIL_SEQUENCE', 'SOCIAL_MEDIA', 'PHONE_CAMPAIGN');

-- CreateEnum
CREATE TYPE "public"."CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."Platform" AS ENUM ('LINKEDIN', 'INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'TWITTER');

-- CreateEnum
CREATE TYPE "public"."PostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('APPOINTMENT_SCHEDULED', 'APPOINTMENT_REMINDER', 'PROSPECT_RESPONDED', 'CAMPAIGN_COMPLETED', 'SYSTEM_ALERT');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "linkedinEmail" TEXT,
    "linkedinPassword" TEXT,
    "instagramEmail" TEXT,
    "instagramPassword" TEXT,
    "facebookEmail" TEXT,
    "facebookPassword" TEXT,
    "youtubeEmail" TEXT,
    "youtubePassword" TEXT,
    "microsoftAccessToken" TEXT,
    "microsoftRefreshToken" TEXT,
    "microsoftEmail" TEXT,
    "twilioAccountSid" TEXT,
    "twilioAuthToken" TEXT,
    "twilioFromNumber" TEXT,
    "emailProvider" TEXT,
    "emailHost" TEXT,
    "emailPort" INTEGER,
    "emailUser" TEXT,
    "emailPassword" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Prospect" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "position" TEXT,
    "linkedinUrl" TEXT,
    "source" TEXT NOT NULL,
    "status" "public"."ProspectStatus" NOT NULL DEFAULT 'COLD',
    "industry" TEXT,
    "dealership" TEXT,
    "notes" TEXT,
    "lastContactDate" TIMESTAMP(3),
    "nextFollowUp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Interaction" (
    "id" TEXT NOT NULL,
    "type" "public"."InteractionType" NOT NULL,
    "content" TEXT,
    "result" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "successful" BOOLEAN,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prospectId" TEXT NOT NULL,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Appointment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "public"."AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "meetingLink" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "prospectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."CampaignType" NOT NULL,
    "status" "public"."CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "targetAudience" TEXT,
    "content" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SocialPost" (
    "id" TEXT NOT NULL,
    "platform" "public"."Platform" NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "status" "public"."PostStatus" NOT NULL DEFAULT 'DRAFT',
    "engagement" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VideoContent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail" TEXT,
    "duration" INTEGER,
    "size" INTEGER,
    "format" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KnowledgeBase" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[],
    "version" TEXT NOT NULL DEFAULT '1.0',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AIConversation" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT,
    "context" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "summary" TEXT,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "Prospect_status_idx" ON "public"."Prospect"("status");

-- CreateIndex
CREATE INDEX "Prospect_nextFollowUp_idx" ON "public"."Prospect"("nextFollowUp");

-- CreateIndex
CREATE INDEX "Interaction_type_idx" ON "public"."Interaction"("type");

-- CreateIndex
CREATE INDEX "Interaction_scheduledAt_idx" ON "public"."Interaction"("scheduledAt");

-- CreateIndex
CREATE INDEX "Appointment_startTime_idx" ON "public"."Appointment"("startTime");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "public"."Appointment"("status");

-- CreateIndex
CREATE INDEX "SocialPost_platform_idx" ON "public"."SocialPost"("platform");

-- CreateIndex
CREATE INDEX "SocialPost_scheduledAt_idx" ON "public"."SocialPost"("scheduledAt");

-- CreateIndex
CREATE INDEX "VideoContent_tags_idx" ON "public"."VideoContent"("tags");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "public"."Notification"("read");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "public"."Notification"("createdAt");

-- CreateIndex
CREATE INDEX "KnowledgeBase_category_idx" ON "public"."KnowledgeBase"("category");

-- CreateIndex
CREATE INDEX "KnowledgeBase_tags_idx" ON "public"."KnowledgeBase"("tags");

-- CreateIndex
CREATE INDEX "AIConversation_prospectId_idx" ON "public"."AIConversation"("prospectId");

-- CreateIndex
CREATE INDEX "AIConversation_context_idx" ON "public"."AIConversation"("context");

-- AddForeignKey
ALTER TABLE "public"."Prospect" ADD CONSTRAINT "Prospect_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Interaction" ADD CONSTRAINT "Interaction_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "public"."Prospect"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "public"."Prospect"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Campaign" ADD CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SocialPost" ADD CONSTRAINT "SocialPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SocialPost" ADD CONSTRAINT "SocialPost_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
