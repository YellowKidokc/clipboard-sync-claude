import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SettingsPage } from "@/components/settings-page";
import { 
  Clipboard, 
  Copy, 
  Check, 
  Pin, 
  Trash2, 
  Search, 
  Plus, 
  Tag,
  Star,
  FileText,
  Code,
  Settings,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Keyboard,
  RotateCcw,
  Save,
  MoreVertical,
  Inbox,
  Archive,
  Hash,
  Bot,
  Send,
  Loader2,
  MessageSquare,
  Zap,
  Lock,
  Globe,
  Key,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Link,
  CreditCard,
  X,
  GripVertical,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AppNav } from "@/components/app-nav";

interface StructuredField {
  id: string;
  label: string;
  value: string;
  type: "text" | "password" | "url" | "email" | "phone" | "date" | "api_key";
  icon: string;
}

interface ApiClip {
  id: string;
  content_type: string;
  text_content: string | null;
  blob_url: string | null;
  tags: string[];
  title?: string;
  category?: ClipItem["category"];
  structured?: boolean;
  structured_fields?: StructuredField[];
  folder_id?: string | null;
  is_pinned: boolean;
  is_starred: boolean;
  is_deleted: boolean;
  hotkey_slot?: number | null;
  created_at: string;
  updated_at?: string | null;
}

interface ClipItem {
  id: string;
  title: string;
  content: string;
  timestamp: Date;
  pinned: boolean;
  starred: boolean;
  category: "clipboard" | "notes" | "snippets" | "prompts";
  tags: string[];
  deleted: boolean;
  isStructured: boolean;
  fields: StructuredField[];
}

function deriveTitleFromContent(text: string) {
  const first = text.split("\n").find((line) => line.trim().length > 0);
  return first ? first.slice(0, 80) : "Untitled";
}

function mapApiClip(clip: ApiClip): ClipItem {
  const content = clip.text_content || "";
  return {
    id: clip.id,
    title: clip.title || deriveTitleFromContent(content),
    content,
    timestamp: new Date(clip.created_at),
    pinned: clip.is_pinned,
    starred: clip.is_starred,
    category: clip.category || "clipboard",
    tags: clip.tags || [],
    deleted: clip.is_deleted,
    isStructured: Boolean(clip.structured) || (clip.structured_fields?.length ?? 0) > 0,
    fields: clip.structured_fields || [],
  };
}

function buildTagsPayload(clip: ClipItem) {
  return {
    labels: clip.tags,
    title: clip.title,
    category: clip.category,
    structured: clip.isStructured,
    fields: clip.fields,
  };
}

interface HotkeyConfig {
  id: string;
  action: string;
  keys: string;
  enabled: boolean;
}

interface AIWorkflow {
  id: string;
  command: string;
  name: string;
  prompt: string;
  icon: typeof Zap;
}

const fieldIcons: Record<string, typeof Key> = {
  text: FileText,
  password: Lock,
  url: Globe,
  email: Mail,
  phone: Phone,
  date: Calendar,
  api_key: Key,
};

