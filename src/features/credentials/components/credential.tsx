"use client";

import { CredentialType } from "@/generated/prisma";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  useCreateCredential,
  useUpdateCredential,
  useSuspenseCredential,
  useRemoveCredential,
} from "../hooks/use-credentials";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { useState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.nativeEnum(CredentialType),
  value: z.string().optional(),
  // Shopify specific fields
  storeUrl: z.string().optional(),
  shopifyAccessToken: z.string().optional(),
  // Zendesk specific fields
  zendeskSubdomain: z.string().optional(),
  zendeskEmail: z.string().optional(),
  zendeskApiToken: z.string().optional(),
  // HubSpot specific fields
  hubspotAccessToken: z.string().optional(),
  // Calendly specific fields
  calendlyAccessToken: z.string().optional(),
  // Zoom specific fields
  zoomAccountId: z.string().optional(),
  zoomClientId: z.string().optional(),
  zoomClientSecret: z.string().optional(),
  // Zoho CRM specific fields
  zohoRegion: z.string().optional(),
  zohoClientId: z.string().optional(),
  zohoClientSecret: z.string().optional(),
  zohoRefreshToken: z.string().optional(),
  // Jira specific fields
  jiraDomain: z.string().optional(),
  jiraEmail: z.string().optional(),
  jiraApiToken: z.string().optional(),
}).refine((data) => {
  // For Shopify, require storeUrl and shopifyAccessToken
  if (data.type === CredentialType.SHOPIFY) {
    return data.storeUrl && data.shopifyAccessToken;
  }
  // For Zendesk, require subdomain, email, and apiToken
  if (data.type === CredentialType.ZENDESK) {
    return data.zendeskSubdomain && data.zendeskEmail && data.zendeskApiToken;
  }
  // For HubSpot, require hubspotAccessToken
  if (data.type === CredentialType.HUBSPOT) {
    return data.hubspotAccessToken;
  }
  // For Calendly, require calendlyAccessToken
  if (data.type === CredentialType.CALENDLY) {
    return data.calendlyAccessToken;
  }
  // For Zoom, require all three fields
  if (data.type === CredentialType.ZOOM) {
    return data.zoomAccountId && data.zoomClientId && data.zoomClientSecret;
  }
  // For Zoho CRM, OAuth handles it - no manual validation needed
  if (data.type === CredentialType.ZOHO_CRM) {
    return true;
  }
  // For Google Drive, OAuth handles it - no manual validation needed
  if (data.type === CredentialType.GOOGLE_DRIVE) {
    return true;
  }
  // For Google Sheets, OAuth handles it - no manual validation needed
  if (data.type === CredentialType.GOOGLE_SHEETS) {
    return true;
  }
  // For Google Calendar, OAuth handles it - no manual validation needed
  if (data.type === CredentialType.GOOGLE_CALENDAR) {
    return true;
  }
  // For Jira, require all three fields
  if (data.type === CredentialType.JIRA) {
    return data.jiraDomain && data.jiraEmail && data.jiraApiToken;
  }
  // For all other types, require value
  return data.value && data.value.length > 0;
}, {
  message: "Credential value is required",
  path: ["value"],
});

type FormValues = z.infer<typeof formSchema>;

const OpenAiLogo: React.FC<{ size?: number }> = ({ size = 16 }) => {
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;
  const src = currentTheme === "dark" ? "/logos/openai-white.svg" : "/logos/openai.svg";
  return <Image src={src} alt="OpenAI" width={size} height={size} />;
};

const ZendeskLogo: React.FC<{ size?: number }> = ({ size = 16 }) => {
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;
  const src = currentTheme === "dark" ? "/logos/zendesk-white.svg" : "/logos/zendesk.svg";
  return <Image src={src} alt="Zendesk" width={size} height={size} />;
};

const AirtableLogo: React.FC<{ size?: number }> = ({ size = 16 }) => {
  return <Image src="/logos/airtable.svg" alt="Airtable" width={size} height={size} unoptimized />;
};

const McpClientLogo: React.FC<{ size?: number }> = ({ size = 16 }) => {
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;
  const src = currentTheme === "dark" ? "/logos/mcp-client.png" : "/logos/mcp-client-black.png";
  return <Image src={src} alt="MCP Client" width={size} height={size} unoptimized />;
};

