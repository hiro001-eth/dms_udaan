import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Search, 
  FileText, 
  Image, 
  File, 
  Filter, 
  X, 
  Download, 
  Calendar,
  HardDrive,
  Loader2,
  ChevronDown
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { Document } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";

const fileTypeOptions = [
  { value: "", label: "All Types" },
  { value: "application/pdf", label: "PDF Documents" },
  { value: "image/jpeg", label: "JPEG Images" },
  { value: "image/png", label: "PNG Images" },
  { value: "image/webp", label: "WebP Images" },
  { value: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "Word Documents" },
  { value: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", label: "Excel Spreadsheets" },
  { value: "text/plain", label: "Text Files" },
  { value: "text/csv", label: "CSV Files" },
];

const sizeOptions = [
  { value: "", label: "Any Size" },
  { value: "small", label: "Small (< 1MB)", min: 0, max: 1024 * 1024 },
  { value: "medium", label: "Medium (1-10MB)", min: 1024 * 1024, max: 10 * 1024 * 1024 },
  { value: "large", label: "Large (10-100MB)", min: 10 * 1024 * 1024, max: 100 * 1024 * 1024 },
  { value: "xlarge", label: "Very Large (> 100MB)", min: 100 * 1024 * 1024, max: undefined },
];

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image className="h-5 w-5 text-purple-500" />;
  if (mimeType === "application/pdf") return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-blue-500" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function SearchPage() {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [mimeType, setMimeType] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const sizeRange = sizeOptions.find(s => s.value === sizeFilter);

  const buildSearchParams = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (mimeType) params.set("mimeType", mimeType);
    if (sizeRange?.min) params.set("minSize", sizeRange.min.toString());
    if (sizeRange?.max) params.set("maxSize", sizeRange.max.toString());
    if (startDate) params.set("startDate", startDate.toISOString());
    if (endDate) params.set("endDate", endDate.toISOString());
    return params.toString();
  };

  const searchParams = buildSearchParams();
  const { data: results, isLoading, refetch, error } = useQuery<Document[]>({
    queryKey: ["/api/search", searchParams],
    queryFn: async () => {
      const url = searchParams ? `/api/search?${searchParams}` : "/api/search";
      const res = await apiRequest("GET", url);
      return res.json();
    },
    enabled: hasSearched,
  });

  const handleSearch = () => {
    setHasSearched(true);
    refetch();
  };

  const clearFilters = () => {
    setSearchQuery("");
    setMimeType("");
    setSizeFilter("");
    setStartDate(undefined);
    setEndDate(undefined);
    setHasSearched(false);
  };

  const activeFiltersCount = [mimeType, sizeFilter, startDate, endDate].filter(Boolean).length;

  const handleDownload = async (doc: Document) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.originalName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Search Documents</h1>
        <p className="text-muted-foreground">Find files across your document library</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by file name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Button onClick={handleSearch} data-testid="button-search">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-toggle-filters">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-2">{activeFiltersCount}</Badge>
                  )}
                  <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${isFiltersOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              {(activeFiltersCount > 0 || searchQuery) && (
                <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            <CollapsibleContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    File Type
                  </label>
                  <Select value={mimeType} onValueChange={setMimeType}>
                    <SelectTrigger data-testid="select-file-type">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      {fileTypeOptions.map((opt) => (
                        <SelectItem key={opt.value || "all"} value={opt.value || "all"}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    File Size
                  </label>
                  <Select value={sizeFilter} onValueChange={setSizeFilter}>
                    <SelectTrigger data-testid="select-file-size">
                      <SelectValue placeholder="Any Size" />
                    </SelectTrigger>
                    <SelectContent>
                      {sizeOptions.map((opt) => (
                        <SelectItem key={opt.value || "any"} value={opt.value || "any"}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    From Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start" data-testid="button-start-date">
                        {startDate ? format(startDate, "MMM d, yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    To Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start" data-testid="button-end-date">
                        {endDate ? format(endDate, "MMM d, yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {hasSearched && !isLoading && results && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-4 flex-wrap">
              <span>Search Results</span>
              <Badge variant="outline">{results.length} files found</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No documents found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover-elevate"
                    data-testid={`search-result-${doc.id}`}
                  >
                    <div className="p-2 rounded-lg bg-background">
                      {getFileIcon(doc.mimeType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.originalName}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatFileSize(doc.sizeBytes)}</span>
                        <span>{format(new Date(doc.uploadedAt), "MMM d, yyyy")}</span>
                        <Badge variant="outline" className="text-xs">
                          {doc.mimeType.split("/").pop()?.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(doc)}
                      data-testid={`button-download-${doc.id}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!hasSearched && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Enter a search term or apply filters</p>
          <p className="text-sm">Click Search to find documents</p>
        </div>
      )}
    </div>
  );
}
