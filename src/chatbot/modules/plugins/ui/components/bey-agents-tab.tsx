"use client";

import {
  BotIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";

import { useMemo, useState } from "react";

import Image from "next/image";
import type { StaticImageData } from "next/image";

import AwaisImage from "../../../../../../Beyond Presence_files/Awais.jpg";
import EgeImage from "../../../../../../Beyond Presence_files/Ege.jpg";
import FjollaImage from "../../../../../../Beyond Presence_files/Fjolla.jpg";
import JeromeOfficeImage from "../../../../../../Beyond Presence_files/Jerome- Office.jpg";
import JeromeBusinessImage from "../../../../../../Beyond Presence_files/Jerome-Business.jpg";
import JeromeMedicalImage from "../../../../../../Beyond Presence_files/Jerome-Medical.jpg";
import LauraImage from "../../../../../../Beyond Presence_files/Laura.jpg";
import MichaelImage from "../../../../../../Beyond Presence_files/Michael.jpg";
import NellyOfficeImage from "../../../../../../Beyond Presence_files/Nelly-Office.jpg";
import NellyImage from "../../../../../../Beyond Presence_files/Nelly.jpg";
import YuruoMedicalImage from "../../../../../../Beyond Presence_files/Yuruo-Medical.jpg";
import YuruoOfficeImage from "../../../../../../Beyond Presence_files/Yuruo-Office.jpg";
import ZaidImage from "../../../../../../Beyond Presence_files/Zaid.jpg";

import { useAction } from "convex/react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

import { api } from "../../../../../../convex/_generated/api";
import {
  useBeyondPresenceAgents,
  useBeyondPresenceAvatars,
  useBeyondPresenceEntityId,
} from "../../hooks/use-beyond-presence-data";

const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: "ar", label: "Arabic" },
  { code: "bn", label: "Bengali" },
  { code: "bg", label: "Bulgarian" },
  { code: "zh", label: "Chinese" },
  { code: "cs", label: "Czech" },
  { code: "da", label: "Danish" },
  { code: "nl", label: "Dutch" },
  { code: "en", label: "English" },
  { code: "en-AU", label: "English (Australia)" },
  { code: "en-GB", label: "English (United Kingdom)" },
  { code: "en-US", label: "English (United States)" },
  { code: "fi", label: "Finnish" },
  { code: "fr", label: "French" },
  { code: "fr-CA", label: "French (Canada)" },
  { code: "fr-FR", label: "French (France)" },
  { code: "de", label: "German" },
  { code: "el", label: "Greek" },
  { code: "hi", label: "Hindi" },
  { code: "hu", label: "Hungarian" },
  { code: "id", label: "Indonesian" },
  { code: "it", label: "Italian" },
  { code: "ja", label: "Japanese" },
  { code: "kk", label: "Kazakh" },
  { code: "ko", label: "Korean" },
  { code: "ms", label: "Malay" },
  { code: "no", label: "Norwegian" },
  { code: "pl", label: "Polish" },
  { code: "pt", label: "Portuguese" },
  { code: "pt-BR", label: "Portuguese (Brazil)" },
  { code: "pt-PT", label: "Portuguese (Portugal)" },
  { code: "ro", label: "Romanian" },
  { code: "ru", label: "Russian" },
  { code: "sk", label: "Slovak" },
  { code: "es", label: "Spanish" },
  { code: "sv", label: "Swedish" },
  { code: "tr", label: "Turkish" },
  { code: "uk", label: "Ukrainian" },
  { code: "ur", label: "Urdu" },
  { code: "vi", label: "Vietnamese" },
];

function getLanguageLabel(code: string | null | undefined) {
  const c = String(code ?? "").trim();
  if (!c) return "-";
  const found = LANGUAGE_OPTIONS.find((l) => l.code === c);
  return found ? `${found.label} (${found.code})` : c;
}

function getConvexErrorMessage(error: unknown) {
  const maybeAny = error as any;
  return (
    maybeAny?.data?.message ||
    maybeAny?.message ||
    "Something went wrong. Please try again."
  );
}

