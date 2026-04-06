-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CredentialType" ADD VALUE 'NOTION';
ALTER TYPE "CredentialType" ADD VALUE 'HUBSPOT';
ALTER TYPE "CredentialType" ADD VALUE 'MCP_CLIENT';
ALTER TYPE "CredentialType" ADD VALUE 'SALESFORCE';
ALTER TYPE "CredentialType" ADD VALUE 'FIRECRAWL';
ALTER TYPE "CredentialType" ADD VALUE 'QUICKBOOKS';
ALTER TYPE "CredentialType" ADD VALUE 'SHOPIFY';
ALTER TYPE "CredentialType" ADD VALUE 'MS_TEAMS';
ALTER TYPE "CredentialType" ADD VALUE 'GOOGLE_DRIVE';
ALTER TYPE "CredentialType" ADD VALUE 'CALENDLY';
ALTER TYPE "CredentialType" ADD VALUE 'ZENDESK';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NodeType" ADD VALUE 'NOTION';
ALTER TYPE "NodeType" ADD VALUE 'HUBSPOT';
ALTER TYPE "NodeType" ADD VALUE 'MCP_CLIENT';
ALTER TYPE "NodeType" ADD VALUE 'MCP_CLIENT_TOOL';
ALTER TYPE "NodeType" ADD VALUE 'SALESFORCE';
ALTER TYPE "NodeType" ADD VALUE 'FIRECRAWL';
ALTER TYPE "NodeType" ADD VALUE 'QUICKBOOKS';
ALTER TYPE "NodeType" ADD VALUE 'SHOPIFY';
ALTER TYPE "NodeType" ADD VALUE 'MS_TEAMS';
ALTER TYPE "NodeType" ADD VALUE 'GOOGLE_DRIVE';
ALTER TYPE "NodeType" ADD VALUE 'CALENDLY';
ALTER TYPE "NodeType" ADD VALUE 'ZENDESK';
