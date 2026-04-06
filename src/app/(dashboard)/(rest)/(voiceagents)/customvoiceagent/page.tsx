"use client";

import { useState, useEffect, Suspense } from "react";
import {
  ArrowLeft,
  Phone,
  Settings,
  Brain,
  Database,
  Plug,
  Upload,
  Check,
  CheckCircle2,
  Edit,
  Bot,
  LayoutGrid,
  Loader2,
  Clock,
  XCircle,
  CheckCircle,
  Trash2
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import UploadFilesForm from "@/components/UploadFilesForm";
import Modal from "@/components/Modal";
import  apiClient  from "@/lib/keycloak/interceptor";
// import { ENTITY_ID, ORG_ID } from "@/components/constants/entity";
import {toast} from "sonner";
import {
  useCreatePhone,
  useCreateAssistant,
  useAttachPhone,
  useUploadKB
} from "@/voiceagent/modules/hooks/use-voiceagents";
// import { trpc } from "@/trpc/server";


type UploadedFile = {
  id: string;
  name: string;
  size: number;
  status: "processing" | "processed" | "failed";
  uploadedAt: Date;
  progress?: number;
  error?: string;
};

type PhoneData = {
  id: string;
  number: string;
  provider?: string;
  name?: string;
  area_code?: string;
};

const SYSTEM_PROMPT_SUGGESTION =
  `You are a friendly AI voice assistant. You handle customer calls with professionalism and warmth. Speak naturally and conversationally — every message should sound like normal spoken English, not like a script or list. Keep responses concise, natural, and suitable for spoken conversation. Always confirm important details before finalizing any action.`;

function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );
}

function CustomVoiceagentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const createPhoneMutation = useCreatePhone();
const createAssistantMutation = useCreateAssistant();
const attachPhoneMutation = useAttachPhone();
const uploadKBMutation = useUploadKB();



  // Try to restore editAgent from sessionStorage (keeps old behavior)
  const [editAgent, setEditAgent] = useState<any | null>(null);

  useEffect(() => {
    // If the previous UI navigated with sessionStorage.editAgent we restore it
    try {
      const stored = typeof window !== "undefined" ? sessionStorage.getItem("editAgent") : null;
      if (stored) {
        setEditAgent(JSON.parse(stored));
      } else {
        // optionally restore from a query param id (if passed)
        const id = searchParams?.get?.("id");
        const edit = searchParams?.get?.("edit");
        if (id && edit) {
          const s = typeof window !== "undefined" ? sessionStorage.getItem(`agent:${id}`) : null;
          if (s) setEditAgent(JSON.parse(s));
        }
      }
    } catch (e) {
      console.warn("Failed to parse editAgent from sessionStorage", e);
    }
  }, [searchParams]);

  const [currentStep, setCurrentStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  // API state
  const [phoneData, setPhoneData] = useState<PhoneData | null>(null);
  const [assistantId, setAssistantId] = useState<string | null>(null);
  const [isAttached, setIsAttached] = useState(false);

  // Form state
  const [phoneName, setPhoneName] = useState<string>(() => {
    if (editAgent && editAgent.phone) {
      const p: string = editAgent.phone;
      const parts = p.split(" ");
      if (parts.length > 1 && parts[0].startsWith("+")) return parts.slice(1).join(" ");
      return p;
    }
    return "";
  });
  const [areaCode, setAreaCode] = useState<string>(() => {
    if (editAgent && editAgent.phone) {
      const p: string = editAgent.phone;
      const parts = p.split(" ");
      if (parts.length > 1 && parts[0].startsWith("+")) return parts[0].replace("+", "");
      return "";
    }
    return "";
  });
  const [agentName, setAgentName] = useState<string>(() => editAgent?.name || "");
  const [agentPurpose, setAgentPurpose] = useState<string>(() => editAgent?.purpose || "Essential guidelines for delivering exceptional customer service experiences");
  const [greeting, setGreeting] = useState<string>(() => editAgent?.greeting || "Hi, I am your voice assistant! How can I help you today?");
  const [systemPrompt, setSystemPrompt] = useState<string>("");

  // Knowledge base
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSystemPromptModal, setShowSystemPromptModal] = useState(false);
  const [systemPromptInput, setSystemPromptInput] = useState("");
  const [showSuggestion, setShowSuggestion] = useState(true);

  // Clover config
  const [cloverMerchantId, setCloverMerchantId] = useState("");
  const [cloverAccessToken, setCloverAccessToken] = useState("");
  const [showCustomConfigModal, setShowCustomConfigModal] = useState(false);
  const [showCloverModal, setShowCloverModal] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [isEnhancing, setIsEnhancing] = useState(false);

  const steps = [
    { id: 1, title: "Phone No", icon: Phone },
    { id: 2, title: "Basic Info", icon: Settings },
    { id: 3, title: "AI Config", icon: Brain },
    { id: 4, title: "Knowledge", icon: Database },
  ];
  const [singlePageMode, setSinglePageMode] = useState(!!editAgent);
  const [sessionKey] = useState(`agent_session_${Date.now()}`);
  const MAX_STORAGE_BYTES = 100 * 1024 * 1024;

  // NEED TO REMOVE THIS CUSTOM DECLARATION LATER
  // const ENTITY_ID = { value: "119d1380-2cf1-4df9-9ad6-3692fd26afe3" }; // Placeholder
  const ENTITY_ID = { value: "d204bed5-a5e2-4e9e-b267-3b10b4989ec0" }; // Placeholder
  const ORG_ID = { value: "0367a35a-5729-403e-9050-fa0e2161298e" }; // Placeholder

  // Session management
  const saveSessionData = (data: any) => {
    try {
      sessionStorage.setItem(sessionKey, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save session data:", error);
    }
  };

  const loadSessionData = () => {
    try {
      const saved = sessionStorage.getItem(sessionKey);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.phoneData) setPhoneData(data.phoneData);
        if (data.assistantId) setAssistantId(data.assistantId);
        if (data.agentName) setAgentName(data.agentName);
        if (data.agentPurpose) setAgentPurpose(data.agentPurpose);
        if (data.greeting) setGreeting(data.greeting);
        if (data.systemPrompt) setSystemPrompt(data.systemPrompt);
        if (data.uploadedFiles) setUploadedFiles(data.uploadedFiles);
        console.log("✅ Session data restored");
      }
    } catch (error) {
      console.error("Failed to load session data:", error);
    }
  };

  useEffect(() => {
    loadSessionData();
    // if editAgent present, populate fields (keeps old behavior)
    if (editAgent) {
      setAgentName(editAgent.name ?? agentName);
      setPhoneName(editAgent.phone ?? phoneName);
      setSystemPrompt(editAgent.systemPrompt ?? systemPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phoneData || assistantId) {
      saveSessionData({
        phoneData,
        assistantId,
        agentName,
        agentPurpose,
        greeting,
        systemPrompt,
        uploadedFiles,
      });
    }
  }, [phoneData, assistantId, agentName, agentPurpose, greeting, systemPrompt, uploadedFiles]);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!phoneName.trim()) newErrors.phoneName = "Phone name is required";
      if (!areaCode.trim()) newErrors.areaCode = "Area code is required";
      else if (!/^\d{3}$/.test(areaCode)) newErrors.areaCode = "Area code must be 3 digits";
    }

    if (step === 2) {
      if (!agentName.trim()) newErrors.agentName = "Agent name is required";
      if (!agentPurpose.trim()) newErrors.agentPurpose = "Purpose is required";
    }

    if (step === 3) {
      if (!greeting.trim()) newErrors.greeting = "Greeting message is required";
      if (!systemPrompt.trim()) newErrors.systemPrompt = "System prompt is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ---------------------------
     API helpers (axios)
  --------------------------- */

  const handleCreatePhone = async () => {
    if (!phoneName || !areaCode) {
      toast.error("Missing Information", {
  description: "Please enter both phone name and area code",
});
      return;
    }

    setIsSaving(true);

    try {
//     const data = await createPhoneMutation.mutateAsync({
//   name: phoneName,
//   area_code: areaCode,
// });

// const data = await apiClient.post(
//       `/voice/tenant/${ENTITY_ID.value}/phone`,
//       {
//         name: phoneName,
//         area_code: areaCode,
//       }
//     );

//       setPhoneData({ ...data, name: phoneName, area_code: areaCode });

//       toast.success("Phone Number Created!", {
//   description: `Your phone number: ${data.number}`,
// });

const response = await apiClient.post(
  `/voice/tenant/${ENTITY_ID.value}/phone`,
  {
    name: phoneName,
    area_code: areaCode,
  }
);

const phone = response.data;

setPhoneData({
  id: phone.id,
  number: phone.number,
  name: phoneName,
  area_code: areaCode,
});

toast.success("Phone Number Created!", {
  description: `Your phone number: ${phone.number}`,
});


      setCurrentStep(2);
    } catch (error: any) {
      console.error("Failed to create phone:", error);

      toast.error("Creation Failed", {
  description: error.response?.data?.message || error.message || "Failed to create phone number",
});
    } finally {
      setIsSaving(false);
    }
  };

  const createAssistant = async () => {
    if (!phoneData) {
      toast.error("Create Phone First", {
  description: "Please create a phone number before configuring the agent",
});
      return false;
    }

    if (!agentName || !systemPrompt) {
      toast.error("Missing Information", {
  description: "Please fill in agent name and system prompt",
});
      return false;
    }

    setIsSaving(true);

    try {
      const config: any = {
        greeting: greeting,
        system_prompt: systemPrompt,
        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          temperature: 0.7,
          messages: [{ role: "system", content: "You are a helpful voice assistant." }],
        },
        voice: {
          provider: "azure",
          voiceId: "en-US-EmmaNeural",
          speed: 1.2,
        },
        max_duration: 900,
      };

      if (cloverMerchantId && cloverAccessToken) {
        config.clover = {
          merchant_id: cloverMerchantId,
          access_token: cloverAccessToken,
        };
      }

      const body = {
        name: agentName,
        entity_id: ENTITY_ID.value,
        config,
      };

    //   const response = await apiClient.post(`/voice/assistant`, body);
    //   const data = response.data;

//     const data = await createAssistantMutation.mutateAsync({
//   name: agentName,
//   config,
//     // entity_id: ENTITY_ID.value,
// });

// setAssistantId(data.assistant_id ?? data.id ?? null);


//       // API returns assistant_id or similar — set assistantId
//       setAssistantId(data.assistant_id ?? data.id ?? null);

//       toast.success("Voice Agent Created!", {
//   description: "Your voice agent has been successfully configured",
// });


const res = await apiClient.post(`/voice/assistant`, {
  name: agentName,
  entity_id: ENTITY_ID.value, // backend expects this
  config,
});

const assistant = res.data;

// backend may return either `id` or `assistant_id`
const assistantId = assistant.assistant_id ?? assistant.id ?? null;

setAssistantId(assistantId);

toast.success("Voice Agent Created!", {
  description: "Your voice agent has been successfully configured",
});


      return true;
    } catch (error: any) {
      console.error("Failed to create assistant:", error);

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to create voice agent";

     toast.error("Creation Failed", {
  description: errorMessage,
});

      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (!phoneData) {
      toast.info("Create Phone Number First", {
  description: "Please create a phone number first before uploading files.",
    });
      return;
    }

    if (!assistantId) {
      toast.info("Complete AI Configuration First", {
  description: "Please complete the AI configuration step first.",
    });
      return;
    }

    setIsUploading(true);

    const newFile: UploadedFile = {
      id: Date.now().toString(),
      name: file.name,
      size: file.size,
      status: "processing",
      uploadedAt: new Date(),
      progress: 0,
    };

    setUploadedFiles((prev) => [...prev, newFile]);


    const uploadToastId = toast.loading("Uploading Knowledge Base", {
  description: "Processing your file...",
});

    try {
      const fd = new FormData();
      fd.append("files", file);
      fd.append("kb_name", file.name.replace(/\.[^/.]+$/, ""));
      fd.append("attach_tool", "true");
      // STEP 1 — get signed URL + headers from TRPC
// const { uploadUrl } = await uploadKBMutation.mutateAsync({
//   assistantId,
//   kb_name: file.name.replace(/\.[^/.]+$/, ""),
// });

// // STEP 2 — upload using signed headers
// const resp = await apiClient.post(uploadUrl, fd, {
//   headers: {
//     "Content-Type": "multipart/form-data",
//   },
//   onUploadProgress: (event) => {
//     if (event.total) {
//       const progress = Math.round((event.loaded / event.total) * 100);
//       setUploadedFiles(prev =>
//         prev.map(f => 
//           f.name === file.name 
//             ? { ...f, progress } 
//             : f
//         )
//       );
//     }
//   },
// });

      // const result = resp.data;

      const resp = await apiClient.post(
  `/voice/assistant/${assistantId}/upload_kb`,
  fd,
  {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (event) => {
      if (event.total) {
        const progress = Math.round((event.loaded / event.total) * 100);
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === newFile.id ? { ...f, progress } : f
          )
        );
      }
    },
  }
);

const result = resp.data;


      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === newFile.id ? { ...f, status: "processed", progress: 100 } : f
        )
      );


      toast.success("Knowledge Base Updated", {
  id: uploadToastId,
  description: `${file.name} (${formatFileSize(file.size)}) successfully processed`,
});
    } catch (err: any) {
      console.error("Upload failed:", err);

      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === newFile.id
            ? { ...f, status: "failed", error: err?.message || "Upload failed" }
            : f
        )
      );

      toast.error("Upload Failed", {
  id: uploadToastId,
  description: err?.message || "Please try again.",
});
    } finally {
      setIsUploading(false);
    }
  };

  const handleConnect = async () => {
    if (!phoneData || !assistantId) {
      
      toast.warning("Not Ready", {
  description: "Please complete all steps first",
});
      return;
    }

    if (uploadedFiles.length === 0) {
      toast.warning("Upload Required", {
  description: "Please upload at least one file before connecting",
});
      return;
    }

    setIsSaving(true);

    try {
  
//    const response = await attachPhoneMutation.mutateAsync({
//   assistant_id: assistantId!,
//   phone_id: phoneData!.id,
// });


//       setIsAttached(true);
//       sessionStorage.removeItem(sessionKey);

//       toast.success("Successfully Deployed!", {
//   description: `${agentName} is now live at ${phoneData.number}`,
// });


const response = await apiClient.post(`/voice/attach_phone`, {
  assistant_id: assistantId,
  phone_id: phoneData.id,
});

setIsAttached(true);
sessionStorage.removeItem(sessionKey);

toast.success("Successfully Deployed!", {
  description: `${agentName} is now live at ${phoneData.number}`,
});

      // push to voice agent builder (or whatever page you want)
      router.push("/voiceagent");
      
    } catch (error: any) {
      console.error("Failed to attach phone:", error);

      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to attach phone to agent";

      toast.error("Connection Failed", {
  description: message,
});
    } finally {
      setIsSaving(false);
    }
  };

  const enhancePrompt = async () => {
    const MAX_RETRIES = 8;
    let attempt = 0;

    const enhanceToastId = toast.loading("Enhancing prompt...", {
  description: "Please wait...",
});

    setIsEnhancing(true);

    const payload = {
      website: "",
      rawPrompt: systemPromptInput,
      orgId: ORG_ID.value,
      entityId: ENTITY_ID.value,
      chatbotName: agentName || "Voice Agent",
      chatbotType: "voice",
      purpose: agentPurpose,
      startMessage: greeting,
    };

    const request = async () => apiClient.post("/scraper/enhance-prompt", payload);

    while (attempt < MAX_RETRIES) {
      try {
        const res = await request();
        const data = res.data;

        setIsEnhancing(false);

        toast.success("Prompt Enhanced!", {
  id: enhanceToastId,
  description: "Your system prompt is ready.",
});

        return data.enhancedPrompt;
      } catch (err: any) {
        attempt++;

        if (attempt === MAX_RETRIES) {
          toast.error("Enhancement Failed", {
  id: enhanceToastId,
  description: err.response?.data?.message || err.response?.data?.error || err.message,
});

          setIsEnhancing(false);
          return null;
        }

        toast.loading(`Retrying... (${attempt}/${MAX_RETRIES})`, {
  id: enhanceToastId,
  description: "Still enhancing...",
});

        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    return null;
  };

  const handleSystemPromptKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab" && showSuggestion && !systemPromptInput) {
      e.preventDefault();
      setSystemPromptInput(SYSTEM_PROMPT_SUGGESTION);
      setShowSuggestion(false);
    }
  };

  const handleSystemPromptSubmit = async () => {
   const enhanceToastId = toast.loading("Enhancing prompt...", {
  description: "Please wait...",
});

    const enhanced = await enhancePrompt();

    if (enhanced) {
      setSystemPrompt(enhanced);
      toast.success("Prompt Enhanced!", {
  id: enhanceToastId,
  description: "Your system prompt is ready.",
});
    } else {
      setSystemPrompt(systemPromptInput);
    }

    setShowSystemPromptModal(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getUsedStorage = () => uploadedFiles.reduce((acc, file) => acc + file.size, 0);
  const usedStorage = getUsedStorage();

  const handleNext = async () => {
    // Step 1: Create Phone
    if (currentStep === 1 && !phoneData) {
      await handleCreatePhone();
      return;
    }

    // Validate current step
    if (!validateStep(currentStep)) {
      toast.error("Validation Error", {
  description: "Please fill in all required fields correctly.",
});
      return;
    }

    // Step 3: Create Assistant automatically before moving to Step 4
    if (currentStep === 3) {
      const success = await createAssistant();
      if (!success) return; // Don't proceed if assistant creation failed
    }

    // Move to next step
    setCurrentStep(Math.min(steps.length, currentStep + 1));
  };

  const stepProgressPercent = steps.length > 1 ? ((currentStep - 1) / (steps.length - 1)) * 100 : 0;

  return (
    <div className="p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-2 md:gap-4 mb-2">
        <Button variant="outline" size="sm" onClick={() => router.push("/voiceagent")}>
          <ArrowLeft className="h-5 w-5" />
          Back
        </Button>

        <div className="flex gap-2 ml-auto">
          
          <Button onClick={handleConnect} size="sm" disabled={!assistantId || isAttached || uploadedFiles.length === 0 || isSaving}>
            <Plug className="mr-1 md:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{isSaving ? "Connecting..." : isAttached ? "Connected" : "Connect"}</span>
          </Button>
        </div>
      </div>

      <div className="mb-2 pl-1 font-bold flex items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground mb-1">Create Voice Agent</h1>
          <p className="text-sm md:text-base text-muted-foreground hidden sm:block">
            Configure your intelligent voice assistant step by step
          </p>
        </div>
      </div>

      {!singlePageMode && (
        <div className="flex flex-col items-center">
          <div className="text-xs text-muted-foreground mt-3 mb-8">{Math.round(stepProgressPercent)}% complete</div>
          <div className="flex justify-center">
            <div className="flex items-center gap-4">
              {steps.map((s, idx) => {
                const stepNum = idx + 1;
                const isComplete = currentStep > stepNum;
                const isActive = currentStep === stepNum;
                const Icon = s.icon;
                return (
                  <div key={s.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex items-center justify-center h-12 w-12 rounded-xl text-sm font-semibold transition-all duration-200 ${
                          isComplete
                            ? "bg-emerald-500 text-white shadow-md"
                            : isActive
                            ? "bg-primary/5 text-gray-400 border border-primary/20 dark:border-gray-600 shadow-sm"
                            : "bg-gray-50 border border-gray-200 text-primary dark:bg-transparent dark:border-gray-800"
                        }`}
                      >
                        {isComplete ? <Check className="h-5 w-5" /> : <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />}
                      </div>
                      <div className="mt-2 text-xs text-center w-20 text-muted-foreground">{s.title}</div>
                    </div>

                    {idx < steps.length - 1 && (
                      <div className="mx-3 -mt-7">
                        <div
                          className={`h-1 w-20 rounded-full transition-all duration-200 ${currentStep > stepNum ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gray-200 dark:bg-muted-foreground/30"}`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        {singlePageMode ? (
          // Single Page Mode - Show all steps at once
          <>
            {/* Step 1: Phone Number */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-primary dark:text-gray-300 mb-2">Phone Number</CardTitle>
                    <CardDescription>Set up a dedicated phone number for your voice agent</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 mb-4">
                {phoneData ? (
                  <div className="p-4 border border-green-500 rounded-xl bg-green-900/20">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="text-green-400" size={24} />
                      <div>
                        <p className="text-green-400 font-semibold">Phone Number Created</p>
                        <p className="text-gray-300">{phoneData.number}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="phone-name-single">Phone Name <span className="text-destructive">*</span></Label>
                        <Input
                          id="phone-name-single"
                          placeholder="e.g., Main Support Line"
                          value={phoneName}
                          onChange={(e) => {
                            setPhoneName(e.target.value);
                            setErrors({ ...errors, phoneName: "" });
                          }}
                          className={errors.phoneName ? "border-destructive" : ""}
                        />
                        {errors.phoneName && <p className="text-xs text-destructive">{errors.phoneName}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="area-code-single">Area Code <span className="text-destructive">*</span></Label>
                        <Input
                          id="area-code-single"
                          placeholder="e.g., 405"
                          value={areaCode}
                          onChange={(e) => {
                            setAreaCode(e.target.value);
                            setErrors({ ...errors, areaCode: "" });
                          }}
                          maxLength={3}
                          className={errors.areaCode ? "border-destructive" : ""}
                        />
                        {errors.areaCode && <p className="text-xs text-destructive">{errors.areaCode}</p>}
                      </div>
                    </div>
                    <Button onClick={handleCreatePhone} disabled={isSaving} className="mt-4">
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Phone Number"
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Basic Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-primary dark:text-gray-300 mb-2 font-bold">Basic Information</CardTitle>
                    <CardDescription>Define the core details of your voice agent</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-name-single">Voice Agent Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="agent-name-single"
                    placeholder="Enter agent name"
                    value={agentName}
                    onChange={(e) => {
                      setAgentName(e.target.value);
                      setErrors({ ...errors, agentName: "" });
                    }}
                    className={errors.agentName ? "border-destructive" : ""}
                  />
                  {errors.agentName && <p className="text-xs text-destructive">{errors.agentName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent-type-single">Agent Type</Label>
                  <Select defaultValue="support">
                    <SelectTrigger id="agent-type-single">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="receptionist">Receptionist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purpose-single">Purpose <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="purpose-single"
                    placeholder="Describe the main purpose of this agent..."
                    className={`min-h-[100px] ${errors.agentPurpose ? "border-destructive" : ""}`}
                    value={agentPurpose}
                    onChange={(e) => {
                      setAgentPurpose(e.target.value);
                      setErrors({ ...errors, agentPurpose: "" });
                    }}
                  />
                  {errors.agentPurpose && <p className="text-xs text-destructive">{errors.agentPurpose}</p>}
                </div>
              </CardContent>
            </Card>

            {/* Step 3: AI Configuration */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Brain className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-primary dark:text-gray-300 mb-2 font-bold">AI Configuration</CardTitle>
                    <CardDescription>Configure the AI behavior and personality</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="system-prompt-single">System Prompt <span className="text-destructive">*</span></Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSystemPromptInput(systemPrompt);
                        setShowSystemPromptModal(true);
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Prompt
                    </Button>
                  </div>
                  {systemPrompt && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground line-clamp-3">{systemPrompt}</p>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="greeting-single">Greeting Message <span className="text-destructive">*</span></Label>
                  <Input
                    id="greeting-single"
                    placeholder="Hi, I am your voice assistant!"
                    value={greeting}
                    onChange={(e) => {
                      setGreeting(e.target.value);
                      setErrors({ ...errors, greeting: "" });
                    }}
                    className={errors.greeting ? "border-destructive" : ""}
                  />
                  {errors.greeting && <p className="text-xs text-destructive">{errors.greeting}</p>}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 w-full">
                    <Label htmlFor="model-single">AI Model</Label>
                    <Select defaultValue="gpt-4">
                      <SelectTrigger id="model-single">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4">GPT-4</SelectItem>
                        <SelectItem value="gpt-3.5">GPT-3.5</SelectItem>
                        <SelectItem value="claude">Claude</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="voice-single">Voice</Label>
                    <Select defaultValue="alloy">
                      <SelectTrigger id="voice-single">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alloy">Alloy</SelectItem>
                        <SelectItem value="echo">Echo</SelectItem>
                        <SelectItem value="nova">Nova</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-10vw">
                    <Button variant="outline" onClick={() => setShowCustomConfigModal(true)}>
                      Custom Config
                    </Button>
                  </div>
                </div>

                {!assistantId && phoneData && (
                  <Button onClick={async () => await createAssistant()} disabled={isSaving} className="mt-4">
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Agent...
                      </>
                    ) : (
                      "Create Voice Agent"
                    )}
                  </Button>
                )}
                {assistantId && (
                  <div className="p-4 border border-green-500 rounded-xl bg-green-900/20">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="text-green-400" size={24} />
                      <div>
                        <p className="text-green-400 font-semibold">Voice Agent Created</p>
                        <p className="text-gray-300 text-sm">Assistant ID: {assistantId}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 4: Knowledge Base */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="mb-2 text-primary dark:text-gray-300 font-bold">Knowledge Base</CardTitle>
                    <CardDescription>Upload files to give your agent knowledge</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {assistantId ? (
                  <>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowUploadModal(true)}>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload
                      </Button>
                    </div>

                    {uploadedFiles.length === 0 ? (
                      <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer" onClick={() => setShowUploadModal(true)}>
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 font-semibold">Upload Files</h3>
                        <p className="mt-2 text-sm text-muted-foreground">PDFs, audio, videos up to 100 MB</p>
                        <Button className="mt-4">Choose Files</Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {uploadedFiles.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              {file.status === "processed" && <CheckCircle className="text-green-400" size={20} />}
                              {file.status === "processing" && <Clock className="text-blue-400 animate-spin" size={20} />}
                              {file.status === "failed" && <XCircle className="text-red-400" size={20} />}
                              <div>
                                <p className="font-medium text-sm">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Storage Used</span>
                        <span className="font-medium">{formatFileSize(usedStorage)} / 100 MB</span>
                      </div>
                      <Progress value={(usedStorage / MAX_STORAGE_BYTES) * 100} className="h-2" />
                    </div>
                  </>
                ) : (
                  <div className="p-8 border border-yellow-500/30 rounded-lg bg-yellow-900/10 text-center">
                    <p className="text-yellow-400 font-semibold mb-2">Complete AI Configuration First</p>
                    <p className="text-sm text-muted-foreground">
                      Please complete AI Configuration before uploading knowledge base files.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-1">
                    <div>
                      <CardTitle className="text-primary dark:text-gray-300 mb-2">Create Phone Number</CardTitle>
                      <CardDescription>Set up a dedicated phone number for your voice agent</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 mb-4">
                  {phoneData ? (
                    <div className="p-4 border border-green-500 rounded-xl bg-green-900/20">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="text-green-400" size={24} />
                        <div>
                          <p className="text-green-400 font-semibold">Phone Number Created</p>
                          <p className="text-gray-300">{phoneData.number}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="phone-name">Phone Name <span className="text-destructive">*</span></Label>
                        <Input
                          id="phone-name"
                          placeholder="e.g., Main Support Line"
                          value={phoneName}
                          onChange={(e) => {
                            setPhoneName(e.target.value);
                            setErrors({ ...errors, phoneName: "" });
                          }}
                          className={errors.phoneName ? "border-destructive" : ""}
                        />
                        {errors.phoneName && <p className="text-xs text-destructive">{errors.phoneName}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="area-code">Area Code <span className="text-destructive">*</span></Label>
                        <Input
                          id="area-code"
                          placeholder="e.g., 405"
                          value={areaCode}
                          onChange={(e) => {
                            setAreaCode(e.target.value);
                            setErrors({ ...errors, areaCode: "" });
                          }}
                          maxLength={3}
                          className={errors.areaCode ? "border-destructive" : ""}
                        />
                        {errors.areaCode && <p className="text-xs text-destructive">{errors.areaCode}</p>}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="text-primary dark:text-gray-300 mb-2 font-bold">Basic Information</CardTitle>
                      <CardDescription>Define the core details of your voice agent</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="agent-name">Voice Agent Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="agent-name"
                      placeholder="Enter agent name"
                      value={agentName}
                      onChange={(e) => {
                        setAgentName(e.target.value);
                        setErrors({ ...errors, agentName: "" });
                      }}
                      className={errors.agentName ? "border-destructive" : ""}
                    />
                    {errors.agentName && <p className="text-xs text-destructive">{errors.agentName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agent-type">Agent Type</Label>
                    <Select defaultValue="support">
                      <SelectTrigger id="agent-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="support">Support</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="receptionist">Receptionist</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purpose">Purpose <span className="text-destructive">*</span></Label>
                    <Textarea
                      id="purpose"
                      placeholder="Describe the main purpose of this agent..."
                      className={`min-h-[100px] ${errors.agentPurpose ? "border-destructive" : ""}`}
                      value={agentPurpose}
                      onChange={(e) => {
                        setAgentPurpose(e.target.value);
                        setErrors({ ...errors, agentPurpose: "" });
                      }}
                    />
                    {errors.agentPurpose && <p className="text-xs text-destructive">{errors.agentPurpose}</p>}
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="text-primary dark:text-gray-300 mb-2 font-bold">AI Configuration</CardTitle>
                      <CardDescription>Configure the AI behavior and personality</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="system-prompt">System Prompt <span className="text-destructive">*</span></Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSystemPromptInput(systemPrompt);
                          setShowSystemPromptModal(true);
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Prompt
                      </Button>
                    </div>
                    {systemPrompt && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground line-clamp-3">{systemPrompt}</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="greeting">Greeting Message <span className="text-destructive">*</span></Label>
                    <Input
                      id="greeting"
                      placeholder="Hi, I am your voice assistant!"
                      value={greeting}
                      onChange={(e) => {
                        setGreeting(e.target.value);
                        setErrors({ ...errors, greeting: "" });
                      }}
                      className={errors.greeting ? "border-destructive" : ""}
                    />
                    {errors.greeting && <p className="text-xs text-destructive">{errors.greeting}</p>}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 w-full">
                      <Label htmlFor="model">AI Model</Label>
                      <Select defaultValue="spinabot-v1">
                        <SelectTrigger id="model">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="spinabot-v1">Spinabot-V1</SelectItem>
                          <SelectItem value="spinabot-v2">Spinabot-V2</SelectItem>
                          
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Select defaultValue="alloy">
                        <SelectTrigger id="language">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="english">English-US/UK</SelectItem>
                          
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-10vw">
                      <Button variant="outline" onClick={() => setShowCustomConfigModal(true)}>
                        Custom Config
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="mb-2 text-primary dark:text-gray-300 font-bold">Knowledge Base</CardTitle>
                      <CardDescription>Upload files to give your agent knowledge</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {assistantId ? (
                    <>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowUploadModal(true)}>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload
                        </Button>
                      </div>

                      {uploadedFiles.length === 0 ? (
                        <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer" onClick={() => setShowUploadModal(true)}>
                          <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                          <h3 className="mt-4 font-semibold">Upload Files</h3>
                          <p className="mt-2 text-sm text-muted-foreground">PDFs, audio, videos up to 100 MB</p>
                          <Button className="mt-4">Choose Files</Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {uploadedFiles.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div className="flex items-center gap-3">
                                {file.status === "processed" && <CheckCircle className="text-green-400" size={20} />}
                                {file.status === "processing" && <Clock className="text-blue-400 animate-spin" size={20} />}
                                {file.status === "failed" && <XCircle className="text-red-400" size={20} />}
                                <div>
                                  <p className="font-medium text-sm">{file.name}</p>
                                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Storage Used</span>
                          <span className="font-medium">{formatFileSize(usedStorage)} / 100 MB</span>
                        </div>
                        <Progress value={(usedStorage / MAX_STORAGE_BYTES) * 100} className="h-2" />
                      </div>
                    </>
                  ) : (
                    <div className="p-8 border border-yellow-500/30 rounded-lg bg-yellow-900/10 text-center">
                      <p className="text-yellow-400 font-semibold mb-2">Complete AI Configuration First</p>
                      <p className="text-sm text-muted-foreground">
                        Please complete Step 3 (AI Configuration) before uploading knowledge base files.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      {!singlePageMode && (
        <div className="flex justify-between items-center">
          {currentStep !== 1 ? (
            <Button variant="outline" onClick={() => setCurrentStep(Math.max(1, currentStep - 1))} disabled={isSaving}>
              Previous
            </Button>
          ) : (
            <div />
          )}
          <div className="ml-auto">
            {currentStep === steps.length ? (
              <Button onClick={handleConnect} disabled={uploadedFiles.length === 0 || !assistantId || isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : isAttached ? (
                  "Connected"
                ) : (
                  "Connect Agent"
                )}
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {currentStep === 3 ? "Creating Agent..." : "Processing..."}
                  </>
                ) : (
                  currentStep === 1 && !phoneData ? "Create Phone" : "Next"
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* System Prompt Modal */}
      {showSystemPromptModal && (
        <div className="fixed inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-3xl w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">System Prompt</h3>
              <button onClick={() => setShowSystemPromptModal(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            {showSuggestion && (
              <div className="mb-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-400">
                  Press <kbd className="px-2 py-1 bg-muted rounded">Tab</kbd> to use suggested prompt
                </p>
              </div>
            )}

            <Textarea value={systemPromptInput} onChange={(e) => setSystemPromptInput(e.target.value)} onKeyDown={handleSystemPromptKeyDown} rows={8} className="w-full mb-4 resize-none" placeholder="Define your agent's behavior and personality..." />

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowSystemPromptModal(false)}>Cancel</Button>
              <Button variant="secondary" onClick={() => {
                setSystemPrompt(systemPromptInput);
                setShowSystemPromptModal(false);
                toast.success("Prompt Enhanced!", {description: "Your system prompt is ready.",});
              }}>Save</Button>
              <Button onClick={handleSystemPromptSubmit} disabled={isEnhancing}>
                {isEnhancing ? (
                  <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Enhancing...</div>
                ) : (
                  "Enhance Prompt"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Files Modal */}
      {showUploadModal && (
        <Modal title="Upload Knowledge Base" subtitle="Add files to your voice agent's knowledge base" onClose={() => setShowUploadModal(false)}>
          <UploadFilesForm
            onSubmit={async (fileData) => {
              if (fileData && fileData.file) {
                await handleFileUpload(fileData.file);
                setShowUploadModal(false);
              }
            }}
            onCancel={() => setShowUploadModal(false)}
            maxFileSize={10}
            allowedFileTypes={[
              "application/pdf",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              "application/vnd.ms-excel",
              "text/plain",
              "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ]}
            isSubmitting={isUploading}
          />
        </Modal>
      )}

      {/* Custom Configuration Modal */}
      {showCustomConfigModal && (
        <div className="fixed inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Custom Configuration</h3>
              <button onClick={() => setShowCustomConfigModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <p className="text-muted-foreground text-sm mb-6">Select a custom integration for your voice agent</p>

            <div className="space-y-3">
              <button onClick={() => { setShowCustomConfigModal(false); setShowCloverModal(true); }} className="w-full p-4 bg-muted border border-border rounded-lg hover:border-primary hover:bg-muted/80 transition-colors text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Clover</h4>
                    <p className="text-muted-foreground text-sm">Connect your Clover POS system</p>
                  </div>
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>

            <Button variant="outline" onClick={() => setShowCustomConfigModal(false)} className="mt-4 w-full">Cancel</Button>
          </div>
        </div>
      )}

      {/* Clover Configuration Modal */}
      {showCloverModal && (
        <div className="fixed inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Clover Configuration</h3>
              <button onClick={() => { setShowCloverModal(false); setCloverMerchantId(""); setCloverAccessToken(""); }} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <p className="text-muted-foreground text-sm mb-6">Enter your Clover credentials to connect your POS system</p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="merchant-id">Merchant ID</Label>
                <Input id="merchant-id" type="text" value={cloverMerchantId} onChange={(e) => setCloverMerchantId(e.target.value)} placeholder="e.g., KA8538Y8ETEM1" />
              </div>

              <div>
                <Label htmlFor="access-token">Access Token</Label>
                <Input id="access-token" type="password" value={cloverAccessToken} onChange={(e) => setCloverAccessToken(e.target.value)} placeholder="Enter your access token" />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={() => { setShowCloverModal(false); setCloverMerchantId(""); setCloverAccessToken(""); }}>Cancel</Button>
              <Button onClick={async () => {
                if (!cloverMerchantId || !cloverAccessToken) {
                  toast.error("Missing Information", {description: "Please enter both Merchant ID and Access Token",});
                  return;
                }
                toast.success("Clover Configuration Saved!", {description: "Your Clover integration has been configured successfully"});
                setShowCloverModal(false);
              }}>Save Configuration</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomVoiceagent() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CustomVoiceagentContent />
    </Suspense>
  );
}