const initialClips: ClipItem[] = [
  {
    id: "1",
    title: "API Endpoint",
    content: "https://api.example.com/v2/clipboard/sync",
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
    pinned: true,
    starred: true,
    category: "clipboard",
    tags: ["work", "api"],
    deleted: false,
    isStructured: false,
    fields: []
  },
  {
    id: "2", 
    title: "Install Command",
    content: "npm install @clipto/desktop --save\nyarn add @clipto/desktop",
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    pinned: false,
    starred: false,
    category: "snippets",
    tags: ["code"],
    deleted: false,
    isStructured: false,
    fields: []
  },
  {
    id: "3",
    title: "Meeting Notes - Jan 9",
    content: "Discussed API integration for Synology NAS.\n\n- Need WebSocket connection for real-time sync\n- Consider Cloudflare Workers for edge deployment\n- Review security requirements\n- Test on Android device",
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    pinned: false,
    starred: true,
    category: "notes",
    tags: ["meeting", "synology"],
    deleted: false,
    isStructured: false,
    fields: []
  },
  {
    id: "4",
    title: "Synology NAS Credentials",
    content: "",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    pinned: true,
    starred: false,
    category: "clipboard",
    tags: ["network", "credentials"],
    deleted: false,
    isStructured: true,
    fields: [
      { id: "f1", label: "Host", value: "192.168.1.100", type: "text", icon: "text" },
      { id: "f2", label: "Port", value: "5000", type: "text", icon: "text" },
      { id: "f3", label: "Username", value: "admin", type: "text", icon: "text" },
      { id: "f4", label: "Password", value: "••••••••", type: "password", icon: "password" },
      { id: "f5", label: "API Key", value: "sk-xxxxx-xxxxx", type: "api_key", icon: "api_key" },
    ]
  },
  {
    id: "5",
    title: "SQL Query",
    content: "SELECT * FROM clipboard_items\nWHERE user_id = ?\nORDER BY created_at DESC\nLIMIT 100;",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    pinned: false,
    starred: false,
    category: "snippets",
    tags: ["sql", "database"],
    deleted: false,
    isStructured: false,
    fields: []
  },
  {
    id: "p1",
    title: "Summarize Content",
    content: "You are a helpful assistant. Summarize the following content in a clear, concise manner. Focus on key points and actionable items.\n\n{{content}}",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
    pinned: true,
    starred: false,
    category: "prompts",
    tags: ["ai", "summary"],
    deleted: false,
    isStructured: false,
    fields: []
  },
  {
    id: "p2",
    title: "Code Review",
    content: "Review the following code for bugs, security issues, and best practices. Provide specific suggestions for improvement.\n\n{{code}}",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
    pinned: false,
    starred: true,
    category: "prompts",
    tags: ["ai", "code"],
    deleted: false,
    isStructured: false,
    fields: []
  },
  {
    id: "p3",
    title: "Email Writer",
    content: "Write a professional email based on the following context. Keep it concise and friendly.\n\nContext: {{context}}\nTone: {{tone}}",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
    pinned: false,
    starred: false,
    category: "prompts",
    tags: ["ai", "email"],
    deleted: false,
    isStructured: false,
    fields: []
  },
];

const defaultHotkeys: HotkeyConfig[] = [
  { id: "1", action: "Show/Hide App", keys: "ctrl+shift+e", enabled: true },
  { id: "2", action: "Notes from Clipboard", keys: "ctrl+shift+p", enabled: true },
  { id: "3", action: "Toggle AI Chat", keys: "ctrl+space", enabled: true },
  { id: "4", action: "New Note", keys: "ctrl+n", enabled: true },
  { id: "5", action: "Save Note", keys: "ctrl+s", enabled: true },
  { id: "6", action: "Delete Note", keys: "ctrl+del", enabled: true },
  { id: "7", action: "Search Notes", keys: "ctrl+f", enabled: true },
  { id: "8", action: "Next Note", keys: "down", enabled: true },
  { id: "9", action: "Previous Note", keys: "up", enabled: true },
];

const aiWorkflows: AIWorkflow[] = [
  { id: "w1", command: "/summarize", name: "Summarize", prompt: "Summarize this content concisely", icon: FileText },
  { id: "w2", command: "/improve", name: "Improve Writing", prompt: "Improve the writing quality of this text", icon: Sparkles },
  { id: "w3", command: "/tags", name: "Suggest Tags", prompt: "Suggest relevant tags for this content", icon: Tag },
  { id: "w4", command: "/code", name: "Code Review", prompt: "Review this code for issues", icon: Code },
  { id: "w5", command: "/email", name: "Draft Email", prompt: "Draft a professional email", icon: Mail },
  { id: "w6", command: "/ideas", name: "Brainstorm", prompt: "Generate ideas related to this topic", icon: Lightbulb },
];