function normalizeAvatarKey(name: string | null | undefined) {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

const LOCAL_AVATAR_IMAGES: Record<string, StaticImageData> = {
  awais: AwaisImage,
  ege: EgeImage,
  fjolla: FjollaImage,
  "jerome-office": JeromeOfficeImage,
  "jerome-business": JeromeBusinessImage,
  "jerome-medical": JeromeMedicalImage,
  laura: LauraImage,
  michael: MichaelImage,
  nelly: NellyImage,
  "nelly-office": NellyOfficeImage,
  "yuruo-medical": YuruoMedicalImage,
  "yuruo-office": YuruoOfficeImage,
  zaid: ZaidImage,
};

function getLocalAvatarImage(avatarName: string | null | undefined) {
  const key = normalizeAvatarKey(avatarName);
  return key ? LOCAL_AVATAR_IMAGES[key] : undefined;
}

export const BeyAgentsTab = () => {
  const entityId = useBeyondPresenceEntityId();

  const {
    data: agents,
    isLoading: isAgentsLoading,
    refetch: refetchAgents,
  } = useBeyondPresenceAgents();

  const {
    data: avatars,
    isLoading: isAvatarsLoading,
    refetch: refetchAvatars,
  } = useBeyondPresenceAvatars();

  const createAgent = useAction((api as any).private.beyondPresence.createAgent);
  const updateAgent = useAction((api as any).private.beyondPresence.updateAgent);
  const deleteAgent = useAction((api as any).private.beyondPresence.deleteAgent);

  const [editorOpen, setEditorOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingAgent, setEditingAgent] = useState<any>(null);

  const [name, setName] = useState("");
  const [avatarId, setAvatarId] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [language, setLanguage] = useState("en");
  const [greeting, setGreeting] = useState("Hello!");
  const [maxSessionLengthMinutes, setMaxSessionLengthMinutes] = useState("3");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);

  const [avatarQuery, setAvatarQuery] = useState("");

  const filteredAvatars = useMemo(() => {
    const list = (avatars as any[]) ?? [];
    const q = avatarQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) => {
      const nameStr = String(a?.name ?? "").toLowerCase();
      const idStr = String(a?.id ?? "").toLowerCase();
      const statusStr = String(a?.status ?? "").toLowerCase();
      const visibilityStr = String(a?.visibility ?? "").toLowerCase();
      return (
        nameStr.includes(q) ||
        idStr.includes(q) ||
        statusStr.includes(q) ||
        visibilityStr.includes(q)
      );
    });
  }, [avatars, avatarQuery]);

  const avatarById = useMemo(() => {
    const map = new Map<string, any>();
    for (const a of (avatars as any[]) ?? []) {
      if (a?.id) map.set(String(a.id), a);
    }
    return map;
  }, [avatars]);

  const selectedAvatar = avatarId ? avatarById.get(avatarId) : null;
  const selectedAvatarImage = getLocalAvatarImage(selectedAvatar?.name);

  const openCreate = async () => {
    setMode("create");
    setEditingAgent(null);
    setName("");
    setAvatarId("");
    setSystemPrompt("");
    setLanguage("en");
    setGreeting("Hello!");
    setMaxSessionLengthMinutes("3");
    setAvatarQuery("");
    setEditorOpen(true);
    await Promise.all([refetchAvatars(), refetchAgents()]);
  };

  const openEdit = async (agent: any) => {
    setMode("edit");
    setEditingAgent(agent);
    setName(agent?.name ?? "");
    setAvatarId(agent?.avatar_id ?? "");
    setSystemPrompt(agent?.system_prompt ?? "");
    setLanguage(agent?.language ?? "en");
    setGreeting(agent?.greeting ?? "Hello!");
    setMaxSessionLengthMinutes(
      String(agent?.max_session_length_minutes ?? 3),
    );
    setAvatarQuery("");
    setEditorOpen(true);
    await refetchAvatars();
  };

  const handleSave = async () => {
    if (!entityId) {
      toast.error("Organization not found. Please refresh and try again.");
      return;
    }

    if (!name.trim()) {
      toast.error("Agent name is required");
      return;
    }

    if (!avatarId) {
      toast.error("Please select an avatar");
      return;
    }

    if (!systemPrompt.trim()) {
      toast.error("System prompt is required");
      return;
    }

    const maxMinutes = Number(maxSessionLengthMinutes);
    if (!Number.isFinite(maxMinutes) || maxMinutes <= 0 || maxMinutes > 90) {
      toast.error("Max session length must be between 1 and 90 minutes");
      return;
    }

    try {
      setIsSubmitting(true);

      if (mode === "create") {
        const result: any = await createAgent({
          entityId,
          name: name.trim(),
          avatarId,
          systemPrompt: systemPrompt.trim(),
          language,
          greeting,
          maxSessionLengthMinutes: maxMinutes,
        });
        const applied = Number((result as any)?.max_session_length_minutes);
        if (Number.isFinite(applied) && applied !== maxMinutes) {
          toast.warning(
            `Beyond Presence applied max session length ${applied} minutes (requested ${maxMinutes}).`,
          );
        }
        toast.success("Agent created");
      } else {
        const agentId = editingAgent?.id;
        if (!agentId) {
          toast.error("Missing agent id");
          return;
        }

        const result: any = await updateAgent({
          entityId,
          agentId,
          name: name.trim(),
          avatarId,
          systemPrompt: systemPrompt.trim(),
          language,
          greeting,
          maxSessionLengthMinutes: maxMinutes,
        });
        const applied = Number((result as any)?.max_session_length_minutes);
        if (Number.isFinite(applied) && applied !== maxMinutes) {
          toast.warning(
            `Beyond Presence applied max session length ${applied} minutes (requested ${maxMinutes}).`,
          );
        }
        toast.success("Agent updated");
      }

      setEditorOpen(false);
      await refetchAgents();
    } catch (error) {
      console.error(error);
      toast.error(getConvexErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (agent: any) => {
    if (!entityId) {
      toast.error("Organization not found. Please refresh and try again.");
      return;
    }

    try {
      setDeletingAgentId(String(agent?.id ?? "") || null);
      await deleteAgent({ entityId, agentId: agent.id });
      toast.success("Agent deleted");
      await refetchAgents();
    } catch (error) {
      console.error(error);
      toast.error(getConvexErrorMessage(error));
    } finally {
      setDeletingAgentId(null);
    }
  };

  const languageOptionsForSelect = useMemo(() => {
    const current = String(language ?? "").trim();
    const isKnown = LANGUAGE_OPTIONS.some((l) => l.code === current);
    if (!current || isKnown) return LANGUAGE_OPTIONS;
    return [{ code: current, label: `Current: ${current}` }, ...LANGUAGE_OPTIONS];
  }, [language]);

  return (
    <div className="border-t bg-background">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="text-sm text-muted-foreground">
          Create and manage AI Avatar agents
        </div>
        <Button onClick={openCreate} size="sm">
          <PlusIcon />
          Create agent
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-6 py-4">Agent</TableHead>
            <TableHead className="px-6 py-4">Language</TableHead>
            <TableHead className="px-6 py-4">Greeting</TableHead>
            <TableHead className="px-6 py-4 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {(() => {
            if (isAgentsLoading) {
              return (
                <TableRow>
                  <TableCell colSpan={4} className="px-6 py-8">
                    Loading agents...
                  </TableCell>
                </TableRow>
              );
            }

            if (!agents || (agents as any[]).length === 0) {
              return (
                <TableRow>
                  <TableCell colSpan={4} className="px-6 py-8">
                    No agents found
                  </TableCell>
                </TableRow>
              );
            }

            return (agents as any[]).map((agent) => (
              <TableRow className="hover:bg-muted/50" key={agent.id}>
                <TableCell className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const agentAvatar = agent?.avatar_id
                        ? avatarById.get(String(agent.avatar_id))
                        : null;
                      const img = getLocalAvatarImage(agentAvatar?.name);
                      if (!img) {
                        return <BotIcon className="size-4 text-muted-foreground" />;
                      }
                      return (
                        <div className="relative size-6 overflow-hidden rounded-full border bg-muted">
                          <Image
                            alt={agentAvatar?.name ?? "Avatar"}
                            className="object-cover"
                            fill
                            sizes="24px"
                            src={img}
                          />
                        </div>
                      );
                    })()}
                    <span>{agent.name || "Unnamed agent"}</span>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <span className="text-sm">
                    {getLanguageLabel(agent.language)}
                  </span>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <span className="truncate text-muted-foreground text-sm">
                    {agent.greeting || "-"}
                  </span>
                </TableCell>
                <TableCell className="px-6 py-4 text-right">
                  <div className="inline-flex items-center gap-2">
                    <Button
                      onClick={() => void openEdit(agent)}
                      size="sm"
                      variant="outline"
                    >
                      <PencilIcon />
                      Edit
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={Boolean(deletingAgentId) || isSubmitting}
                        >
                          <TrashIcon />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete agent</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete “{agent.name ?? "Unnamed agent"}”.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            disabled={Boolean(deletingAgentId) || isSubmitting}
                            onClick={() => void handleDelete(agent)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ));
          })()}
        </TableBody>
      </Table>

      <Dialog onOpenChange={setEditorOpen} open={editorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Create agent" : "Edit agent"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input
                disabled={isSubmitting}
                onChange={(e) => setName(e.target.value)}
                value={name}
              />
            </div>

            <div className="grid gap-2">
              <Label>Avatar</Label>
              <div className="grid gap-3 rounded-md border p-3">
                {selectedAvatarImage ? (
                  <div className="flex items-center gap-3">
                    <div className="relative size-12 overflow-hidden rounded-full border bg-muted">
                      <Image
                        alt={selectedAvatar?.name ?? "Selected avatar"}
                        className="object-cover"
                        fill
                        sizes="48px"
                        src={selectedAvatarImage}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-sm">
                        {selectedAvatar?.name || "Selected avatar"}
                      </div>
                      <div className="truncate text-muted-foreground text-xs">
                        {selectedAvatar?.id}
                      </div>
                    </div>
                  </div>
                ) : null}

                <Input
                  disabled={isSubmitting || isAvatarsLoading}
                  onChange={(e) => setAvatarQuery(e.target.value)}
                  placeholder={
                    isAvatarsLoading
                      ? "Loading avatars..."
                      : "Search avatars by name, id, status..."
                  }
                  value={avatarQuery}
                />

                <ScrollArea className="h-56">
                  <div className="grid grid-cols-2 gap-2 pr-3 sm:grid-cols-3">
                    {filteredAvatars.length === 0 ? (
                      <div className="col-span-2 text-muted-foreground text-sm sm:col-span-3">
                        No avatars found
                      </div>
                    ) : (
                      filteredAvatars.map((avatar) => {
                        const selected = avatarId === avatar.id;
                        const avatarImage = getLocalAvatarImage(avatar?.name);
                        return (
                          <button
                            className={
                              "flex w-full flex-col gap-2 rounded-md border p-2 text-left transition hover:bg-muted/50 " +
                              (selected ? "border-primary" : "")
                            }
                            disabled={isSubmitting}
                            key={avatar.id}
                            onClick={() => setAvatarId(avatar.id)}
                            type="button"
                          >
                            <div className="flex items-start justify-between gap-2">
                              {avatarImage ? (
                                <div className="relative mt-0.5 size-8 shrink-0 overflow-hidden rounded-full border bg-muted">
                                  <Image
                                    alt={avatar?.name || "Avatar"}
                                    className="object-cover"
                                    fill
                                    sizes="32px"
                                    src={avatarImage}
                                  />
                                </div>
                              ) : null}
                              <div className="min-w-0">
                                <div className="truncate font-medium text-sm">
                                  {avatar.name || "Unnamed avatar"}
                                </div>
                                <div className="truncate text-muted-foreground text-xs">
                                  {avatar.id}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="secondary">
                                {avatar.visibility || "unknown"}
                              </Badge>
                              <Badge variant="outline">
                                {avatar.status || "unknown"}
                              </Badge>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>

                {avatarId ? (
                  <div className="text-muted-foreground text-xs">
                    Selected: <span className="font-mono">{avatarId}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Language</Label>
              <div className="grid gap-2">
                <Select
                  disabled={isSubmitting}
                  onValueChange={(value) => setLanguage(value)}
                  value={language}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptionsForSelect.map((opt) => (
                      <SelectItem key={opt.code} value={opt.code}>
                        {opt.label} ({opt.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Greeting</Label>
              <Input
                disabled={isSubmitting}
                onChange={(e) => setGreeting(e.target.value)}
                value={greeting}
              />
            </div>

            <div className="grid gap-2">
              <Label>Max session length (minutes)</Label>
              <Input
                disabled={isSubmitting}
                onChange={(e) => setMaxSessionLengthMinutes(e.target.value)}
                type="number"
                value={maxSessionLengthMinutes}
              />
            </div>

            <div className="grid gap-2">
              <Label>System prompt</Label>
              <Textarea
                disabled={isSubmitting}
                onChange={(e) => setSystemPrompt(e.target.value)}
                value={systemPrompt}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={isSubmitting}
              onClick={() => setEditorOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isSubmitting} onClick={() => void handleSave()}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
