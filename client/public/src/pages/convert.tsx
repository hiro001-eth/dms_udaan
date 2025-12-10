import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  FileText,
  Image,
  Upload,
  Download,
  RefreshCw,
  Check,
  X,
  Loader2,
  Merge,
  Split,
  RotateCw,
  Trash2,
  Hash,
  ArrowUpDown,
  Stamp,
  Type,
  Minimize2,
  Maximize2,
  Crop,
  ImageIcon,
  FileDigit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: typeof FileText;
  color: string;
  accepts: string;
  endpoint: string;
  fields?: { name: string; label: string; type: string; placeholder?: string; options?: { value: string; label: string }[] }[];
}

const pdfTools: Tool[] = [
  {
    id: "merge",
    name: "Merge PDFs",
    description: "Combine multiple PDFs into one",
    icon: Merge,
    color: "bg-red-500",
    accepts: ".pdf",
    endpoint: "/api/file-ops/merge",
    fields: [],
  },
  {
    id: "split",
    name: "Split PDF",
    description: "Extract pages from a PDF",
    icon: Split,
    color: "bg-orange-500",
    accepts: ".pdf",
    endpoint: "/api/file-ops/split",
    fields: [{ name: "pageRanges", label: "Page Ranges (e.g., 1-3, 5)", type: "text", placeholder: "1-3, 5-7" }],
  },
  {
    id: "rotate",
    name: "Rotate PDF",
    description: "Rotate all pages in a PDF",
    icon: RotateCw,
    color: "bg-blue-500",
    accepts: ".pdf",
    endpoint: "/api/file-ops/rotate",
    fields: [
      {
        name: "degrees",
        label: "Rotation",
        type: "select",
        options: [
          { value: "90", label: "90 degrees clockwise" },
          { value: "180", label: "180 degrees" },
          { value: "270", label: "90 degrees counter-clockwise" },
        ],
      },
    ],
  },
  {
    id: "delete-pages",
    name: "Delete Pages",
    description: "Remove specific pages from PDF",
    icon: Trash2,
    color: "bg-red-600",
    accepts: ".pdf",
    endpoint: "/api/file-ops/delete-pages",
    fields: [{ name: "pages", label: "Pages to Delete (comma-separated)", type: "text", placeholder: "1, 3, 5" }],
  },
  {
    id: "add-page-numbers",
    name: "Add Page Numbers",
    description: "Number your PDF pages",
    icon: Hash,
    color: "bg-purple-500",
    accepts: ".pdf",
    endpoint: "/api/file-ops/add-page-numbers",
    fields: [
      {
        name: "position",
        label: "Position",
        type: "select",
        options: [
          { value: "bottom", label: "Bottom" },
          { value: "top", label: "Top" },
        ],
      },
      { name: "format", label: "Format", type: "text", placeholder: "Page {n} of {total}" },
    ],
  },
  {
    id: "reorder-pages",
    name: "Reorder Pages",
    description: "Change the order of pages",
    icon: ArrowUpDown,
    color: "bg-indigo-500",
    accepts: ".pdf",
    endpoint: "/api/file-ops/reorder-pages",
    fields: [{ name: "order", label: "New Order (comma-separated)", type: "text", placeholder: "3, 1, 2, 4" }],
  },
  {
    id: "watermark",
    name: "Add Watermark",
    description: "Add text watermark to PDF",
    icon: Stamp,
    color: "bg-teal-500",
    accepts: ".pdf",
    endpoint: "/api/file-ops/watermark",
    fields: [{ name: "watermarkText", label: "Watermark Text", type: "text", placeholder: "CONFIDENTIAL" }],
  },
  {
    id: "header-footer",
    name: "Add Header/Footer",
    description: "Add header or footer text",
    icon: Type,
    color: "bg-cyan-500",
    accepts: ".pdf",
    endpoint: "/api/file-ops/add-header-footer",
    fields: [
      { name: "header", label: "Header Text", type: "text", placeholder: "Header text" },
      { name: "footer", label: "Footer Text", type: "text", placeholder: "Footer text" },
    ],
  },
  {
    id: "compress",
    name: "Compress PDF",
    description: "Reduce PDF file size",
    icon: Minimize2,
    color: "bg-green-500",
    accepts: ".pdf",
    endpoint: "/api/file-ops/compress",
    fields: [],
  },
  {
    id: "extract-pages",
    name: "Extract Pages",
    description: "Extract specific pages",
    icon: FileDigit,
    color: "bg-amber-500",
    accepts: ".pdf",
    endpoint: "/api/file-ops/extract-pages",
    fields: [{ name: "pages", label: "Pages to Extract (comma-separated)", type: "text", placeholder: "1, 3, 5-7" }],
  },
];

