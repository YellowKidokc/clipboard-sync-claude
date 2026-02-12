import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Folder {
  id: string;
  name: string;
  pathTemplate?: string | null;
}

interface ClipItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function FoldersPage() {
  const { toast } = useToast();
  const { data } = useQuery<{ items: Folder[] }>({ queryKey: ["/api/folders"] });
  const folders = data?.items || [];
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [newName, setNewName] = useState("");

  const { data: clipsData } = useQuery<{ items: any[] }>({
    queryKey: selectedFolder ? [`/api/folders/${selectedFolder.id}/clips`] : ["/api/folders/none"],
    enabled: Boolean(selectedFolder),
  });

  const createFolder = async () => {
    if (!newName.trim()) return;
    try {
      await apiRequest("POST", "/api/folders", { name: newName });
      setNewName("");
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      toast({ title: "Folder created" });
    } catch {
      toast({ title: "Failed to create folder", variant: "destructive" });
    }
  };

  const deleteFolder = async (id: string) => {
    try {
      await apiRequest("DELETE", `/api/folders/${id}`);
      if (selectedFolder?.id === id) setSelectedFolder(null);
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      toast({ title: "Folder deleted" });
    } catch {
      toast({ title: "Failed to delete folder", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Folders & Collections</h1>
          <p className="text-sm text-muted-foreground">Organize clips into dynamic folders.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="New folder name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Button onClick={createFolder}>Add</Button>
              </div>

              <div className="space-y-2">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                      selectedFolder?.id === folder.id ? "border-primary" : "border-border"
                    }`}
                    onClick={() => setSelectedFolder(folder)}
                  >
                    <div>
                      <p className="font-medium">{folder.name}</p>
                      {folder.pathTemplate && (
                        <p className="text-xs text-muted-foreground">{folder.pathTemplate}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}>
                      Delete
                    </Button>
                  </div>
                ))}
                {folders.length === 0 && (
                  <p className="text-sm text-muted-foreground">No folders yet.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardContent className="p-4 space-y-3">
              <h2 className="text-lg font-semibold">Folder Clips</h2>
              {!selectedFolder && (
                <p className="text-sm text-muted-foreground">Select a folder to view clips.</p>
              )}
              {selectedFolder && (
                <div className="space-y-2">
                  {(clipsData?.items || []).map((clip: any) => (
                    <div key={clip.id} className="rounded-md border px-3 py-2">
                      <p className="text-sm font-medium">{clip.title || clip.text_content?.slice(0, 80) || "Untitled"}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{clip.text_content || clip.content || ""}</p>
                    </div>
                  ))}
                  {clipsData && clipsData.items?.length === 0 && (
                    <p className="text-sm text-muted-foreground">No clips in this folder.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
