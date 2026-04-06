"use client";

import Link from "next/link";
import { useState } from "react";
import { UploadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UploadDialog } from "../../../dashboard/ui/components/upload-dialog";

export const BeyKnowledgeBaseTab = () => {
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div className="space-y-4 border-t bg-background p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Knowledge Base</CardTitle>
              <CardDescription>
                Upload documents to your platform knowledge base. Beyond Presence
                does not currently expose a public knowledge base upload endpoint
                in their API docs.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={() => setUploadOpen(true)}>
                <UploadIcon />
                Upload
              </Button>
              <Button asChild variant="outline">
                <Link href="/knowledge-bases">Manage</Link>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
};
