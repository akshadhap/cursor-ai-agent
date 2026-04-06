// "use client";

// import React from "react";
// import { Bot, Phone, CircleCheckBig, Trash2 } from "lucide-react";
// import { useRouter } from "next/navigation";
// import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";

// type Agent = {
//   id: string;
//   name: string;
//   phone?: string;
//   assistantId?: string;
//   tags?: string[];
//   status?: string;
// };

// export default function AgentCard({
//   agent,
//   onEdit,
//   onDelete,
//   onView
// }: {
//   agent: Agent;
//   onEdit?: (agent: Agent) => void;
//   onDelete?: (agent: Agent) => void;
//   onView?: (agent: Agent) => void;
// }) {
//   const router = useRouter();

//   const handleView = () => {
//     if (onView) return onView(agent);
//     router.push(`/voiceagents/${agent.id}`);
//   };

//   const handleEdit = () => {
//     if (onEdit) return onEdit(agent);
//     router.push(`/voiceagents/${agent.id}?edit=true`);
//   };

//   const handleDelete = () => {
//     if (onDelete) return onDelete(agent);
//     console.warn("Delete handler missing — parent must pass `onDelete`.");
//   };

//   return (
//     <Card className="rounded-2xl border bg-muted/30 relative overflow-hidden">
//       <CardHeader>
//         <div className="flex items-start justify-between gap-4">
//           <div>
//             <CardTitle className="text-lg">{agent.name}</CardTitle>

//             <div className="flex flex-wrap gap-2 mt-2 items-center">
//               {Array.isArray(agent.tags) && agent.tags.length > 0 && (
//   <Badge variant="secondary">{agent.tags[0]}</Badge>
// )}


//               {agent.status && <Badge>{agent.status}</Badge>}
//             </div>
//           </div>

//           <Bot className="h-8 w-8 text-primary" />
//         </div>
//       </CardHeader>

//       <CardContent className="space-y-3">
//         {agent.phone && (
//           <div className="text-sm text-muted-foreground flex items-center gap-2">
//             <Phone className="h-4 w-4" />
//             <span>{agent.phone}</span>
//           </div>
//         )}

//         {agent.assistantId && (
//           <div className="text-xs text-muted-foreground break-words">
//             <div className="flex items-start gap-3">
//               <CircleCheckBig className="h-4 w-4 text-primary" />

//               <div>
//                 <span className="font-medium text-sm">Assistant ID</span>
//                 <div>{agent.assistantId}</div>
//               </div>
//             </div>
//           </div>
//         )}
//       </CardContent>

//       <CardFooter>
//         <div className="flex w-full gap-3">
//           {/* <Button size="sm" className="flex-1" onClick={handleView}>
//             View
//           </Button> */}

//           {/* <Button
//             size="sm"
//             variant="outline"
//             className="flex-1"
//             onClick={handleEdit}
//           >
//             Edit
//           </Button> */}

//           <Button
//             size="sm"
//             className="bg-red-600 text-white"
//             onClick={handleDelete}
//           >
//             <Trash2 className="h-4 w-4" />
//           </Button>
//         </div>
//       </CardFooter>
//     </Card>
//   );
// }







"use client";

import React from "react";
import { Bot, Phone, CircleCheckBig, Trash2, MoreVertical, Workflow } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Agent = {
  id: string;
  name: string;
  phone?: string;
  assistantId?: string;
  tags?: string[];
  status?: string;
};

export default function AgentCard({
  agent,
  onEdit,
  onDelete,
  onView
}: {
  agent: Agent;
  onEdit?: (agent: Agent) => void;
  onDelete?: (agent: Agent) => void;
  onView?: (agent: Agent) => void;
}) {
  const router = useRouter();

  const handleView = () => {
    if (onView) return onView(agent);
    router.push(`/voiceagents/${agent.id}`);
  };

  const handleEdit = () => {
    if (onEdit) return onEdit(agent);
    router.push(`/voiceagents/${agent.id}?edit=true`);
  };

  const handleDelete = () => {
    if (onDelete) return onDelete(agent);
    console.warn("Delete handler missing — parent must pass `onDelete`.");
  };

  return (
    <Card className="group relative rounded-lg border border-border/50 bg-card hover:border-border hover:shadow-md transition-all duration-200">
      <CardContent className="p-4 space-y-3">
        {/* Title and menu */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
              <Workflow className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="font-semibold text-sm truncate">{agent.name}</h3>
          </div>
          <button 
            className="p-1 rounded-md hover:bg-accent transition-colors"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Metadata */}
        <div className="space-y-1.5">
          {agent.phone && (
            <div className="flex items-center gap-2 text-xs">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span className="text-foreground font-medium">{agent.phone}</span>
            </div>
          )}
          
          {agent.assistantId && (
            <div className="flex items-center gap-2 text-xs">
              <CircleCheckBig className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground truncate">
                ID: {agent.assistantId.slice(0, 16)}...
              </span>
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border/40">
          <div className="flex items-center gap-1">
            <span className="font-medium text-muted-foreground/80">Updated</span>
            <span>2h ago</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium text-muted-foreground/80">Created</span>
            <span>2h ago</span>
          </div>
        </div>
      </CardContent>

      {/* Footer */}
      <CardFooter className="px-4 pb-4 pt-0 flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {agent.status && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5 font-medium">
              {agent.status}
            </Badge>
          )}
          {agent.tags?.slice(0, 1).map((tag, idx) => (
            <Badge key={idx} variant="outline" className="text-xs px-2 py-0.5">
              {tag}
            </Badge>
          ))}
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </CardFooter>
    </Card>
  );
}