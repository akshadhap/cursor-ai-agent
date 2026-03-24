"use client";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  EntityItem,
  EntityList,
  EntityPagination,
  EntitySearch,
  ErrorView,
  LoadingView
} from "@/components/entity-components";
import { useRemoveCredential, useSuspenseCredentials, useSuspenseAllCredentials } from "../hooks/use-credentials"
import { useRouter } from "next/navigation";
import { useCredentialsParams } from "../hooks/use-credentials-params";
import { useEntitySearch } from "@/hooks/use-entity-search";
import type { Credential } from "@/generated/prisma";
import { CredentialType } from "@/generated/prisma";
import { useTheme } from "next-themes";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CredentialForm } from "./credential";

export const CredentialsSearch = () => {
  const [params, setParams] = useCredentialsParams();
  const { searchValue, onSearchChange } = useEntitySearch({
    params,
    setParams,
  });
  return (
    <EntitySearch
      value={searchValue}
      onChange={onSearchChange}
      placeholder="Search credentials"
    />
  );
};

// Credential type configuration for the card grid - only implemented nodes
const credentialTypeConfig: { type: CredentialType; label: string; logo: string }[] = [
  // ✅ Implemented
  { type: CredentialType.OPENAI, label: "OpenAI", logo: "/logos/openai.svg" },
  { type: CredentialType.ANTHROPIC, label: "Anthropic", logo: "/logos/anthropic.svg" },
  { type: CredentialType.GEMINI, label: "Gemini", logo: "/logos/gemini.svg" },
  { type: CredentialType.NOTION, label: "Notion", logo: "/logos/notion.svg" },
  { type: CredentialType.HUBSPOT, label: "HubSpot", logo: "/logos/hubspot.svg" },
  { type: CredentialType.SHOPIFY, label: "Shopify", logo: "/logos/shopify.svg" },
  { type: CredentialType.CALENDLY, label: "Calendly", logo: "/logos/calendly.svg" },
  { type: CredentialType.ZENDESK, label: "Zendesk", logo: "/logos/zendesk.svg" },
  { type: CredentialType.ZOOM, label: "Zoom", logo: "/logos/zoom.svg" },
  { type: CredentialType.ZOHO_CRM, label: "Zoho CRM", logo: "/logos/zoho-crm.svg" },
  { type: CredentialType.AIRTABLE, label: "Airtable", logo: "/logos/airtable.svg" },
  { type: CredentialType.INTERCOM, label: "Intercom", logo: "/logos/intercom.svg" },
  { type: CredentialType.GOOGLE_DRIVE, label: "Google Drive", logo: "/logos/google-drive.svg" },
  { type: CredentialType.GOOGLE_SHEETS, label: "Google Sheets", logo: "/logos/google-sheets.svg" },
  { type: CredentialType.GOOGLE_CALENDAR, label: "Google Calendar", logo: "/logos/google-calendar.svg" },
  { type: CredentialType.JIRA, label: "Jira", logo: "/logos/jira.svg" },
  { type: CredentialType.TELEGRAM, label: "Telegram", logo: "/logos/telegram.svg" },
  { type: CredentialType.PINECONE, label: "Pinecone", logo: "/logos/pinecone.svg" },
  { type: CredentialType.AIRBNB, label: "Airbnb", logo: "/logos/airbnb.svg" },
  { type: CredentialType.EXPEDIA, label: "Expedia", logo: "/logos/expedia.svg" },
  { type: CredentialType.RAZORPAY, label: "Razorpay", logo: "/logos/razorpay.png" },
];

