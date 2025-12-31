-- CreateEnum
CREATE TYPE "public"."DealershipStatus" AS ENUM ('PROSPECT', 'QUALIFIED', 'NEGOTIATION', 'ACTIVE_CUSTOMER', 'CHURNED', 'DO_NOT_CONTACT');

-- CreateEnum
CREATE TYPE "public"."DealStage" AS ENUM ('LEAD', 'QUALIFIED', 'MEETING_SCHEDULED', 'PROPOSAL_SENT', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "public"."ActivityType" AS ENUM ('EMAIL_SENT', 'EMAIL_RECEIVED', 'CALL_OUTBOUND', 'CALL_INBOUND', 'MEETING', 'NOTE', 'LINKEDIN_MESSAGE', 'LINKEDIN_CONNECTION', 'AI_INTERACTION', 'TASK_COMPLETED', 'STATUS_CHANGE', 'DOCUMENT_UPLOAD', 'SOCIAL_POST');

-- CreateEnum
CREATE TYPE "public"."DocumentCategory" AS ENUM ('AGREEMENT', 'CONTRACT', 'PROPOSAL', 'INVOICE', 'NDA', 'TRAINING_MATERIAL', 'REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."Campaign" ADD COLUMN     "agentId" TEXT,
ADD COLUMN     "stats" JSONB;

-- AlterTable
ALTER TABLE "public"."EmailTemplate" ADD COLUMN     "agentId" TEXT;

-- AlterTable
ALTER TABLE "public"."FollowUpSequence" ADD COLUMN     "agentId" TEXT;

-- AlterTable
ALTER TABLE "public"."ProposalTemplate" ADD COLUMN     "agentId" TEXT;

-- AlterTable
ALTER TABLE "public"."Prospect" ADD COLUMN     "agentId" TEXT,
ADD COLUMN     "leadScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "linkedinData" JSONB;

-- CreateTable
CREATE TABLE "public"."Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "persona" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "products" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "icon" TEXT,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LinkedInAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "linkedinId" TEXT,
    "linkedinName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkedInAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Dealership" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "status" "public"."DealershipStatus" NOT NULL DEFAULT 'PROSPECT',
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'USA',
    "dealerGroup" TEXT,
    "brands" TEXT[],
    "employeeCount" INTEGER,
    "annualRevenue" TEXT,
    "fiManagerCount" INTEGER,
    "customerSince" TIMESTAMP(3),
    "churnedAt" TIMESTAMP(3),
    "contractEndDate" TIMESTAMP(3),
    "monthlyValue" DOUBLE PRECISION,
    "contractType" TEXT,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "liveActivatedAt" TIMESTAMP(3),
    "notes" TEXT,
    "tags" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assignedUserId" TEXT,

    CONSTRAINT "Dealership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contact" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "position" TEXT,
    "department" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "linkedinUrl" TEXT,
    "facebookUrl" TEXT,
    "twitterUrl" TEXT,
    "leadScore" INTEGER NOT NULL DEFAULT 0,
    "leadScoreReason" TEXT,
    "scoredAt" TIMESTAMP(3),
    "preferredChannel" TEXT,
    "timezone" TEXT,
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dealershipId" TEXT,
    "legacyProspectId" TEXT,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Deal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyRecurring" DOUBLE PRECISION,
    "stage" "public"."DealStage" NOT NULL DEFAULT 'LEAD',
    "probability" INTEGER NOT NULL DEFAULT 10,
    "expectedCloseDate" TIMESTAMP(3),
    "actualCloseDate" TIMESTAMP(3),
    "dealType" TEXT,
    "source" TEXT,
    "lostReason" TEXT,
    "notes" TEXT,
    "tags" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "dealershipId" TEXT NOT NULL,
    "contactId" TEXT,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Activity" (
    "id" TEXT NOT NULL,
    "type" "public"."ActivityType" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER,
    "outcome" TEXT,
    "emailSubject" TEXT,
    "emailContent" TEXT,
    "emailSentAt" TIMESTAMP(3),
    "emailOpenedAt" TIMESTAMP(3),
    "emailClickedAt" TIMESTAMP(3),
    "aiPrompt" TEXT,
    "aiResponse" TEXT,
    "aiModel" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dealershipId" TEXT,
    "contactId" TEXT,
    "dealId" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "description" TEXT,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileExtension" TEXT NOT NULL,
    "category" "public"."DocumentCategory" NOT NULL,
    "tags" TEXT[],
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "signedBy" TEXT,
    "s3Key" TEXT,
    "s3Bucket" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dealershipId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "dueTime" TEXT,
    "reminderAt" TIMESTAMP(3),
    "priority" "public"."TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "taskType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dealershipId" TEXT,
    "contactId" TEXT,
    "dealId" TEXT,
    "assignedToId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_slug_key" ON "public"."Agent"("slug");

-- CreateIndex
CREATE INDEX "Agent_active_idx" ON "public"."Agent"("active");

-- CreateIndex
CREATE INDEX "Agent_slug_idx" ON "public"."Agent"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "LinkedInAccount_userId_key" ON "public"."LinkedInAccount"("userId");

-- CreateIndex
CREATE INDEX "LinkedInAccount_userId_idx" ON "public"."LinkedInAccount"("userId");

-- CreateIndex
CREATE INDEX "Dealership_status_idx" ON "public"."Dealership"("status");

-- CreateIndex
CREATE INDEX "Dealership_isLive_idx" ON "public"."Dealership"("isLive");

-- CreateIndex
CREATE INDEX "Dealership_assignedUserId_idx" ON "public"."Dealership"("assignedUserId");

-- CreateIndex
CREATE INDEX "Dealership_name_idx" ON "public"."Dealership"("name");

-- CreateIndex
CREATE INDEX "Contact_dealershipId_idx" ON "public"."Contact"("dealershipId");

-- CreateIndex
CREATE INDEX "Contact_leadScore_idx" ON "public"."Contact"("leadScore");

-- CreateIndex
CREATE INDEX "Contact_email_idx" ON "public"."Contact"("email");

-- CreateIndex
CREATE INDEX "Deal_stage_idx" ON "public"."Deal"("stage");

-- CreateIndex
CREATE INDEX "Deal_ownerId_idx" ON "public"."Deal"("ownerId");

-- CreateIndex
CREATE INDEX "Deal_dealershipId_idx" ON "public"."Deal"("dealershipId");

-- CreateIndex
CREATE INDEX "Deal_expectedCloseDate_idx" ON "public"."Deal"("expectedCloseDate");

-- CreateIndex
CREATE INDEX "Activity_type_idx" ON "public"."Activity"("type");

-- CreateIndex
CREATE INDEX "Activity_dealershipId_idx" ON "public"."Activity"("dealershipId");

-- CreateIndex
CREATE INDEX "Activity_contactId_idx" ON "public"."Activity"("contactId");

-- CreateIndex
CREATE INDEX "Activity_dealId_idx" ON "public"."Activity"("dealId");

-- CreateIndex
CREATE INDEX "Activity_createdAt_idx" ON "public"."Activity"("createdAt");

-- CreateIndex
CREATE INDEX "Document_dealershipId_idx" ON "public"."Document"("dealershipId");

-- CreateIndex
CREATE INDEX "Document_category_idx" ON "public"."Document"("category");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "public"."Task"("status");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "public"."Task"("dueDate");

-- CreateIndex
CREATE INDEX "Task_assignedToId_idx" ON "public"."Task"("assignedToId");

-- CreateIndex
CREATE INDEX "Task_dealershipId_idx" ON "public"."Task"("dealershipId");

-- CreateIndex
CREATE INDEX "Task_priority_idx" ON "public"."Task"("priority");

-- CreateIndex
CREATE INDEX "Prospect_agentId_idx" ON "public"."Prospect"("agentId");

-- CreateIndex
CREATE INDEX "Prospect_leadScore_idx" ON "public"."Prospect"("leadScore");

-- AddForeignKey
ALTER TABLE "public"."Agent" ADD CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Prospect" ADD CONSTRAINT "Prospect_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Campaign" ADD CONSTRAINT "Campaign_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProposalTemplate" ADD CONSTRAINT "ProposalTemplate_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FollowUpSequence" ADD CONSTRAINT "FollowUpSequence_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailTemplate" ADD CONSTRAINT "EmailTemplate_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Dealership" ADD CONSTRAINT "Dealership_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contact" ADD CONSTRAINT "Contact_dealershipId_fkey" FOREIGN KEY ("dealershipId") REFERENCES "public"."Dealership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deal" ADD CONSTRAINT "Deal_dealershipId_fkey" FOREIGN KEY ("dealershipId") REFERENCES "public"."Dealership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deal" ADD CONSTRAINT "Deal_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deal" ADD CONSTRAINT "Deal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_dealershipId_fkey" FOREIGN KEY ("dealershipId") REFERENCES "public"."Dealership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_dealershipId_fkey" FOREIGN KEY ("dealershipId") REFERENCES "public"."Dealership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_dealershipId_fkey" FOREIGN KEY ("dealershipId") REFERENCES "public"."Dealership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
