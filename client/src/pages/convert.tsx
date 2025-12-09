import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  FileText,
  Image,
  FileSpreadsheet,
  Upload,
  ArrowRight,
  Download,
  RefreshCw,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

type ConversionFormat = {
  id: string;
  name: string;
  extension: string;
  icon: typeof FileText;
  color: string;
  accepts: string[];
};

const formats: ConversionFormat[] = [
  { id: "pdf", name: "PDF", extension: ".pdf", icon: FileText, color: "bg-destructive", accepts: ["docx", "jpg", "png", "xlsx"] },
  { id: "jpg", name: "JPG Image", extension: ".jpg", icon: Image, color: "bg-accent", accepts: ["pdf", "png", "webp"] },
  { id: "png", name: "PNG Image", extension: ".png", icon: Image, color: "bg-chart-4", accepts: ["pdf", "jpg", "webp"] },
  { id: "docx", name: "Word Document", extension: ".docx", icon: FileText, color: "bg-primary", accepts: ["pdf", "txt"] },
  { id: "xlsx", name: "Excel Spreadsheet", extension: ".xlsx", icon: FileSpreadsheet, color: "bg-chart-4", accepts: ["csv", "pdf"] },
  { id: "csv", name: "CSV", extension: ".csv", icon: FileSpreadsheet, color: "bg-chart-2", accepts: ["xlsx"] },
];

interface ConversionJob {
  id: string;
  fileName: string;
  sourceFormat: string;
  targetFormat: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  downloadUrl?: string;
}

export default function ConvertPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceFormat, setSourceFormat] = useState<string>("");
  const [targetFormat, setTargetFormat] = useState<string>("");
  const [jobs, setJobs] = useState<ConversionJob[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const convertMutation = useMutation({
    mutationFn: async ({ file, target }: { file: File; target: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("targetFormat", target);

      const response = await fetch("/api/convert", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Conversion failed");
      return response.json();
    },
    onMutate: () => {
      if (!selectedFile) return;
      const jobId = Date.now().toString();
      const newJob: ConversionJob = {
        id: jobId,
        fileName: selectedFile.name,
        sourceFormat,
        targetFormat,
        status: "processing",
        progress: 0,
      };
      setJobs((prev) => [newJob, ...prev]);

      const interval = setInterval(() => {
        setJobs((prev) =>
          prev.map((job) =>
            job.id === jobId && job.status === "processing"
              ? { ...job, progress: Math.min(job.progress + 10, 90) }
              : job
          )
        );
      }, 500);

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
      toast({ title: "Conversion completed!" });
      setSelectedFile(null);
      setSourceFormat("");
      setTargetFormat("");
    },
    onError: (_, __, context) => {
      if (context?.interval) clearInterval(context.interval);
      setJobs((prev) =>
        prev.map((job) =>
          job.id === context?.jobId ? { ...job, status: "failed", progress: 0 } : job
        )
      );
      toast({ title: "Conversion failed", variant: "destructive" });
    },
  });

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const format = formats.find((f) => f.extension.slice(1) === ext);
    if (format) {
      setSourceFormat(format.id);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const availableTargets = sourceFormat
    ? formats.filter((f) => f.accepts.includes(sourceFormat) && f.id !== sourceFormat)
    : [];

  const getFormatIcon = (formatId: string) => {
    const format = formats.find((f) => f.id === formatId);
    return format ? { Icon: format.icon, color: format.color } : { Icon: FileText, color: "bg-muted" };
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">File Converter</h1>
        <p className="text-muted-foreground">
          Convert your files between different formats with high quality
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Convert Files
          </CardTitle>
          <CardDescription>
            Supported: PDF, JPG, PNG, DOCX, XLSX, CSV
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById("convert-file-input")?.click()}
          >
            {selectedFile ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-4"
              >
                <div className={`p-4 rounded-lg ${getFormatIcon(sourceFormat).color}`}>
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setSourceFormat("");
                    setTargetFormat("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            ) : (
              <>
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="font-medium mb-1">Drop your file here</p>
                <p className="text-sm text-muted-foreground">or click to browse</p>
              </>
            )}
            <input
              id="convert-file-input"
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx,.csv"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              data-testid="input-convert-file"
            />
          </div>

          {selectedFile && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 justify-center flex-wrap"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">From:</span>
                <Select value={sourceFormat} onValueChange={setSourceFormat}>
                  <SelectTrigger className="w-40" data-testid="select-source-format">
                    <SelectValue placeholder="Source format" />
                  </SelectTrigger>
                  <SelectContent>
                    {formats.map((format) => (
                      <SelectItem key={format.id} value={format.id}>
                        <div className="flex items-center gap-2">
                          <format.icon className="h-4 w-4" />
                          {format.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ArrowRight className="h-5 w-5 text-muted-foreground" />

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">To:</span>
                <Select
                  value={targetFormat}
                  onValueChange={setTargetFormat}
                  disabled={!sourceFormat || availableTargets.length === 0}
                >
                  <SelectTrigger className="w-40" data-testid="select-target-format">
                    <SelectValue placeholder="Target format" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTargets.map((format) => (
                      <SelectItem key={format.id} value={format.id}>
                        <div className="flex items-center gap-2">
                          <format.icon className="h-4 w-4" />
                          {format.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() =>
                  selectedFile && convertMutation.mutate({ file: selectedFile, target: targetFormat })
                }
                disabled={!targetFormat || convertMutation.isPending}
                className="gradient-bg text-white"
                data-testid="button-convert"
              >
                {convertMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Convert
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {jobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conversion History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {jobs.map((job) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-4 p-4 rounded-lg bg-muted/50"
                data-testid={`job-${job.id}`}
              >
                <div className={`p-2 rounded-lg ${getFormatIcon(job.sourceFormat).color}`}>
                  <FileText className="h-5 w-5 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{job.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {job.sourceFormat.toUpperCase()} → {job.targetFormat.toUpperCase()}
                  </p>
                  {job.status === "processing" && (
                    <Progress value={job.progress} className="h-1 mt-2" />
                  )}
                </div>

                {job.status === "completed" && (
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-accent">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                )}

                {job.status === "processing" && (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
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

      <Card>
        <CardHeader>
          <CardTitle>Supported Conversions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {formats.map((format) => (
              <div
                key={format.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
              >
                <div className={`p-2 rounded-lg ${format.color}`}>
                  <format.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sm">{format.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Can convert to: {format.accepts.join(", ").toUpperCase()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