type SidebarCategory = "notes" | "all" | "starred" | "untagged" | "clipboard" | "snippets" | "prompts" | "tags" | "recycle";

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function ClipboardPage() {
  const [clips, setClips] = useState<ClipItem[]>(initialClips);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<SidebarCategory>("all");
  const [selectedClip, setSelectedClip] = useState<ClipItem | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [editingFields, setEditingFields] = useState<StructuredField[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tagsExpanded, setTagsExpanded] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showHotkeys, setShowHotkeys] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [hotkeys, setHotkeys] = useState<HotkeyConfig[]>(defaultHotkeys);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState<{role: "user" | "assistant", content: string}[]>([
    { role: "assistant", content: "Hi! I'm your AI assistant. I can help you work with your notes and clipboard. Try typing /summarize to see available workflows, or just ask me anything!" }
  ]);
  const [systemPrompt, setSystemPrompt] = useState("You are a helpful assistant that helps organize and manage clipboard content and notes. Be concise and helpful.");
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [showWorkflowMenu, setShowWorkflowMenu] = useState(false);
  const [filteredWorkflows, setFilteredWorkflows] = useState<AIWorkflow[]>([]);
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<StructuredField["type"]>("text");
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { data: clipsData, isLoading: clipsLoading } = useQuery<{ items: ApiClip[] }>({
    queryKey: ["/api/clips?limit=200&include_deleted=true"],
  });

  useEffect(() => {
    if (clipsData?.items) {
      setClips(clipsData.items.map(mapApiClip));
    }
  }, [clipsData]);

  const updateClipState = (updated: ClipItem) => {
    setClips((prev) => prev.map((clip) => (clip.id === updated.id ? updated : clip)));
    if (selectedClip?.id === updated.id) {
      setSelectedClip(updated);
    }
  };

  const createClipOnServer = async (payload: Record<string, unknown>) => {
    const res = await apiRequest("POST", "/api/clips", payload);
    const json = (await res.json()) as ApiClip;
    const mapped = mapApiClip(json);
    setClips((prev) => [mapped, ...prev]);
    queryClient.invalidateQueries({ queryKey: ["/api/clips?limit=200&include_deleted=true"] });
    return mapped;
  };

  const updateClipOnServer = async (id: string, payload: Record<string, unknown>) => {
    const res = await apiRequest("PUT", `/api/clips/${id}`, payload);
    const json = (await res.json()) as ApiClip;
    const mapped = mapApiClip(json);
    updateClipState(mapped);
    queryClient.invalidateQueries({ queryKey: ["/api/clips?limit=200&include_deleted=true"] });
    return mapped;
  };

  const allTags = Array.from(new Set(clips.flatMap(c => c.tags))).filter(Boolean);

  const filteredClips = clips.filter(clip => {
    const matchesSearch = clip.content.toLowerCase().includes(search.toLowerCase()) ||
                          clip.title.toLowerCase().includes(search.toLowerCase());
    
    switch (selectedCategory) {
      case "notes":
        return matchesSearch && clip.category === "notes" && !clip.deleted;
      case "all":
        return matchesSearch && !clip.deleted;
      case "starred":
        return matchesSearch && clip.starred && !clip.deleted;
      case "untagged":
        return matchesSearch && clip.tags.length === 0 && !clip.deleted;
      case "clipboard":
        return matchesSearch && clip.category === "clipboard" && !clip.deleted;
      case "snippets":
        return matchesSearch && clip.category === "snippets" && !clip.deleted;
      case "prompts":
        return matchesSearch && clip.category === "prompts" && !clip.deleted;
      case "recycle":
        return matchesSearch && clip.deleted;
      default:
        if (selectedCategory.startsWith("tag:")) {
          const tag = selectedCategory.replace("tag:", "");
          return matchesSearch && clip.tags.includes(tag) && !clip.deleted;
        }
        return matchesSearch && !clip.deleted;
    }
  }).sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  useEffect(() => {
    if (selectedClip) {
      setEditingContent(selectedClip.content);
      setEditingTitle(selectedClip.title);
      setEditingFields(selectedClip.fields);
    }
  }, [selectedClip]);

  useEffect(() => {
    if (aiPrompt.startsWith("/")) {
      const cmd = aiPrompt.toLowerCase();
      const matches = aiWorkflows.filter(w => w.command.startsWith(cmd));
      setFilteredWorkflows(matches);
      setShowWorkflowMenu(matches.length > 0);
    } else {
      setShowWorkflowMenu(false);
    }
  }, [aiPrompt]);

  const handleCopy = async (clip: ClipItem) => {
    let textToCopy = clip.content;
    if (clip.isStructured && clip.fields.length > 0) {
      textToCopy = clip.fields.map(f => `${f.label}: ${f.value}`).join("\n");
    }
    try {
      await navigator.clipboard.writeText(textToCopy);
      await apiRequest("POST", `/api/clips/${clip.id}/copy`);
      setCopiedId(clip.id);
      toast({ title: "Copied" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!selectedClip) return;
    const updatedClip: ClipItem = {
      ...selectedClip,
      content: editingContent,
      title: editingTitle,
      fields: editingFields,
      timestamp: new Date(),
    };
    try {
      await updateClipOnServer(selectedClip.id, {
        text_content: editingContent,
        tags: buildTagsPayload(updatedClip),
      });
      toast({ title: "Saved" });
    } catch (err) {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const updated = await updateClipOnServer(id, { is_deleted: true });
      setClips((prev) => prev.map((clip) => (clip.id === id ? updated : clip)));
      if (selectedClip?.id === id) setSelectedClip(null);
      toast({ title: "Moved to Recycle Bin" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const updated = await updateClipOnServer(id, { is_deleted: false });
      setClips((prev) => prev.map((clip) => (clip.id === id ? updated : clip)));
      toast({ title: "Restored" });
    } catch {
      toast({ title: "Failed to restore", variant: "destructive" });
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      await apiRequest("DELETE", `/api/clips/${id}`);
      setClips((prev) => prev.filter((clip) => clip.id !== id));
      if (selectedClip?.id === id) setSelectedClip(null);
      toast({ title: "Permanently deleted" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const handleStar = async (id: string) => {
    const target = clips.find((clip) => clip.id === id);
    if (!target) return;
    try {
      await updateClipOnServer(id, { is_starred: !target.starred, tags: buildTagsPayload(target) });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const handlePin = async (id: string) => {
    const target = clips.find((clip) => clip.id === id);
    if (!target) return;
    try {
      await updateClipOnServer(id, { is_pinned: !target.pinned, tags: buildTagsPayload(target) });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const handleNewNote = async (category: ClipItem["category"] = "notes", isStructured = false) => {
    const newClip: ClipItem = {
      id: Date.now().toString(),
      title: category === "prompts" ? "New Prompt" : isStructured ? "New Structured Note" : "Untitled Note",
      content: "",
      timestamp: new Date(),
      pinned: false,
      starred: false,
      category,
      tags: [],
      deleted: false,
      isStructured,
      fields: isStructured
        ? [{ id: "f1", label: "Field 1", value: "", type: "text", icon: "text" }]
        : [],
    };
    try {
      const created = await createClipOnServer({
        content_type: "text/plain",
        text_content: "",
        tags: buildTagsPayload(newClip),
        source: "manual",
      });
      setSelectedClip(created);
      setEditingTitle(created.title);
      setEditingContent(created.content);
      setEditingFields(created.fields);
      setShowAIChat(false);
    } catch {
      toast({ title: "Failed to create", variant: "destructive" });
    }
  };

  const handleAddField = () => {
    if (!newFieldLabel.trim()) return;
    const newField: StructuredField = {
      id: Date.now().toString(),
      label: newFieldLabel,
      value: "",
      type: newFieldType,
      icon: newFieldType
    };
    setEditingFields([...editingFields, newField]);
    setNewFieldLabel("");
    setNewFieldType("text");
    setShowAddField(false);
  };

  const handleRemoveField = (fieldId: string) => {
    setEditingFields(editingFields.filter(f => f.id !== fieldId));
  };

  const handleUpdateField = (fieldId: string, value: string) => {
    setEditingFields(editingFields.map(f => 
      f.id === fieldId ? { ...f, value } : f
    ));
  };

  const handleSelectWorkflow = async (workflow: AIWorkflow) => {
    setAiPrompt("");
    setShowWorkflowMenu(false);
    if (!selectedClip) {
      toast({ title: "Select a clip first", variant: "destructive" });
      return;
    }

    setAiMessages((prev) => [...prev, { role: "user", content: `${workflow.command} - ${workflow.name}` }]);
    setAiLoading(true);

    try {
      const workflowId = workflow.command.startsWith("/") ? workflow.command.slice(1) : workflow.command;
      const res = await apiRequest("POST", "/api/ai/workflow", {
        clip_id: selectedClip.id,
        workflow: workflowId,
      });
      const data = (await res.json()) as { output: string };
      setAiMessages((prev) => [...prev, { role: "assistant", content: data.output }]);
    } catch (err) {
      setAiMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Unable to run workflow. Check server connection." },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAISubmit = async () => {
    if (!aiPrompt.trim()) return;

    if (showWorkflowMenu && filteredWorkflows.length > 0) {
      handleSelectWorkflow(filteredWorkflows[0]);
      return;
    }

    const userMessage = aiPrompt;
    setAiMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setAiPrompt("");
    setAiLoading(true);

    try {
      const res = await apiRequest("POST", "/api/ai/chat", {
        message: userMessage,
        clip_id: selectedClip?.id,
      });
      const data = (await res.json()) as { response: string };
      setAiMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch {
      setAiMessages((prev) => [
        ...prev,
        { role: "assistant", content: "AI request failed. Check server connection." },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const getCategoryCount = (cat: SidebarCategory): number => {
    return clips.filter(clip => {
      switch (cat) {
        case "notes": return clip.category === "notes" && !clip.deleted;
        case "all": return !clip.deleted;
        case "starred": return clip.starred && !clip.deleted;
        case "untagged": return clip.tags.length === 0 && !clip.deleted;
        case "clipboard": return clip.category === "clipboard" && !clip.deleted;
        case "snippets": return clip.category === "snippets" && !clip.deleted;
        case "prompts": return clip.category === "prompts" && !clip.deleted;
        case "recycle": return clip.deleted;
        default: return false;
      }
    }).length;
  };

  const sidebarItems: { id: SidebarCategory; icon: typeof FileText; label: string }[] = [
    { id: "notes", icon: FileText, label: "Notes" },
    { id: "all", icon: Inbox, label: "All" },
    { id: "starred", icon: Star, label: "Starred" },
    { id: "untagged", icon: Archive, label: "Untagged" },
    { id: "clipboard", icon: Clipboard, label: "Clipboard" },
    { id: "snippets", icon: Code, label: "Snippets" },
    { id: "prompts", icon: MessageSquare, label: "Prompts" },
  ];

  const getFieldIcon = (type: StructuredField["type"]) => {
    const Icon = fieldIcons[type] || FileText;
    return <Icon className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav />
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-56 border-r border-border/50 bg-sidebar flex flex-col">
        <div className="p-3 border-b border-border/50">
          <div className="flex items-center gap-2 px-2">
            <div className="w-7 h-7 rounded-md bg-primary/20 flex items-center justify-center">
              <Clipboard className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-sm">ClipSync</span>
          </div>
        </div>

        {/* AI Chat Button */}
        <div className="p-2">
          <Button 
            onClick={() => {
              setShowAIChat(true);
              setSelectedClip(null);
            }}
            variant={showAIChat ? "default" : "outline"}
            className={cn(
              "w-full justify-start gap-2 h-9 text-sm",
              showAIChat && "glow-primary"
            )}
            size="sm"
            data-testid="button-ai-chat"
          >
            <Bot className="w-4 h-4" />
            AI Assistant
          </Button>
        </div>

        <Separator className="mx-2" />

        <div className="p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                className="w-full justify-start gap-2 h-8 text-sm"
                size="sm"
                data-testid="button-new-note"
              >
                <Plus className="w-4 h-4" />
                New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => handleNewNote("notes", false)}>
                <FileText className="w-4 h-4 mr-2" />
                New Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNewNote("notes", true)}>
                <CreditCard className="w-4 h-4 mr-2" />
                Structured Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNewNote("snippets", false)}>
                <Code className="w-4 h-4 mr-2" />
                New Snippet
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNewNote("prompts", false)}>
                <MessageSquare className="w-4 h-4 mr-2" />
                New Prompt
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {sidebarItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedCategory(item.id);
                  setShowAIChat(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                  selectedCategory === item.id && !showAIChat
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
                data-testid={`nav-${item.id}`}
              >
                <span className="flex items-center gap-2">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </span>
                <span className="text-xs opacity-60">{getCategoryCount(item.id)}</span>
              </button>
            ))}

            <Separator className="my-2" />

            {/* Tags Section */}
            <button
              onClick={() => setTagsExpanded(!tagsExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted/50"
            >
              <span className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags
              </span>
              {tagsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            <AnimatePresence>
              {tagsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="pl-4 space-y-1 overflow-hidden"
                >
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => {
                        setSelectedCategory(`tag:${tag}` as SidebarCategory);
                        setShowAIChat(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                        selectedCategory === `tag:${tag}`
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted/50"
                      )}
                      data-testid={`tag-${tag}`}
                    >
                      <Hash className="w-3 h-3" />
                      {tag}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <Separator className="my-2" />

            <button
              onClick={() => {
                setSelectedCategory("recycle");
                setShowAIChat(false);
              }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                selectedCategory === "recycle" && !showAIChat
                  ? "bg-destructive/10 text-destructive"
                  : "text-muted-foreground hover:bg-muted/50"
              )}
              data-testid="nav-recycle"
            >
              <span className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Recycle Bin
              </span>
              <span className="text-xs opacity-60">{getCategoryCount("recycle")}</span>
            </button>
          </div>
        </ScrollArea>

        {/* Settings buttons */}
        <div className="p-2 border-t border-border/50 space-y-1">
          <button
            onClick={() => setShowHotkeys(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted/50"
            data-testid="button-hotkeys"
          >
            <Keyboard className="w-4 h-4" />
            Hotkeys
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted/50"
            data-testid="button-settings"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </aside>

      {/* Middle Panel - Clip List */}
      <div className="w-80 border-r border-border/50 flex flex-col bg-card/30">
        <div className="p-3 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search your notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-background/50"
              data-testid="input-search"
            />
          </div>
        </div>

        <div className="px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
          <span className="capitalize">{selectedCategory.replace("tag:", "#")}</span>
          <span>{filteredClips.length} items</span>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredClips.map((clip) => (
              <motion.div
                key={clip.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  "p-3 rounded-lg cursor-pointer transition-all",
                  selectedClip?.id === clip.id && !showAIChat
                    ? "bg-primary/10 border border-primary/30" 
                    : "hover:bg-muted/50 border border-transparent"
                )}
                onClick={() => {
                  setSelectedClip(clip);
                  setShowAIChat(false);
                }}
                data-testid={`clip-item-${clip.id}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-medium text-sm truncate flex-1">
                    {clip.pinned && <Pin className="w-3 h-3 inline mr-1 text-primary" />}
                    {clip.isStructured && <CreditCard className="w-3 h-3 inline mr-1 text-accent" />}
                    {clip.title}
                  </h3>
                  {clip.starred && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {clip.isStructured 
                    ? `${clip.fields.length} fields` 
                    : clip.content}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {formatTimeAgo(clip.timestamp)}
                  </span>
                  {clip.tags.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px] h-4 px-1">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            ))}

            {clipsLoading && (
              <div className="py-12 text-center">
                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Loading clips...</p>
              </div>
            )}

            {!clipsLoading && filteredClips.length === 0 && (
              <div className="py-12 text-center">
                <Inbox className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No items found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Editor or AI Chat */}
      <div className="flex-1 flex flex-col">
        {showAIChat ? (
          /* AI Chat Interface */
          <div className="flex-1 flex flex-col">
            <div className="p-3 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">AI Assistant</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSystemPrompt(true)}
                className="text-xs"
              >
                <Settings className="w-4 h-4 mr-1" />
                System Prompt
              </Button>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-2xl mx-auto">
                {aiMessages.map((msg, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div className={cn(
                      "max-w-[80%] rounded-xl p-3 text-sm",
                      msg.role === "user" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted"
                    )}>
                      <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                    </div>
                  </motion.div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-xl p-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border/50">
              <div className="max-w-2xl mx-auto">
                {/* Workflow quick buttons */}
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                  {aiWorkflows.slice(0, 4).map(wf => (
                    <Button
                      key={wf.id}
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-xs"
                      onClick={() => handleSelectWorkflow(wf)}
                    >
                      <wf.icon className="w-3 h-3 mr-1" />
                      {wf.name}
                    </Button>
                  ))}
                </div>

                <div className="relative">
                  {/* Workflow menu */}
                  <AnimatePresence>
                    {showWorkflowMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full mb-2 left-0 right-0 bg-popover border rounded-lg shadow-lg p-2"
                      >
                        {filteredWorkflows.map(wf => (
                          <button
                            key={wf.id}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                            onClick={() => handleSelectWorkflow(wf)}
                          >
                            <wf.icon className="w-4 h-4 text-primary" />
                            <span className="font-mono text-xs text-muted-foreground">{wf.command}</span>
                            <span>{wf.name}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Ask AI or type / for workflows..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAISubmit();
                        }
                      }}
                      className="flex-1"
                      data-testid="input-ai"
                    />
                    <Button onClick={handleAISubmit} data-testid="button-ai-send">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Type <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">/</kbd> for workflows • Press Enter to send
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : selectedClip ? (
          /* Note Editor */
          <>
            <div className="p-3 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  className="bg-transparent border-none text-lg font-semibold focus:outline-none focus:ring-0"
                  placeholder="Untitled Note"
                  data-testid="input-title"
                />
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(selectedClip)}
                  className="h-8 w-8"
                  data-testid="button-copy"
                >
                  {copiedId === selectedClip.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleStar(selectedClip.id)}
                  className="h-8 w-8"
                  data-testid="button-star"
                >
                  <Star className={cn("w-4 h-4", selectedClip.starred && "text-yellow-500 fill-yellow-500")} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handlePin(selectedClip.id)}
                  className="h-8 w-8"
                  data-testid="button-pin"
                >
                  <Pin className={cn("w-4 h-4", selectedClip.pinned && "text-primary")} />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {selectedClip.deleted ? (
                      <>
                        <DropdownMenuItem onClick={() => handleRestore(selectedClip.id)}>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Restore
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handlePermanentDelete(selectedClip.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Permanently
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <DropdownMenuItem onClick={() => handleDelete(selectedClip.id)} className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Move to Recycle Bin
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="p-3 border-b border-border/50 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Tags:</span>
              {selectedClip.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  <Hash className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
              <Button variant="ghost" size="sm" className="h-6 text-xs">
                <Plus className="w-3 h-3 mr-1" />
                Add tag
              </Button>
            </div>

            {/* Structured Fields or Content */}
            {selectedClip.isStructured ? (
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3 max-w-xl">
                  {editingFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2 group">
                      <div className="w-8 flex justify-center">
                        {getFieldIcon(field.type)}
                      </div>
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Input
                          value={field.label}
                          onChange={(e) => {
                            const updated = [...editingFields];
                            updated[index].label = e.target.value;
                            setEditingFields(updated);
                          }}
                          className="col-span-1 h-9 text-sm font-medium"
                          placeholder="Label"
                        />
                        <Input
                          type={field.type === "password" ? "password" : "text"}
                          value={field.value}
                          onChange={(e) => handleUpdateField(field.id, e.target.value)}
                          className="col-span-2 h-9 text-sm font-mono"
                          placeholder="Value"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100"
                        onClick={() => handleRemoveField(field.id)}
                      >
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}

                  {/* Add Field */}
                  <Popover open={showAddField} onOpenChange={setShowAddField}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="mt-4">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Field
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">Add New Field</h4>
                        <Input
                          placeholder="Field label"
                          value={newFieldLabel}
                          onChange={(e) => setNewFieldLabel(e.target.value)}
                        />
                        <Select value={newFieldType} onValueChange={(v) => setNewFieldType(v as StructuredField["type"])}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="password">Password</SelectItem>
                            <SelectItem value="url">URL</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="api_key">API Key</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button onClick={handleAddField} size="sm" className="w-full">
                          Add Field
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex-1 p-4">
                <Textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  className="min-h-full h-full resize-none font-mono text-sm bg-transparent border-none focus:ring-0"
                  placeholder="Tap here to add text"
                  data-testid="textarea-content"
                />
              </div>
            )}

            <div className="p-3 border-t border-border/50 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {formatDate(selectedClip.timestamp)}
              </span>
              <Button 
                onClick={handleSave} 
                size="sm"
                className="gap-2"
                data-testid="button-save"
              >
                <Save className="w-4 h-4" />
                Save
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="font-medium mb-1">No note selected</h3>
              <p className="text-sm text-muted-foreground">Select a note to view or edit</p>
            </div>
          </div>
        )}
      </div>

      {/* System Prompt Dialog */}
      <Dialog open={showSystemPrompt} onOpenChange={setShowSystemPrompt}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              AI System Prompt
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Configure the system prompt that defines how the AI assistant behaves.
            </p>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
              placeholder="Enter system prompt..."
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSystemPrompt(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                setShowSystemPrompt(false);
                toast({ title: "System prompt updated" });
              }}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hotkeys Sheet */}
      <Sheet open={showHotkeys} onOpenChange={setShowHotkeys}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              Hotkey Observer
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <div className="bg-muted/50 rounded-lg p-4 mb-6 text-sm">
              <p className="mb-2">Configure hotkeys to control the application and actions within it.</p>
              <p className="text-muted-foreground">Some hotkeys are set by default. You can clear them or reassign.</p>
            </div>
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-1">
                {hotkeys.map(hotkey => (
                  <div 
                    key={hotkey.id}
                    className="flex items-center justify-between py-3 px-2 hover:bg-muted/30 rounded-md"
                  >
                    <span className="text-sm">{hotkey.action}</span>
                    <div className="flex items-center gap-2">
                      {hotkey.keys ? (
                        <Badge variant="outline" className="font-mono text-xs">
                          {hotkey.keys}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not set</span>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

        {/* Full Settings Page */}
        {showSettings && (
          <SettingsPage onClose={() => setShowSettings(false)} />
        )}
      </div>
    </div>
  );
}
