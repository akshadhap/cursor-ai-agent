
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, User, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

type InviteEmployeeFormProps = {
  onInvited?: () => void;
  inviterUid?: string | null;
  entityId?: string | null;
};

export function InviteEmployeeForm({
  onInvited,
  inviterUid: propInviterUid,
  entityId: propEntityId,
}: InviteEmployeeFormProps) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setShowSuccess(false);

    try {
          const inviterUid = propInviterUid ?? null;
          const entityId = propEntityId ?? null;

          if (!inviterUid || !entityId) {
            toast.error("Unable to determine inviter or entity ID. Please refresh and try again.");
            return;
          }

          // Create employee in entity API via server proxy
          const createEmpRes = await fetch(`/api/auth/entities/${encodeURIComponent(entityId)}/employees`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              displayName: `${firstName} ${lastName}`.trim() || email,
              firstName,
              lastName,
              profileImageUrl: "https://picsum.photos/128",
              roles: ["AGENT"],
              status: "INVITED",
            }),
          });

          if (!createEmpRes.ok) {
            const data = await createEmpRes.json().catch(() => ({}));
            toast.error(data.error || "Failed to create employee");
            return;
          }

          const createdEmp = await createEmpRes.json().catch(() => ({}));

          const res = await fetch("/api/auth/invites/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              inviterUid,
              email,
              firstName,
              lastName,
            }),
          });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to send invite");
        return;
      }

      toast.success("Employee invited", {
        description: `Invitation sent to ${email}`,
      });

      setShowSuccess(true);
      setEmail("");
      setFirstName("");
      setLastName("");

      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000);

      if (onInvited) onInvited();
    } catch (error) {
      toast.error("Failed to invite employee");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {showSuccess && (
        <Alert className="mb-6 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-600 dark:text-green-400">
            Invitation sent successfully!
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          {/* First Name */}
          <div className="flex-1 space-y-2">
            <Label htmlFor="firstName" className="text-sm font-medium">
              First Name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="firstName"
                placeholder="e.g., John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="pl-9 h-11"
                required
              />
            </div>
          </div>

          {/* Last Name */}
          <div className="flex-1 space-y-2">
            <Label htmlFor="lastName" className="text-sm font-medium">
              Last Name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="lastName"
                placeholder="e.g., Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="pl-9 h-11"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex-1 space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="e.g., john@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 h-11"
                required
              />
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isLoading || !propInviterUid || !propEntityId}
            className="w-full sm:w-auto gap-2 h-11 px-6"
          >
            {isLoading ? (
              <>
                <span>Sending...</span>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Send Invite
              </>
            )}
          </Button>
        </div>
      </form>

      {!propInviterUid && (
        <Alert className="mt-4">
          <AlertDescription>
            Please refresh the page to resolve your inviter ID before sending invites.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
