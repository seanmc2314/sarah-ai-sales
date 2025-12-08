-- CreateEnum
CREATE TYPE "public"."ProposalStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."FollowUpType" AS ENUM ('EMAIL', 'LINKEDIN_MESSAGE', 'SMS', 'PHONE_REMINDER', 'SOCIAL_MEDIA_COMMENT');

-- CreateEnum
CREATE TYPE "public"."SequenceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'BOUNCED');

-- AlterTable
ALTER TABLE "public"."Prospect" ADD COLUMN     "dealershipWebsite" TEXT,
ADD COLUMN     "employeeCount" INTEGER,
ADD COLUMN     "enriched" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enrichedAt" TIMESTAMP(3),
ADD COLUMN     "facebookUrl" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "revenue" TEXT,
ADD COLUMN     "twitterUrl" TEXT;

-- CreateTable
CREATE TABLE "public"."Proposal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "personalizedPitch" TEXT,
    "roiCalculation" JSONB,
    "trainingProgram" TEXT,
    "status" "public"."ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "followUpCount" INTEGER NOT NULL DEFAULT 0,
    "lastFollowUp" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "prospectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProposalTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT,
    "template" TEXT NOT NULL,
    "pitchTemplate" TEXT,
    "roiTemplate" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ProposalTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FollowUpSequence" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "triggerEvent" TEXT NOT NULL,
    "delayDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "FollowUpSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FollowUpStep" (
    "id" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."FollowUpType" NOT NULL,
    "delayDays" INTEGER NOT NULL,
    "delayHours" INTEGER NOT NULL DEFAULT 0,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sequenceId" TEXT NOT NULL,

    CONSTRAINT "FollowUpStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SequenceEnrollment" (
    "id" TEXT NOT NULL,
    "status" "public"."SequenceStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "lastStepSentAt" TIMESTAMP(3),
    "nextStepDue" TIMESTAMP(3),
    "notes" TEXT,
    "prospectId" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,

    CONSTRAINT "SequenceEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Proposal_status_idx" ON "public"."Proposal"("status");

-- CreateIndex
CREATE INDEX "Proposal_sentAt_idx" ON "public"."Proposal"("sentAt");

-- CreateIndex
CREATE INDEX "Proposal_prospectId_idx" ON "public"."Proposal"("prospectId");

-- CreateIndex
CREATE INDEX "ProposalTemplate_active_idx" ON "public"."ProposalTemplate"("active");

-- CreateIndex
CREATE INDEX "ProposalTemplate_category_idx" ON "public"."ProposalTemplate"("category");

-- CreateIndex
CREATE INDEX "FollowUpSequence_active_idx" ON "public"."FollowUpSequence"("active");

-- CreateIndex
CREATE INDEX "FollowUpSequence_triggerEvent_idx" ON "public"."FollowUpSequence"("triggerEvent");

-- CreateIndex
CREATE INDEX "FollowUpStep_sequenceId_stepNumber_idx" ON "public"."FollowUpStep"("sequenceId", "stepNumber");

-- CreateIndex
CREATE INDEX "SequenceEnrollment_status_idx" ON "public"."SequenceEnrollment"("status");

-- CreateIndex
CREATE INDEX "SequenceEnrollment_nextStepDue_idx" ON "public"."SequenceEnrollment"("nextStepDue");

-- CreateIndex
CREATE INDEX "SequenceEnrollment_prospectId_idx" ON "public"."SequenceEnrollment"("prospectId");

-- CreateIndex
CREATE INDEX "SequenceEnrollment_sequenceId_idx" ON "public"."SequenceEnrollment"("sequenceId");

-- CreateIndex
CREATE INDEX "EmailTemplate_active_idx" ON "public"."EmailTemplate"("active");

-- CreateIndex
CREATE INDEX "EmailTemplate_category_idx" ON "public"."EmailTemplate"("category");

-- CreateIndex
CREATE INDEX "EmailTemplate_tags_idx" ON "public"."EmailTemplate"("tags");

-- CreateIndex
CREATE INDEX "Prospect_enriched_idx" ON "public"."Prospect"("enriched");

-- AddForeignKey
ALTER TABLE "public"."Proposal" ADD CONSTRAINT "Proposal_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "public"."Prospect"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Proposal" ADD CONSTRAINT "Proposal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Proposal" ADD CONSTRAINT "Proposal_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."ProposalTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProposalTemplate" ADD CONSTRAINT "ProposalTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FollowUpSequence" ADD CONSTRAINT "FollowUpSequence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FollowUpStep" ADD CONSTRAINT "FollowUpStep_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "public"."FollowUpSequence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SequenceEnrollment" ADD CONSTRAINT "SequenceEnrollment_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "public"."Prospect"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SequenceEnrollment" ADD CONSTRAINT "SequenceEnrollment_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "public"."FollowUpSequence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailTemplate" ADD CONSTRAINT "EmailTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
