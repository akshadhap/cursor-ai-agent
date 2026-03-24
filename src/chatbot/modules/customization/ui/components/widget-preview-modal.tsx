"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WidgetPreview } from "./widget-preview";

interface WidgetPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatbotId: string;
  entityId: string;
  width: number;
  primaryColor?: string;
}

export const WidgetPreviewModal = ({
  isOpen,
  onClose,
  chatbotId,
  entityId,
  width,
  primaryColor,
}: WidgetPreviewModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Widget Preview</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center p-8">
          <div style={{ width: `${width}px` }}>
            <WidgetPreview
              chatbotId={chatbotId}
              entityId={entityId}
              primaryColor={primaryColor}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
