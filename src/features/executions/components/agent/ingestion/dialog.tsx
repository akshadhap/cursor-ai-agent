"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import ExcelJS from "exceljs";

import { Button } from "@/components/ui/button";

const formSchema = z.object({
  // internal plumbing – not shown in UI
  variableName: z.string().optional(),
  inputPath: z.string().optional(),
  outputPath: z.string().optional(),

  // main config
  source: z.enum(["WEBFORM", "EXCEL", "CRM"]),

  // webform field configs
  fullName: z.string().optional(),
  email: z.string().optional(),
  companyName: z.string().optional(),
  phoneNumber: z.string().optional(),
  role: z.string().optional(),
  budgetRange: z.string().optional(),
  companySize: z.string().optional(),
  projectUrgency: z.string().optional(),
  leadSource: z.string().optional(),

  excelRows: z.any().optional(),
});

export type IngestionFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: IngestionFormValues) => void;
  defaultValues?: Partial<IngestionFormValues>;
}

export const LeadIngestionDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<IngestionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "leads",
      inputPath: defaultValues.inputPath || "leads",
      outputPath: defaultValues.outputPath || "leads",
      source: defaultValues.source || "WEBFORM",

      fullName: defaultValues.fullName || "",
      email: defaultValues.email || "",
      companyName: defaultValues.companyName || "",
      phoneNumber: defaultValues.phoneNumber || "",
      role: defaultValues.role || "",
      budgetRange: defaultValues.budgetRange || "",
      companySize: defaultValues.companySize || "",
      projectUrgency: defaultValues.projectUrgency || "",
      leadSource: defaultValues.leadSource || "",

      excelRows: (defaultValues as any).excelRows || [],
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "leads",
        inputPath: defaultValues.inputPath || "leads",
        outputPath: defaultValues.outputPath || "leads",
        source: defaultValues.source || "WEBFORM",

        fullName: defaultValues.fullName || "",
        email: defaultValues.email || "",
        companyName: defaultValues.companyName || "",
        phoneNumber: defaultValues.phoneNumber || "",
        role: defaultValues.role || "",
        budgetRange: defaultValues.budgetRange || "",
        companySize: defaultValues.companySize || "",
        projectUrgency: defaultValues.projectUrgency || "",
        leadSource: defaultValues.leadSource || "",

        excelRows: (defaultValues as any).excelRows || [],
      });
    }
  }, [open, defaultValues, form]);

  const watchSource = form.watch("source") || "WEBFORM";
    const excelRows = (form.watch("excelRows") as any[]) || [];
  const [fileName, setFileName] = useState<string | null>(null);



    // When switching sources, clear conflicting configs
  useEffect(() => {
    if (watchSource === "EXCEL") {
      // Clear webform fields when in Excel mode
      form.setValue("fullName", "");
      form.setValue("email", "");
      form.setValue("companyName", "");
      form.setValue("phoneNumber", "");
      form.setValue("role", "");
      form.setValue("budgetRange", "");
      form.setValue("companySize", "");
      form.setValue("projectUrgency", "");
      form.setValue("leadSource", "");
    } else if (watchSource === "WEBFORM" || watchSource === "CRM") {
      // Clear Excel rows when in Webform/CRM
      form.setValue("excelRows", [], { shouldDirty: true });
      setFileName(null);
    }
  }, [watchSource, form]);



    const handleClear = () => {
    const currentValues = form.getValues();
    form.reset({
      ...currentValues,
      fullName: "",
      email: "",
      companyName: "",
      phoneNumber: "",
      role: "",
      budgetRange: "",
      companySize: "",
      projectUrgency: "",
      leadSource: "",
    });
  };



    const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const ext = file.name.toLowerCase().split(".").pop();

    try {
      if (ext === "csv") {
        // Simple CSV parsing
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((line) => line.trim().length);
        if (lines.length === 0) {
          form.setValue("excelRows", [], { shouldDirty: true });
          return;
        }

        const headers = lines[0].split(",").map((h) => h.trim());
        const rows = lines.slice(1).map((line) => {
          const cells = line.split(",");
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => {
            row[h] = cells[idx]?.trim() ?? "";
          });
          return row;
        });

        form.setValue("excelRows", rows, { shouldDirty: true });
      } else {
        // XLSX / XLS using ExcelJS
        const data = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(data);
        const worksheet = workbook.worksheets[0];
        
        if (!worksheet) {
          form.setValue("excelRows", [], { shouldDirty: true });
          return;
        }
        
        const rows: any[] = [];
        let headers: string[] = [];
        
        // Get all rows as arrays (including empty cells)
        worksheet.eachRow((row, rowNumber) => {
          const rowValues = row.values as any[];
          // row.values is 1-indexed, so we need to slice from index 1
          const actualValues = rowValues.slice(1);
          
          if (rowNumber === 1) {
            // First row is headers
            headers = actualValues.map((v) => v?.toString() || '');
          } else {
            // Data rows - create object matching headers
            const rowData: Record<string, any> = {};
            headers.forEach((header, index) => {
              if (header) {
                rowData[header] = actualValues[index];
              }
            });
            rows.push(rowData);
          }
        });

        form.setValue("excelRows", rows, { shouldDirty: true });
      }
    } catch (err) {
      console.error("Failed to parse file", err);
      form.setValue("excelRows", [], { shouldDirty: true });
    }
  };

  const handleSubmit = (values: IngestionFormValues) => {
    const payload: IngestionFormValues = {
      variableName: values.variableName || "leads",
      inputPath: values.inputPath || "leads",
      outputPath: values.outputPath || "leads",
      source: values.source,
      fullName: values.fullName,
      email: values.email,
      companyName: values.companyName,
      phoneNumber: values.phoneNumber,
      role: values.role,
      budgetRange: values.budgetRange,
      companySize: values.companySize,
      projectUrgency: values.projectUrgency,
      leadSource: values.leadSource,

      excelRows: (values as any).excelRows || [],
    };

    onSubmit(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lead Ingestion</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 mt-4"
          >
            {/* 1. Source selector */}
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ingestion source</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a source" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="WEBFORM">Webform</SelectItem>
                      <SelectItem value="EXCEL">Excel / CSV</SelectItem>
                      {/* <SelectItem value="CRM">CRM</SelectItem> */}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Decide whether your leads come from a contact form,
                    an Excel/CSV upload, or an external CRM.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 2. Conditional UX */}

            {/* WEBFORM → contact form */}
            {watchSource === "WEBFORM" && (
              <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Full name" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Email" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Company Name" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Phone Number" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Role" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="budgetRange"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Budget range" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="companySize"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Company size" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="projectUrgency"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Project urgency" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="leadSource"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Lead source" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* EXCEL → upload UI with horizontally scrollable table */}
{watchSource === "EXCEL" && (
  <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
    <p className="text-sm text-muted-foreground">
      Leads will be ingested from an Excel / CSV file. Each row should contain the same fields as the webform: full name,
      email, company name, phone number, role, budget range, company size, project urgency, and lead source.
    </p>

    <div className="space-y-2">
      <p className="text-sm font-medium">Upload file</p>
      <Input
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileChange}
      />
      {fileName && (
        <p className="text-xs text-muted-foreground mt-1">
          Selected file: <span className="font-medium">{fileName}</span>
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        We&apos;ll parse the file and send each row through the workflow, just like a webform submission.
      </p>

      {/* Horizontally Scrollable Table Preview */}
      {excelRows && excelRows.length > 0 && (
       <div className="mt-4 w-full overflow-hidden">
  <div className="w-full overflow-x-auto rounded-lg border bg-background">
            <div className="max-h-64 overflow-y-auto"> {/* Vertical scroll if too many rows */}
              <table className="w-full min-w-[800px] table-auto border-collapse text-xs">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    {Object.keys(excelRows[0] as any).map((key) => (
                      <th
                        key={key}
                        className="border-b px-4 py-3 text-left font-medium text-foreground/80 whitespace-nowrap"
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {excelRows.slice(0, 20).map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      {Object.values(row as any).map((value, cellIdx) => (
                        <td
                          key={cellIdx}
                          className="border-b px-4 py-2.5 align-top max-w-xs break-words"
                          title={String(value ?? "")}
                        >
                          {String(value ?? "").substring(0, 200) || "—"}
                          {String(value ?? "").length > 200 && (
                            <span className="text-muted-foreground ml-1">…</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer info */}
            <div className="border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
              Showing first {Math.min(excelRows.length, 20)} of {excelRows.length} row(s)
              {excelRows.length > 20 && " — scroll down for more"}
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
)}

            {/* CRM → explanation */}
            {watchSource === "CRM" && (
              <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">
                  Leads will be pulled from your connected CRM and normalized to
                  the same structure as the contact form.
                </p>
              </div>
            )}

                        <DialogFooter className="mt-4 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
              >
                Clear
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