const imageTools: Tool[] = [
  {
    id: "image-to-pdf",
    name: "Image to PDF",
    description: "Convert images to PDF",
    icon: FileText,
    color: "bg-rose-500",
    accepts: ".jpg,.jpeg,.png,.webp",
    endpoint: "/api/file-ops/image-to-pdf",
    fields: [],
  },
  {
    id: "compress-image",
    name: "Compress Image",
    description: "Reduce image file size",
    icon: Minimize2,
    color: "bg-emerald-500",
    accepts: ".jpg,.jpeg,.png,.webp",
    endpoint: "/api/file-ops/compress-image",
    fields: [{ name: "quality", label: "Quality (%)", type: "text", placeholder: "80" }],
  },
  {
    id: "resize-image",
    name: "Resize Image",
    description: "Change image dimensions",
    icon: Maximize2,
    color: "bg-sky-500",
    accepts: ".jpg,.jpeg,.png,.webp",
    endpoint: "/api/file-ops/resize-image",
    fields: [
      { name: "width", label: "Width (pixels)", type: "text", placeholder: "800" },
      { name: "height", label: "Height (pixels, optional)", type: "text", placeholder: "600" },
    ],
  },
  {
    id: "rotate-image",
    name: "Rotate Image",
    description: "Rotate an image",
    icon: RotateCw,
    color: "bg-violet-500",
    accepts: ".jpg,.jpeg,.png,.webp",
    endpoint: "/api/file-ops/rotate-image",
    fields: [
      {
        name: "degrees",
        label: "Rotation",
        type: "select",
        options: [
          { value: "90", label: "90 degrees" },
          { value: "180", label: "180 degrees" },
          { value: "270", label: "270 degrees" },
        ],
      },
    ],
  },
  {
    id: "convert-format",
    name: "Convert Format",
    description: "Convert between image formats",
    icon: RefreshCw,
    color: "bg-fuchsia-500",
    accepts: ".jpg,.jpeg,.png,.webp",
    endpoint: "/api/file-ops/convert-image-format",
    fields: [
      {
        name: "format",
        label: "Target Format",
        type: "select",
        options: [
          { value: "jpeg", label: "JPEG" },
          { value: "png", label: "PNG" },
          { value: "webp", label: "WebP" },
        ],
      },
    ],
  },
];

interface ConversionJob {
  id: string;
  fileName: string;
  tool: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  downloadUrl?: string;
  error?: string;
}

