/**
 * Post Success Modal
 * Shows after a post is successfully published with options to set up automation
 */

"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2Icon, MessageSquareIcon, ZapIcon, XIcon } from "lucide-react";

interface PostSuccessModalProps {
    open: boolean;
    onClose: () => void;
    onSetupAutomation: () => void;
    postContent: string;
}

export function PostSuccessModal({
    open,
    onClose,
    onSetupAutomation,
    postContent,
}: PostSuccessModalProps) {
    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <CheckCircle2Icon className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <DialogTitle className="text-xl">Post Published Successfully! 🎉</DialogTitle>
                    <DialogDescription className="mt-2">
                        Your post is now live on LinkedIn. Would you like to set up automatic
                        replies for comments on this post?
                    </DialogDescription>
                </DialogHeader>

                {/* Post Preview */}
                <div className="my-4 p-3 bg-muted/50 rounded-lg border border-border/50">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {postContent}
                    </p>
                </div>

                {/* Benefits */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ZapIcon className="h-4 w-4 text-amber-500" />
                        <span>Auto-reply when someone comments with keywords</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MessageSquareIcon className="h-4 w-4 text-blue-500" />
                        <span>Engage followers automatically 24/7</span>
                    </div>
                </div>

                <DialogFooter className="flex-col gap-2 sm:flex-row">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        <XIcon className="mr-2 h-4 w-4" />
                        Skip for Now
                    </Button>
                    <Button onClick={onSetupAutomation} className="flex-1">
                        <ZapIcon className="mr-2 h-4 w-4" />
                        Set Up Automation
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
