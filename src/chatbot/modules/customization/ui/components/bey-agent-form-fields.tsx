import { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSchema } from "../../types";
import { useBeyondPresenceAgents } from "../../../plugins/hooks/use-beyond-presence-data";

interface BeyAgentFormFieldsProps {
  form: UseFormReturn<FormSchema>;
}

export const BeyAgentFormFields = ({
  form,
}: BeyAgentFormFieldsProps) => {
  const { data: agents, isLoading } = useBeyondPresenceAgents();

  const disabled = form.formState.isSubmitting;

  return (
    <FormField
      control={form.control}
      name="beyondPresenceAgentId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>AI Avatar Agent</FormLabel>
          <Select
            disabled={isLoading || disabled}
            onValueChange={field.onChange}
            value={field.value}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isLoading ? "Loading agents..." : "Select an agent"
                  }
                />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {(agents as any[]).map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name || "Unnamed Agent"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormDescription>
            The Beyond Presence agent to use when AI Avatar is enabled.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