const IntercomLogo: React.FC<{ size?: number }> = ({ size = 16 }) => {
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;
  const src = currentTheme === "dark" ? "/logos/intercom-white.svg" : "/logos/intercom.svg";
  return <Image src={src} alt="Intercom" width={size} height={size} unoptimized />;
};

const PineconeLogo: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, systemTheme } = useTheme();

  const currentTheme = theme === "system" ? systemTheme : theme;
  const src =
    currentTheme === "dark"
      ? "/logos/pinecone-white.svg"
      : "/logos/pinecone.svg";

  return (
    <img
      src={src}
      alt="Pinecone"
      className={`size-4 object-contain rounded-sm ${className ?? ""}`}
    />
  );
};

const ExpediaLogo: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, systemTheme } = useTheme();

  const currentTheme = theme === "system" ? systemTheme : theme;
  const src =
    currentTheme === "dark"
      ? "/logos/expedia-white.svg"
      : "/logos/expedia.svg";

  return (
    <img
      src={src}
      alt="Expedia"
      className={`size-4 object-contain rounded-sm ${className ?? ""}`}
    />
  );
};

const credentialTypeOptions = [
  {
    value: CredentialType.OPENAI,
    label: "OpenAI",
    logo: "/logos/openai.svg",
    LogoComponent: OpenAiLogo,
  },
  {
    value: CredentialType.ANTHROPIC,
    label: "Anthropic",
    logo: "/logos/anthropic.svg",
  },
  {
    value: CredentialType.GEMINI,
    label: "Gemini",
    logo: "/logos/gemini.svg",
  },
  {
    value: CredentialType.NOTION,
    label: "Notion",
    logo: "/logos/notion.svg",
  },
  {
    value: CredentialType.HUBSPOT,
    label: "HubSpot",
    logo: "/logos/hubspot.svg",
  },
  {
    value: CredentialType.CALENDLY,
    label: "Calendly",
    logo: "/logos/calendly.svg",
  },
  {
    value: CredentialType.SHOPIFY,
    label: "Shopify",
    logo: "/logos/shopify.svg",
  },
  {
    value: CredentialType.ZENDESK,
    label: "Zendesk",
    logo: "/logos/zendesk.svg",
    LogoComponent: ZendeskLogo,
  },
  {
    value: CredentialType.ZOOM,
    label: "Zoom",
    logo: "/logos/zoom.svg",
  },
  {
    value: CredentialType.ZOHO_CRM,
    label: "Zoho CRM",
    logo: "/logos/zoho-crm.svg",
  },
  {
    value: CredentialType.AIRTABLE,
    label: "Airtable",
    logo: "/logos/airtable.svg",
    LogoComponent: AirtableLogo,
  },
  {
    value: CredentialType.INTERCOM,
    label: "Intercom",
    logo: "/logos/intercom.svg",
    LogoComponent: IntercomLogo,
  },
  {
    value: CredentialType.GOOGLE_DRIVE,
    label: "Google Drive",
    logo: "/logos/google-drive.svg",
  },
  {
    value: CredentialType.GOOGLE_SHEETS,
    label: "Google Sheets",
    logo: "/logos/google-sheets.svg",
  },
  {
    value: CredentialType.GOOGLE_CALENDAR,
    label: "Google Calendar",
    logo: "/logos/google-calendar.svg",
  },
  {
    value: CredentialType.JIRA,
    label: "Jira",
    logo: "/logos/jira.svg",
  },
  {
    value: CredentialType.TELEGRAM,
    label: "Telegram",
    logo: "/logos/telegram.svg",
  },
  {
    value: CredentialType.PINECONE,
    label: "Pinecone",
    logo: "/logos/pinecone.svg",
    LogoComponent: PineconeLogo,
  },
  {
    value: CredentialType.AIRBNB,
    label: "Airbnb",
    logo: "/logos/airbnb.svg",
  },
  {
    value: CredentialType.EXPEDIA,
    label: "Expedia",
    logo: "/logos/expedia.svg",
    LogoComponent: ExpediaLogo,
  },
  {
    value: CredentialType.RAZORPAY,
    label: "Razorpay",
    logo: "/logos/razorpay.png",
  },
];



