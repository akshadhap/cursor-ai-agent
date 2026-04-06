import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Doc } from "../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, ArrowUpIcon, CheckIcon } from "lucide-react";

export const ConversationStatusButton = ({
  status,
  onClick,
  disabled,
}: {
  status: Doc<"conversations">["status"];
  onClick: () => void;
  disabled?:boolean;
}) => {
  if (status === "resolved") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button disabled = {disabled}  onClick={onClick} size="sm" variant="secondary">
                <CheckIcon />
                Resolved
            </Button>
          </TooltipTrigger>
          <TooltipContent>Mark as unresolved</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (status === "escalated") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button disabled = {disabled} onClick={onClick} size="sm" variant="outline">
                <ArrowUpIcon />
                Escalated
            </Button>
          </TooltipTrigger>
          <TooltipContent>Mark as resolved</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button disabled = {disabled} onClick={onClick} size="sm" variant="destructive">
            <ArrowRightIcon />
            Unresolved
          </Button>
        </TooltipTrigger>
        <TooltipContent>Mark as escalated</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )


  

};