// Card component for each credential type
const CredentialTypeCard = ({
  config,
  isLinked,
  linkedCredential,
  onClick,
}: {
  config: { type: CredentialType; label: string; logo: string };
  isLinked: boolean;
  linkedCredential?: Credential;
  onClick: () => void;
}) => {
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;

  // Use the same pattern as production: credentialLogos/credentialLogosDark
  const logoMap = currentTheme === "dark" ? credentialLogosDark : credentialLogos;
  const getLogo = () => logoMap[config.type] || config.logo;

  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center justify-between p-4 rounded-lg border transition-all duration-200
        hover:shadow-md cursor-pointer w-full text-left
        ${isLinked
          ? "border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-950/20"
          : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-neutral-400 dark:hover:border-neutral-600"
        }
      `}
    >
      <div className="flex items-center gap-3">
        <div className="size-8 flex items-center justify-center">
          <Image src={getLogo()} alt={config.label} width={24} height={24} />
        </div>
        <div>
          <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
            {config.label}
          </div>
          <div className={`text-xs mt-0.5 ${isLinked ? "text-green-600 dark:text-green-400 font-medium" : "text-gray-500 dark:text-gray-400"}`}>
            {isLinked ? "Linked" : "Click to Link"}
          </div>
        </div>
      </div>
      <div className="size-10 flex items-center justify-center opacity-50">
        <Image src={getLogo()} alt="" width={32} height={32} className="grayscale opacity-60" />
      </div>
    </button>
  );
};

// New grid-based credentials list
export const CredentialTypeGrid = () => {
  // Use hook that fetches ALL credentials (not paginated)
  const credentials = useSuspenseAllCredentials();
  const router = useRouter();

  // Get linked credentials by type
  const getLinkedCredential = (type: CredentialType) => {
    return credentials.data.items.find((c) => c.type === type);
  };

  const handleCardClick = (type: CredentialType) => {
    const linked = getLinkedCredential(type);
    if (linked) {
      // If already linked, go to edit page
      router.push(`/credentials/${linked.id}`);
    } else {
      // Navigate to new credential page with type pre-selected
      router.push(`/credentials/new?type=${type}`);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {credentialTypeConfig.map((config) => {
        const linkedCredential = getLinkedCredential(config.type);
        return (
          <CredentialTypeCard
            key={config.type}
            config={config}
            isLinked={!!linkedCredential}
            linkedCredential={linkedCredential}
            onClick={() => handleCardClick(config.type)}
          />
        );
      })}
    </div>
  );
};

// Keep old list for backwards compatibility
export const CredentialsList = () => {
  const credentials = useSuspenseCredentials();
  return (
    <EntityList
      items={credentials.data.items}
      getKey={(credential) => credential.id}
      renderItem={(credential) => <CredentialItem data={credential} />}
      emptyView={<CredentialsEmpty />}
    />
  );
};

export const CredentialsHeader = ({ disabled }: { disabled?: boolean }) => {
  return (
    <EntityHeader
      title="Credentials"
      description="Connect your accounts and API keys"
      disabled={disabled}
    />
  );
};

export const CredentialsPagination = () => {
  const credentials = useSuspenseCredentials();
  const [params, setParams] = useCredentialsParams();

  return (
    <EntityPagination
      disabled={credentials.isFetching}
      totalPages={credentials.data.totalPages}
      page={credentials.data.page}
      onPageChange={(page) => setParams({ ...params, page })}
    />
  );
};

export const CredentialsContainer = ({
  children
}: {
  children: React.ReactNode;
}) => {
  return (
    <EntityContainer
      header={<CredentialsHeader />}
    >
      {children}
    </EntityContainer>
  );
};

export const CredentialsLoading = () => {
  return <LoadingView message="Loading credentials..." />;
};

export const CredentialsError = () => {
  return <ErrorView message="Error loading credentials" />;
};

export const CredentialsEmpty = () => {
  const router = useRouter();

  const handleCreate = () => {
    router.push(`/credentials/new`);
  };

  return (
    <EmptyView
      onNew={handleCreate}
      message="You haven't created any credentials yet. Get started by creating your first credential"
    />
  );
};

const credentialLogos: Record<CredentialType, string> = {
  [CredentialType.OPENAI]: "/logos/openai.svg",
  [CredentialType.ANTHROPIC]: "/logos/anthropic.svg",
  [CredentialType.GEMINI]: "/logos/gemini.svg",
  [CredentialType.NOTION]: "/logos/notion.svg",
  [CredentialType.HUBSPOT]: "/logos/hubspot.svg",
  [CredentialType.MCP_CLIENT]: "/logos/mcp.svg",
  [CredentialType.FIRECRAWL]: "/logos/crawl.svg",
  [CredentialType.SALESFORCE]: "/logos/salesforce.png",
  [CredentialType.QUICKBOOKS]: "/logos/quickbooks.png",
  [CredentialType.SHOPIFY]: "/logos/shopify.svg",
  [CredentialType.MS_TEAMS]: "/logos/ms-teams.png",
  [CredentialType.GOOGLE_DRIVE]: "/logos/google-drive.svg",
  [CredentialType.CALENDLY]: "/logos/calendly.svg",
  [CredentialType.ZENDESK]: "/logos/zendesk.svg",
  [CredentialType.ZOOM]: "/logos/zoom.svg",
  [CredentialType.ZOHO_CRM]: "/logos/zoho-crm.svg",
  [CredentialType.AIRTABLE]: "/logos/airtable.svg",
  [CredentialType.INTERCOM]: "/logos/intercom.svg",
  [CredentialType.GOOGLE_SHEETS]: "/logos/google-sheets.svg",
  [CredentialType.GOOGLE_CALENDAR]: "/logos/google-calendar.svg",
  [CredentialType.JIRA]: "/logos/jira.svg",
  [CredentialType.TELEGRAM]: "/logos/telegram.svg",
  [CredentialType.PINECONE]: "/logos/pinecone.svg",
  [CredentialType.AIRBNB]: "/logos/airbnb.svg",
  [CredentialType.EXPEDIA]: "/logos/expedia.svg",
  [CredentialType.RAZORPAY]: "/logos/razorpay.png",
};

const credentialLogosDark: Record<CredentialType, string> = {
  [CredentialType.OPENAI]: "/logos/openai-white.svg",
  [CredentialType.ANTHROPIC]: "/logos/anthropic.svg",
  [CredentialType.GEMINI]: "/logos/gemini.svg",
  [CredentialType.NOTION]: "/logos/notion.svg",
  [CredentialType.HUBSPOT]: "/logos/hubspot.svg",
  [CredentialType.MCP_CLIENT]: "/logos/mcp.svg",
  [CredentialType.FIRECRAWL]: "/logos/crawl.svg",
  [CredentialType.SALESFORCE]: "/logos/salesforce.png",
  [CredentialType.QUICKBOOKS]: "/logos/quickbooks.png",
  [CredentialType.SHOPIFY]: "/logos/shopify.svg",
  [CredentialType.MS_TEAMS]: "/logos/ms-teams.png",
  [CredentialType.GOOGLE_DRIVE]: "/logos/google-drive.svg",
  [CredentialType.CALENDLY]: "/logos/calendly.svg",
  [CredentialType.ZENDESK]: "/logos/zendesk-white.svg",
  [CredentialType.ZOOM]: "/logos/zoom.svg",
  [CredentialType.ZOHO_CRM]: "/logos/zoho-crm.svg",
  [CredentialType.AIRTABLE]: "/logos/airtable.svg",
  [CredentialType.INTERCOM]: "/logos/intercom-white.svg",
  [CredentialType.GOOGLE_SHEETS]: "/logos/google-sheets.svg",
  [CredentialType.GOOGLE_CALENDAR]: "/logos/google-calendar.svg",
  [CredentialType.JIRA]: "/logos/jira.svg",
  [CredentialType.TELEGRAM]: "/logos/telegram.svg",
  [CredentialType.PINECONE]: "/logos/pinecone-white.svg",
  [CredentialType.AIRBNB]: "/logos/airbnb.svg",
  [CredentialType.EXPEDIA]: "/logos/expedia-white.svg",
  [CredentialType.RAZORPAY]: "/logos/razorpay.png",
};

export const CredentialItem = ({
  data,
}: {
  data: Credential
}) => {
  const removeCredential = useRemoveCredential();
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;

  const handleRemove = () => {
    removeCredential.mutate({ id: data.id });
  };

  // Use production pattern: credentialLogos/credentialLogosDark
  const logoMap = currentTheme === "dark" ? credentialLogosDark : credentialLogos;
  const logo = logoMap[data.type] || "/logos/openai.svg";

  return (
    <EntityItem
      href={`/credentials/${data.id}`}
      title={data.name}
      subtitle={
        <>
          Updated {formatDistanceToNow(data.updatedAt, { addSuffix: true })}{" "}
          &bull; Created{" "}
          {formatDistanceToNow(data.createdAt, { addSuffix: true })}
        </>
      }
      image={
        <div className="size-8 flex items-center justify-center">
          <Image src={logo} alt={data.type} width={20} height={20} />
        </div>
      }
      onRemove={handleRemove}
      isRemoving={removeCredential.isPending}
    />
  )
};