interface CredentialFormProps {
  preSelectedType?: CredentialType; // Type pre-selected from grid
  initialData?: {
    id?: string;
    name: string;
    type: CredentialType;
    value: string;
  };
};

export const CredentialForm = ({
  preSelectedType,
  initialData,
}: CredentialFormProps) => {
  const router = useRouter();
  const createCredential = useCreateCredential();
  const updateCredential = useUpdateCredential();
  const removeCredential = useRemoveCredential();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isEdit = !!initialData?.id;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: "",
      type: preSelectedType || CredentialType.OPENAI, // Use pre-selected type if provided
      value: "",
      storeUrl: "",
      shopifyAccessToken: "",
      zendeskSubdomain: "",
      zendeskEmail: "",
      zendeskApiToken: "",
      hubspotAccessToken: "",
      calendlyAccessToken: "",
      zoomAccountId: "",
      zoomClientId: "",
      zoomClientSecret: "",
      zohoRegion: "",
      zohoClientId: "",
      zohoClientSecret: "",
      zohoRefreshToken: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    let credentialValue = values.value || "";

    // For Shopify, combine storeUrl and shopifyAccessToken into JSON
    if (values.type === CredentialType.SHOPIFY && values.storeUrl && values.shopifyAccessToken) {
      credentialValue = JSON.stringify({
        storeUrl: values.storeUrl,
        accessToken: values.shopifyAccessToken,
      });
    }

    // For Zendesk, combine subdomain, email, and apiToken into JSON
    if (values.type === CredentialType.ZENDESK && values.zendeskSubdomain && values.zendeskEmail && values.zendeskApiToken) {
      credentialValue = JSON.stringify({
        subdomain: values.zendeskSubdomain,
        email: values.zendeskEmail,
        apiToken: values.zendeskApiToken,
      });
    }

    // For HubSpot, use hubspotAccessToken
    if (values.type === CredentialType.HUBSPOT && values.hubspotAccessToken) {
      credentialValue = values.hubspotAccessToken;
    }

    // For Calendly, use calendlyAccessToken
    if (values.type === CredentialType.CALENDLY && values.calendlyAccessToken) {
      credentialValue = values.calendlyAccessToken;
    }

    // For Zoom, combine accountId, clientId, and clientSecret into JSON
    if (values.type === CredentialType.ZOOM && values.zoomAccountId && values.zoomClientId && values.zoomClientSecret) {
      credentialValue = JSON.stringify({
        accountId: values.zoomAccountId,
        clientId: values.zoomClientId,
        clientSecret: values.zoomClientSecret,
      });
    }

    // For Zoho CRM, combine region, clientId, clientSecret, and refreshToken into JSON
    if (values.type === CredentialType.ZOHO_CRM && values.zohoClientId && values.zohoClientSecret && values.zohoRefreshToken) {
      credentialValue = JSON.stringify({
        region: values.zohoRegion || "com",
        clientId: values.zohoClientId,
        clientSecret: values.zohoClientSecret,
        refreshToken: values.zohoRefreshToken,
      });
    }

    // For Jira, combine domain, email, and apiToken into JSON
    if (values.type === CredentialType.JIRA && values.jiraDomain && values.jiraEmail && values.jiraApiToken) {
      credentialValue = JSON.stringify({
        domain: values.jiraDomain,
        email: values.jiraEmail,
        apiToken: values.jiraApiToken,
      });
    }

    if (isEdit && initialData?.id) {
      await updateCredential.mutateAsync({
        id: initialData.id,
        name: values.name,
        type: values.type as CredentialType,
        value: credentialValue,
      })
    } else {
      await createCredential.mutateAsync({
        name: values.name,
        type: values.type as CredentialType,
        value: credentialValue,
      }, {
        onSuccess: (data) => {
          router.push(`/credentials/${data.id}`);
        }
      })
    }
  }

  return (
    <>
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>
            {isEdit ? "Edit Credential" : "Create Credential"}
          </CardTitle>
          <CardDescription>
            {isEdit
              ? "Update your API key or credential details"
              : "Add a new API key or credential to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My API key" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => {
                  const selectedOption = credentialTypeOptions.find(opt => opt.value === field.value);
                  // Show read-only when editing OR when type is pre-selected from grid
                  const isTypeReadOnly = isEdit || !!preSelectedType;

                  return (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      {isTypeReadOnly ? (
                        // Read-only display when editing
                        <div className="flex items-center gap-3 px-3 py-2 rounded-md border border-input bg-muted">
                          {selectedOption && (
                            <>
                              {"LogoComponent" in selectedOption && selectedOption.LogoComponent ? (
                                <selectedOption.LogoComponent size={20} />
                              ) : (
                                <Image
                                  src={selectedOption.logo}
                                  alt={selectedOption.label}
                                  width={20}
                                  height={20}
                                />
                              )}
                              <span className="font-medium">{selectedOption.label}</span>
                            </>
                          )}
                        </div>
                      ) : (
                        // Editable dropdown when creating
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {credentialTypeOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                <div className="flex items-center gap-2">
                                  {"LogoComponent" in option && option.LogoComponent ? (
                                    <option.LogoComponent size={16} />
                                  ) : (
                                    <Image
                                      src={option.logo}
                                      alt={option.label}
                                      width={16}
                                      height={16}
                                    />
                                  )}
                                  {option.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {form.watch("type") === CredentialType.SHOPIFY ? (
                <>
                  <FormField
                    control={form.control}
                    name="storeUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Store URL *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://your-store.myshopify.com"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Your Shopify store URL
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="shopifyAccessToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Access Token *</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="shpat_xxxxxxxxxxxxx"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Admin API access token from Shopify
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : form.watch("type") === CredentialType.ZENDESK ? (
                <>
                  <FormField
                    control={form.control}
                    name="zendeskSubdomain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subdomain *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="yourcompany"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Your Zendesk subdomain (e.g., if your URL is yourcompany.zendesk.com, enter "yourcompany")
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zendeskEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Your Zendesk admin email address
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zendeskApiToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Token *</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          From Zendesk Admin → Apps → API → Add Token
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : form.watch("type") === CredentialType.HUBSPOT ? (
                <FormField
                  control={form.control}
                  name="hubspotAccessToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Token *</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Private App Access Token from HubSpot Settings → Integrations → Private Apps
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : form.watch("type") === CredentialType.CALENDLY ? (
                <FormField
                  control={form.control}
                  name="calendlyAccessToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Token *</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="eyJraWQiOiIxY2UxZTEzNjE..."
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Personal Access Token from Calendly Account Settings → Integrations → API & Webhooks
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : form.watch("type") === CredentialType.ZOOM ? (
                <>
                  <FormField
                    control={form.control}
                    name="zoomAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account ID *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="abc123XYZ"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Your Zoom Account ID from App Marketplace
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zoomClientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client ID *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="abcdefghijk123456"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          OAuth Client ID from your Zoom App
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zoomClientSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Secret *</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="xxxxxxxxxxxxxxxx"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          OAuth Client Secret from your Zoom App
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : form.watch("type") === CredentialType.ZOHO_CRM ? (
                /* ZOHO CRM: OAuth Flow with Region + Client ID + Client Secret + Connect Button */
                <>
                  {isEdit ? (
                    /* Edit mode: Show connected status with re-connect option */
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 border border-green-500/20">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-sm text-green-500 font-medium">Connected to Zoho CRM</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This credential was connected via OAuth. To update the connection,
                        enter your Client ID and Secret below and click "Re-connect my account".
                      </p>
                      <FormField
                        control={form.control}
                        name="zohoRegion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Access Token URL</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || "in"}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="com">US - https://accounts.zoho.com/oauth/v2/token</SelectItem>
                                <SelectItem value="eu">EU - https://accounts.zoho.eu/oauth/v2/token</SelectItem>
                                <SelectItem value="in">IN - https://accounts.zoho.in/oauth/v2/token</SelectItem>
                                <SelectItem value="com.au">AU - https://accounts.zoho.com.au/oauth/v2/token</SelectItem>
                                <SelectItem value="com.cn">CN - https://accounts.zoho.com.cn/oauth/v2/token</SelectItem>
                                <SelectItem value="jp">JP - https://accounts.zoho.jp/oauth/v2/token</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="zohoClientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client ID</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="1000.xxxxxxxxxx"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="zohoClientSecret"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client Secret</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="xxxxxxxxxx"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-red-500/50 text-red-500 hover:bg-red-500/10"
                        onClick={() => {
                          const name = form.getValues("name");
                          const region = form.getValues("zohoRegion") || "in";
                          const clientId = form.getValues("zohoClientId");
                          const clientSecret = form.getValues("zohoClientSecret");

                          if (!clientId || !clientSecret) {
                            toast.error("Please fill in Client ID and Client Secret to re-connect");
                            return;
                          }

                          const params = new URLSearchParams({
                            name,
                            region,
                            clientId,
                            clientSecret,
                          });
                          window.location.href = `/api/oauth/zoho/authorize?${params.toString()}`;
                        }}
                      >
                        Re-connect my account
                      </Button>
                    </div>
                  ) : (
                    /* Create mode: Show normal OAuth flow */
                    <>
                      {/* Redirect URL helper */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Redirect URL (copy to Zoho API Console)</label>
                        <div className="flex gap-2">
                          <Input
                            readOnly
                            value="https://dashboard.spinabot.com/api/oauth/zoho/callback"
                            className="font-mono text-xs bg-muted"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText("https://dashboard.spinabot.com/api/oauth/zoho/callback");
                              toast.success("Redirect URL copied to clipboard!");
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Add this URL to your Zoho API Console → Client Details → Authorized Redirect URIs
                        </p>
                      </div>

                      <FormField
                        control={form.control}
                        name="zohoRegion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Access Token URL *</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || "com"}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="com">US - https://accounts.zoho.com/oauth/v2/token</SelectItem>
                                <SelectItem value="eu">EU - https://accounts.zoho.eu/oauth/v2/token</SelectItem>
                                <SelectItem value="in">IN - https://accounts.zoho.in/oauth/v2/token</SelectItem>
                                <SelectItem value="com.au">AU - https://accounts.zoho.com.au/oauth/v2/token</SelectItem>
                                <SelectItem value="com.cn">CN - https://accounts.zoho.com.cn/oauth/v2/token</SelectItem>
                                <SelectItem value="jp">JP - https://accounts.zoho.jp/oauth/v2/token</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Select your Zoho data center region
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="zohoClientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client ID *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="1000.xxxxxxxxxx"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              From Zoho API Console → Self Client / Server-based app
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="zohoClientSecret"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client Secret *</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="xxxxxxxxxx"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              From Zoho API Console → Your app → Client Secret
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Connect my account button - initiates OAuth flow */}
                      <div className="pt-2">
                        <Button
                          type="button"
                          variant="default"
                          className="w-full bg-red-600 hover:bg-red-700"
                          onClick={() => {
                            const name = form.getValues("name");
                            const region = form.getValues("zohoRegion") || "com";
                            const clientId = form.getValues("zohoClientId");
                            const clientSecret = form.getValues("zohoClientSecret");

                            if (!name || !clientId || !clientSecret) {
                              toast.error("Please fill in Name, Client ID, and Client Secret first");
                              return;
                            }

                            // Redirect to OAuth authorize endpoint
                            const params = new URLSearchParams({
                              name,
                              region,
                              clientId,
                              clientSecret,
                            });
                            window.location.href = `/api/oauth/zoho/authorize?${params.toString()}`;
                          }}
                        >
                          Connect my account
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          You'll be redirected to Zoho to authorize access
                        </p>
                      </div>
                    </>
                  )}
                </>
              ) : form.watch("type") === CredentialType.GOOGLE_DRIVE ? (
                /* GOOGLE DRIVE: OAuth Flow with Connect Button */
                <>
                  {isEdit ? (
                    /* Edit mode: Show connected status */
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 border border-green-500/20">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-sm text-green-500 font-medium">Connected to Google Drive</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This credential was connected via OAuth. The connection is active and working.
                      </p>
                    </div>
                  ) : (
                    /* Create mode: Show simple OAuth connect flow */
                    <>
                      <div className="p-4 border rounded-lg space-y-4">
                        <div className="flex items-center gap-3">
                          <Image
                            src="/logos/google-drive.svg"
                            alt="Google Drive"
                            width={40}
                            height={40}
                            className="rounded"
                          />
                          <div>
                            <h3 className="font-semibold">Connect Google Drive</h3>
                            <p className="text-sm text-muted-foreground">
                              Click the button below to securely connect your Google Drive account. You'll be redirected to Google to authorize access.
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          className="w-full"
                          onClick={() => {
                            const name = form.getValues("name") || "Google Drive";
                            const params = new URLSearchParams({ name });
                            window.location.href = `/api/oauth/google-drive/authorize?${params.toString()}`;
                          }}
                        >
                          <Image
                            src="/logos/google-drive.svg"
                            alt="Google Drive"
                            width={20}
                            height={20}
                            className="mr-2"
                          />
                          Connect Google Drive
                        </Button>

                        <div className="text-sm space-y-1">
                          <p className="font-medium">What happens next:</p>
                          <ul className="list-disc list-inside text-muted-foreground text-xs space-y-1">
                            <li>You'll be redirected to Google's secure login</li>
                            <li>Authorize this app to access your Google Drive</li>
                            <li>You'll be redirected back here automatically</li>
                            <li>Your credentials will be securely encrypted and stored</li>
                          </ul>
                        </div>

                        <p className="text-xs text-muted-foreground text-center">
                          By connecting, you agree to Google's{" "}
                          <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline">
                            Terms of Service
                          </a>{" "}
                          and{" "}
                          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">
                            Privacy Policy
                          </a>
                        </p>
                      </div>
                    </>
                  )}
                </>
              ) : form.watch("type") === CredentialType.GOOGLE_SHEETS ? (
                /* GOOGLE SHEETS: OAuth Flow with Connect Button */
                <>
                  {isEdit ? (
                    /* Edit mode: Show connected status */
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 border border-green-500/20">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-sm text-green-500 font-medium">Connected to Google Sheets</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This credential was connected via OAuth. The connection is active and working.
                      </p>
                    </div>
                  ) : (
                    /* Create mode: Show simple OAuth connect flow */
                    <>
                      <div className="p-4 border rounded-lg space-y-4">
                        <div className="flex items-center gap-3">
                          <Image
                            src="/logos/google-sheets.svg"
                            alt="Google Sheets"
                            width={40}
                            height={40}
                            className="rounded"
                          />
                          <div>
                            <h3 className="font-semibold">Connect Google Sheets</h3>
                            <p className="text-sm text-muted-foreground">
                              Click the button below to securely connect your Google Sheets account. You'll be redirected to Google to authorize access.
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          className="w-full"
                          onClick={() => {
                            const name = form.getValues("name") || "Google Sheets";
                            const params = new URLSearchParams({ name });
                            window.location.href = `/api/oauth/google-sheets/authorize?${params.toString()}`;
                          }}
                        >
                          <Image
                            src="/logos/google-sheets.svg"
                            alt="Google Sheets"
                            width={20}
                            height={20}
                            className="mr-2"
                          />
                          Connect Google Sheets
                        </Button>

                        <div className="text-sm space-y-1">
                          <p className="font-medium">What happens next:</p>
                          <ul className="list-disc list-inside text-muted-foreground text-xs space-y-1">
                            <li>You'll be redirected to Google's secure login</li>
                            <li>Authorize this app to access your Google Sheets</li>
                            <li>You'll be redirected back here automatically</li>
                            <li>Your credentials will be securely encrypted and stored</li>
                          </ul>
                        </div>

                        <p className="text-xs text-muted-foreground text-center">
                          By connecting, you agree to Google's{" "}
                          <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline">
                            Terms of Service
                          </a>{" "}
                          and{" "}
                          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">
                            Privacy Policy
                          </a>
                        </p>
                      </div>
                    </>
                  )}
                </>
              ) : form.watch("type") === CredentialType.GOOGLE_CALENDAR ? (
                /* GOOGLE CALENDAR: OAuth Flow with Connect Button */
                <>
                  {isEdit ? (
                    /* Edit mode: Show connected status */
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 border border-green-500/20">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-sm text-green-500 font-medium">Connected to Google Calendar</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This credential was connected via OAuth. The connection is active and working.
                      </p>
                    </div>
                  ) : (
                    /* Create mode: Show simple OAuth connect flow */
                    <>
                      <div className="p-4 border rounded-lg space-y-4">
                        <div className="flex items-center gap-3">
                          <Image
                            src="/logos/google-calendar.svg"
                            alt="Google Calendar"
                            width={40}
                            height={40}
                            className="rounded"
                          />
                          <div>
                            <h3 className="font-semibold">Connect Google Calendar</h3>
                            <p className="text-sm text-muted-foreground">
                              Click the button below to securely connect your Google Calendar account. You'll be redirected to Google to authorize access.
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          className="w-full"
                          onClick={() => {
                            const name = form.getValues("name") || "Google Calendar";
                            const params = new URLSearchParams({ name });
                            window.location.href = `/api/oauth/google-calendar/authorize?${params.toString()}`;
                          }}
                        >
                          <Image
                            src="/logos/google-calendar.svg"
                            alt="Google Calendar"
                            width={20}
                            height={20}
                            className="mr-2"
                          />
                          Connect Google Calendar
                        </Button>

                        <div className="text-sm space-y-1">
                          <p className="font-medium">What happens next:</p>
                          <ul className="list-disc list-inside text-muted-foreground text-xs space-y-1">
                            <li>You'll be redirected to Google's secure login</li>
                            <li>Authorize this app to access your Google Calendar</li>
                            <li>You'll be redirected back here automatically</li>
                            <li>Your credentials will be securely encrypted and stored</li>
                          </ul>
                        </div>

                        <p className="text-xs text-muted-foreground text-center">
                          By connecting, you agree to Google's{" "}
                          <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline">
                            Terms of Service
                          </a>{" "}
                          and{" "}
                          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">
                            Privacy Policy
                          </a>
                        </p>
                      </div>
                    </>
                  )}
                </>
              ) : form.watch("type") === CredentialType.JIRA ? (
                /* JIRA: Basic Auth with Domain, Email, and API Token */
                <>
                  <FormField
                    control={form.control}
                    name="jiraDomain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Atlassian Domain *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="your-company.atlassian.net"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Your Atlassian domain (e.g., your-company.atlassian.net)
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="jiraEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Your Atlassian account email address
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="jiraApiToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Token *</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="xxxxxxxxxxxxxxxx"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Generate at{" "}
                          <a
                            href="https://id.atlassian.com/manage-profile/security/api-tokens"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-primary"
                          >
                            id.atlassian.com/manage-profile/security/api-tokens
                          </a>
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : (
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="sk-..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Hide submit button for OAuth types in create mode - OAuth handles it */}
              {!((form.watch("type") === CredentialType.ZOHO_CRM || form.watch("type") === CredentialType.GOOGLE_DRIVE || form.watch("type") === CredentialType.GOOGLE_SHEETS || form.watch("type") === CredentialType.GOOGLE_CALENDAR) && !isEdit) && (
                <div className="flex justify-between">
                  <div className="flex gap-4">
                    <Button
                      type="submit"
                      disabled={
                        createCredential.isPending ||
                        updateCredential.isPending
                      }
                    >
                      {isEdit ? "Update" : "Create"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      asChild
                    >
                      <Link href="/credentials" prefetch>
                        Cancel
                      </Link>
                    </Button>
                  </div>
                  {isEdit && initialData?.id && (
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={removeCredential.isPending}
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              )}

              {/* Show cancel button for OAuth types in create mode */}
              {(form.watch("type") === CredentialType.ZOHO_CRM || form.watch("type") === CredentialType.GOOGLE_DRIVE || form.watch("type") === CredentialType.GOOGLE_SHEETS || form.watch("type") === CredentialType.GOOGLE_CALENDAR) && !isEdit && (
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    asChild
                  >
                    <Link href="/credentials" prefetch>
                      Back to Credentials
                    </Link>
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Credential?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this credential? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (initialData?.id) {
                  removeCredential.mutate({ id: initialData.id }, {
                    onSuccess: () => {
                      router.push("/credentials");
                    }
                  });
                }
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeCredential.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
};

export const CredentialView = ({
  credentialId,
}: { credentialId: string }) => {
  const { data: credential } = useSuspenseCredential(credentialId);

  return <CredentialForm initialData={credential} />
};