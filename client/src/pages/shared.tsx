import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Share2,
  Copy,
  Check,
  Clock,
  FileText,
  FolderOpen,
  Plus,
  Trash2,
  Eye,
  Edit2,
  Users,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ShareCode } from "@shared/schema";

export default function SharedPage() {
  const [accessCode, setAccessCode] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSharePermission, setNewSharePermission] = useState<"VIEW" | "EDIT">("VIEW");
  const { toast } = useToast();

  const { data: myShares, isLoading: mySharesLoading } = useQuery<ShareCode[]>({
    queryKey: ["/api/shares/created"],
  });

  const { data: sharedWithMe, isLoading: sharedWithMeLoading } = useQuery<ShareCode[]>({
    queryKey: ["/api/shares/received"],
  });

  const accessMutation = useMutation({
    mutationFn: async (code: string) => {
      return apiRequest("POST", "/api/shares/access", { code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shares/received"] });
      toast({ title: "Access granted!", description: "You can now view the shared content." });
      setAccessCode("");
    },
    onError: () => {
      toast({ title: "Invalid code", description: "Please check the code and try again.", variant: "destructive" });
    },
  });

  const deleteShareMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/shares/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shares/created"] });
      toast({ title: "Share link deleted" });
    },
  });

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({ title: "Code copied to clipboard" });
  };

  const formatExpiry = (date: Date | null) => {
    if (!date) return "Never expires";
    const d = new Date(date);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return "Expired";
    if (days === 0) return "Expires today";
    if (days === 1) return "Expires tomorrow";
    return `Expires in ${days} days`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Sharing</h1>
          <p className="text-muted-foreground mt-1">
            Manage shared files and access shared content
          </p>
        </div>
        <Button
          className="gradient-bg text-white"
          onClick={() => setShowCreateDialog(true)}
          data-testid="button-create-share"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Share Link
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Access Shared Content
          </CardTitle>
          <CardDescription>
            Enter a 6-digit code to access shared files or folders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 max-w-md">
            <Input
              placeholder="Enter 6-digit code"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase().slice(0, 6))}
              className="font-mono text-lg tracking-widest text-center"
              maxLength={6}
              data-testid="input-access-code"
            />
            <Button
              onClick={() => accessMutation.mutate(accessCode)}
              disabled={accessCode.length !== 6 || accessMutation.isPending}
              className="gradient-bg text-white"
              data-testid="button-access-share"
            >
              {accessMutation.isPending ? "Accessing..." : "Access"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="created" className="w-full">
        <TabsList>
          <TabsTrigger value="created" className="gap-2" data-testid="tab-created">
            <Share2 className="h-4 w-4" />
            Created by Me
          </TabsTrigger>
          <TabsTrigger value="received" className="gap-2" data-testid="tab-received">
            <Users className="h-4 w-4" />
            Shared with Me
          </TabsTrigger>
        </TabsList>

        <TabsContent value="created" className="mt-6">
          {mySharesLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-8 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : myShares?.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Share2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">No shares created</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Share files or folders to collaborate with others
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Share Link
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {myShares?.map((share) => (
                <motion.div
                  key={share.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card data-testid={`share-card-${share.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${share.folderId ? "bg-chart-3" : "bg-primary"}`}>
                          {share.folderId ? (
                            <FolderOpen className="h-5 w-5 text-white" />
                          ) : (
                            <FileText className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xl font-bold tracking-widest">
                              {share.code}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyCode(share.code)}
                              data-testid={`button-copy-${share.id}`}
                            >
                              {copiedCode === share.code ? (
                                <Check className="h-4 w-4 text-accent" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={share.permission === "VIEW" ? "secondary" : "default"}>
                              {share.permission === "VIEW" ? (
                                <Eye className="h-3 w-3 mr-1" />
                              ) : (
                                <Edit2 className="h-3 w-3 mr-1" />
                              )}
                              {share.permission}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatExpiry(share.expiresAt)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Used {share.usageCount} times
                            {share.maxUsages && ` / ${share.maxUsages} max`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteShareMutation.mutate(share.id)}
                          data-testid={`button-delete-${share.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="received" className="mt-6">
          {sharedWithMeLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-8 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sharedWithMe?.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">No shared content</h3>
              <p className="text-muted-foreground text-sm">
                Enter an access code above to view shared files
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sharedWithMe?.map((share) => (
                <motion.div
                  key={share.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="hover-elevate cursor-pointer" data-testid={`received-share-${share.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${share.folderId ? "bg-chart-3" : "bg-primary"}`}>
                          {share.folderId ? (
                            <FolderOpen className="h-5 w-5 text-white" />
                          ) : (
                            <FileText className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">
                            Shared {share.folderId ? "Folder" : "Document"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary">
                              {share.permission === "VIEW" ? (
                                <Eye className="h-3 w-3 mr-1" />
                              ) : (
                                <Edit2 className="h-3 w-3 mr-1" />
                              )}
                              {share.permission}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Share Link</DialogTitle>
            <DialogDescription>
              Generate a 6-digit code to share files or folders
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Permission Level</label>
              <Select value={newSharePermission} onValueChange={(v) => setNewSharePermission(v as "VIEW" | "EDIT")}>
                <SelectTrigger data-testid="select-permission">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIEW">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      View Only
                    </div>
                  </SelectItem>
                  <SelectItem value="EDIT">
                    <div className="flex items-center gap-2">
                      <Edit2 className="h-4 w-4" />
                      Can Edit
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              First select a file or folder from My Files, then create a share link for it.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button className="gradient-bg text-white" data-testid="button-confirm-share">
              Create Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