function ToolCard({ tool, onSelect }: { tool: Tool; onSelect: (tool: Tool) => void }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="cursor-pointer"
    >
      <Card
        className="h-full hover-elevate"
        onClick={() => onSelect(tool)}
        data-testid={`tool-card-${tool.id}`}
      >
        <CardContent className="flex flex-col items-center justify-center p-6 text-center">
          <div className={`p-4 rounded-xl ${tool.color} mb-4`}>
            <tool.icon className="h-8 w-8 text-white" />
          </div>
          <h3 className="font-semibold mb-1">{tool.name}</h3>
          <p className="text-sm text-muted-foreground">{tool.description}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ToolDialog({
  tool,
  open,
  onOpenChange,
  onProcess,
  isProcessing,
}: {
  tool: Tool | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProcess: (files: FileList, formData: Record<string, string>) => void;
  isProcessing: boolean;
}) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);

  const handleProcess = () => {
    if (files) {
      onProcess(files, formData);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      setFiles(e.dataTransfer.files);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {tool && (
              <>
                <div className={`p-2 rounded-lg ${tool.color}`}>
                  <tool.icon className="h-5 w-5 text-white" />
                </div>
                {tool.name}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById("tool-file-input")?.click()}
          >
            {files && files.length > 0 ? (
              <div className="space-y-2">
                {Array.from(files).map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 justify-center">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{file.name}</span>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFiles(null);
                  }}
                >
                  <X className="h-4 w-4 mr-1" /> Clear
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium text-sm mb-1">Drop files here</p>
                <p className="text-xs text-muted-foreground">or click to browse</p>
              </>
            )}
            <input
              id="tool-file-input"
              type="file"
              className="hidden"
              accept={tool?.accepts}
              multiple={tool?.id === "merge" || tool?.id === "images-to-pdf"}
              onChange={(e) => setFiles(e.target.files)}
              data-testid="input-tool-file"
            />
          </div>

          {tool?.fields?.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              {field.type === "select" ? (
                <Select
                  value={formData[field.name] || ""}
                  onValueChange={(val) => setFormData({ ...formData, [field.name]: val })}
                >
                  <SelectTrigger data-testid={`select-${field.name}`}>
                    <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={field.name}
                  placeholder={field.placeholder}
                  value={formData[field.name] || ""}
                  onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                  data-testid={`input-${field.name}`}
                />
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleProcess}
            disabled={!files || files.length === 0 || isProcessing}
            className="gradient-bg text-white"
            data-testid="button-process"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Process
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ConvertPage() {
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [jobs, setJobs] = useState<ConversionJob[]>([]);
  const { toast } = useToast();

  const processMutation = useMutation({
    mutationFn: async ({
      tool,
      files,
      formData,
    }: {
      tool: Tool;
      files: FileList;
      formData: Record<string, string>;
    }) => {
      const body = new FormData();

      if (tool.id === "merge" && files.length > 1) {
        Array.from(files).forEach((file) => body.append("files", file));
      } else {
        body.append("file", files[0]);
      }

      Object.entries(formData).forEach(([key, value]) => {
        if (value) body.append(key, value);
      });

      const response = await fetch(tool.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Processing failed");
      }
      return response.json();
    },
    onMutate: ({ tool, files }) => {
      const jobId = Date.now().toString();
      const newJob: ConversionJob = {
        id: jobId,
        fileName: files.length > 1 ? `${files.length} files` : files[0].name,
        tool: tool.name,
        status: "processing",
        progress: 0,
      };
      setJobs((prev) => [newJob, ...prev]);

      const interval = setInterval(() => {
        setJobs((prev) =>
          prev.map((job) =>
            job.id === jobId && job.status === "processing"
              ? { ...job, progress: Math.min(job.progress + 15, 90) }
              : job
          )
        );
      }, 300);

      return { jobId, interval };
    },
    onSuccess: (data, _, context) => {
      if (context?.interval) clearInterval(context.interval);
      setJobs((prev) =>
        prev.map((job) =>
          job.id === context?.jobId
            ? { ...job, status: "completed", progress: 100, downloadUrl: data.downloadUrl }
            : job
        )
      );
      toast({ title: "Processing completed!" });
      setDialogOpen(false);
      setSelectedTool(null);
    },
    onError: (error, _, context) => {
      if (context?.interval) clearInterval(context.interval);
      setJobs((prev) =>
        prev.map((job) =>
          job.id === context?.jobId
            ? { ...job, status: "failed", progress: 0, error: (error as Error).message }
            : job
        )
      );
      toast({ title: "Processing failed", description: (error as Error).message, variant: "destructive" });
    },
  });

  const handleToolSelect = (tool: Tool) => {
    setSelectedTool(tool);
    setDialogOpen(true);
  };

  const handleProcess = (files: FileList, formData: Record<string, string>) => {
    if (selectedTool) {
      processMutation.mutate({ tool: selectedTool, files, formData });
    }
  };

  const handleDownload = async (downloadUrl: string, fileName: string) => {
    const token = localStorage.getItem("token");
    const response = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">PDF & Image Tools</h1>
        <p className="text-muted-foreground">
          Professional document processing tools - merge, split, convert, and more
        </p>
      </div>

      <Tabs defaultValue="pdf" className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
          <TabsTrigger value="pdf" className="flex items-center gap-2" data-testid="tab-pdf">
            <FileText className="h-4 w-4" />
            PDF Tools
          </TabsTrigger>
          <TabsTrigger value="image" className="flex items-center gap-2" data-testid="tab-image">
            <Image className="h-4 w-4" />
            Image Tools
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pdf">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {pdfTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} onSelect={handleToolSelect} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="image">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {imageTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} onSelect={handleToolSelect} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <ToolDialog
        tool={selectedTool}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onProcess={handleProcess}
        isProcessing={processMutation.isPending}
      />

      {jobs.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Processing History
            </CardTitle>
            <CardDescription>Your recent file operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {jobs.map((job) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 p-4 rounded-lg bg-muted/50"
                data-testid={`job-row-${job.id}`}
              >
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{job.fileName}</p>
                  <p className="text-xs text-muted-foreground">{job.tool}</p>
                  {job.status === "processing" && <Progress value={job.progress} className="h-1 mt-2" />}
                  {job.error && <p className="text-xs text-destructive mt-1">{job.error}</p>}
                </div>

                {job.status === "completed" && job.downloadUrl && (
                  <Button
                    size="sm"
                    onClick={() => handleDownload(job.downloadUrl!, `processed-${job.fileName}`)}
                    data-testid={`button-download-${job.id}`}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                )}

                {job.status === "processing" && <Loader2 className="h-5 w-5 animate-spin text-primary" />}

                {job.status === "completed" && (
                  <div className="p-1.5 rounded-full bg-green-500">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}

                {job.status === "failed" && (
                  <div className="p-1.5 rounded-full bg-destructive">
                    <X className="h-3 w-3 text-white" />
                  </div>
                )}
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
