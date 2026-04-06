"use client";

import { Button } from "@/components/ui/button";
import { ShareIcon, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useSaveToCommnunity } from "@/features/templates/hooks/use-templates";
import { toast } from "sonner";

// Available tags for templates
export const TEMPLATE_TAGS = [
  "AI",
  "Automation",
  "CRM",
  "Email",
  "Lead Generation",
  "Sales",
  "Marketing",
  "Customer Support",
  "Data Processing",
  "Analytics",
  "Integration",
  "Notification",
  "Webhook",
  "Workflow",
  "Agent",
] as const;

interface SaveToCommunityButtonProps {
  workflowId: string;
  workflowName: string;
}

export const SaveToCommunityButton = ({
  workflowId,
  workflowName,
}: SaveToCommunityButtonProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(workflowName);
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const saveToCommnunity = useSaveToCommnunity();

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSave = async () => {
    try {
      await saveToCommnunity.mutateAsync({
        workflowId,
        name,
        description: description || undefined,
        tags: selectedTags,
      });
      
      toast.success("Workflow saved to community templates!");
      setOpen(false);
      setName(workflowName);
      setDescription("");
      setSelectedTags([]);
    } catch (error) {
      toast.error("Failed to save template");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <ShareIcon className="size-4" />
          Save to Community
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ShareIcon className="h-5 w-5 text-primary" />
            </div>
            Share to Community
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Share your workflow as a template with the community. Your credentials will remain private - users will configure their own.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-6">
          <div className="grid gap-3">
            <Label htmlFor="template-name" className="text-sm font-medium">
              Template Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Lead Generation & Qualification Workflow"
              className="h-10"
            />
          </div>
          <div className="grid gap-3">
            <Label htmlFor="template-description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this template does and how others can use it..."
              rows={4}
              className="resize-none"
            />
          </div>
          <div className="grid gap-3">
            <Label className="text-sm font-medium">
              Tags <span className="text-xs text-muted-foreground font-normal">(Select up to 5)</span>
            </Label>
            <div className="flex flex-wrap gap-2 p-4 border rounded-lg bg-muted/30">
              {TEMPLATE_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                const isDisabled = !isSelected && selectedTags.length >= 5;
                return (
                  <Badge
                    key={tag}
                    variant={isSelected ? "default" : "outline"}
                    className={`cursor-pointer transition-all hover:scale-105 ${
                      isSelected 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : isDisabled
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-primary/10"
                    }`}
                    onClick={() => {
                      if (!isDisabled || isSelected) {
                        toggleTag(tag);
                      }
                    }}
                  >
                    {tag}
                    {isSelected && <X className="ml-1.5 h-3 w-3" />}
                  </Badge>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {selectedTags.length === 0 
                  ? "No tags selected yet" 
                  : selectedTags.length === 1
                  ? "1 tag selected"
                  : `${selectedTags.length} tags selected`}
              </span>
              {selectedTags.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setSelectedTags([])}
                >
                  Clear all
                </Button>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saveToCommnunity.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || saveToCommnunity.isPending}
            className="gap-2"
          >
            {saveToCommnunity.isPending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <ShareIcon className="h-4 w-4" />
                Save Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
