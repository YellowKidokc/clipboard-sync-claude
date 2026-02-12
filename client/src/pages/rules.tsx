import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Rule {
  id: string;
  name: string;
  matchType: string;
  pattern: string;
  action: string;
  params: Record<string, unknown> | null;
  priority: number;
  enabled: boolean;
}

const matchTypes = ["regex", "mime", "contains", "starts_with"];
const actions = ["replace", "route_folder", "tag", "webhook", "ai_call"];

export default function RulesPage() {
  const { toast } = useToast();
  const { data } = useQuery<{ items: Rule[] }>({ queryKey: ["/api/rules"] });
  const rules = data?.items || [];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [paramsText, setParamsText] = useState("{}");
  const [testContent, setTestContent] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);

  const emptyRule: Rule = {
    id: "",
    name: "",
    matchType: "contains",
    pattern: "",
    action: "tag",
    params: {},
    priority: 0,
    enabled: true,
  };

  const startNew = () => {
    setEditing({ ...emptyRule });
    setParamsText(JSON.stringify(emptyRule.params || {}, null, 2));
    setTestContent("");
    setTestResult(null);
    setOpen(true);
  };

  const saveRule = async () => {
    if (!editing) return;
    let parsedParams: Record<string, unknown> = {};
    try {
      parsedParams = paramsText ? JSON.parse(paramsText) : {};
    } catch {
      toast({ title: "Params must be valid JSON", variant: "destructive" });
      return;
    }
    try {
      if (editing.id) {
        await apiRequest("PUT", `/api/rules/${editing.id}`, {
          name: editing.name,
          match_type: editing.matchType,
          pattern: editing.pattern,
          action: editing.action,
          params: parsedParams,
          priority: editing.priority,
          enabled: editing.enabled,
        });
      } else {
        await apiRequest("POST", "/api/rules", {
          name: editing.name,
          match_type: editing.matchType,
          pattern: editing.pattern,
          action: editing.action,
          params: parsedParams,
          priority: editing.priority,
          enabled: editing.enabled,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      toast({ title: "Rule saved" });
      setOpen(false);
    } catch {
      toast({ title: "Failed to save rule", variant: "destructive" });
    }
  };

  const deleteRule = async (id: string) => {
    try {
      await apiRequest("DELETE", `/api/rules/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      toast({ title: "Rule deleted" });
    } catch {
      toast({ title: "Failed to delete rule", variant: "destructive" });
    }
  };

  const testRule = async () => {
    if (!editing) return;
    let parsedParams: Record<string, unknown> = {};
    try {
      parsedParams = paramsText ? JSON.parse(paramsText) : {};
    } catch {
      setTestResult("Params JSON invalid");
      return;
    }
    try {
      const res = await apiRequest("POST", "/api/rules/test", {
        rule: {
          name: editing.name,
          match_type: editing.matchType,
          pattern: editing.pattern,
          action: editing.action,
          params: parsedParams,
          priority: editing.priority,
          enabled: editing.enabled,
        },
        test_content: testContent,
      });
      const data = (await res.json()) as { matched: boolean; result: string };
      setTestResult(data.matched ? data.result : "No match");
    } catch {
      setTestResult("Test failed");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Rules Engine</h1>
            <p className="text-sm text-muted-foreground">Automate routing, tagging, and AI workflows.</p>
          </div>
          <Button onClick={startNew}>New Rule</Button>
        </div>

        <div className="grid gap-4">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{rule.name}</p>
                    <p className="text-xs text-muted-foreground">{rule.matchType} · {rule.pattern} · {rule.action}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={async (checked) => {
                        await apiRequest("PUT", `/api/rules/${rule.id}`, { enabled: checked });
                        queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(rule);
                        setParamsText(JSON.stringify(rule.params || {}, null, 2));
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteRule(rule.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {rules.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                No rules yet. Create one to start automating.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Rule" : "New Rule"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <Input
                placeholder="Rule name"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Select value={editing.matchType} onValueChange={(value) => setEditing({ ...editing, matchType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Match type" />
                  </SelectTrigger>
                  <SelectContent>
                    {matchTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Pattern"
                  value={editing.pattern}
                  onChange={(e) => setEditing({ ...editing, pattern: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select value={editing.action} onValueChange={(value) => setEditing({ ...editing, action: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    {actions.map((action) => (
                      <SelectItem key={action} value={action}>{action}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Priority"
                  value={editing.priority}
                  onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })}
                />
              </div>
              <Textarea
                placeholder='Params JSON e.g. { "tags": ["work"] }'
                value={paramsText}
                onChange={(e) => setParamsText(e.target.value)}
                className="font-mono"
              />
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing.enabled}
                  onCheckedChange={(checked) => setEditing({ ...editing, enabled: checked })}
                />
                <span className="text-sm">Enabled</span>
              </div>

              <div className="border-t pt-4 space-y-2">
                <p className="text-sm font-medium">Test Rule</p>
                <Textarea
                  placeholder="Paste content to test"
                  value={testContent}
                  onChange={(e) => setTestContent(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={testRule}>Run Test</Button>
                  {testResult && <span className="text-sm text-muted-foreground">{testResult}</span>}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={saveRule}>Save Rule</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
