import { useLocation } from "wouter";
import { AppNav } from "@/components/app-nav";
import { SettingsPage } from "@/components/settings-page";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { getApiBase, setApiBase } from "@/lib/api";

export default function SettingsRoute() {
  const [, setLocation] = useLocation();
  const [apiBase, setApiBaseValue] = useState(getApiBase());
  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="mx-auto max-w-5xl px-6 py-6">
        <Card className="mb-6">
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-medium">Server Connection</p>
            <p className="text-xs text-muted-foreground">Set the API base URL for remote access.</p>
            <div className="flex gap-2">
              <Input
                placeholder="https://clipsync.yourdomain"
                value={apiBase}
                onChange={(e) => setApiBaseValue(e.target.value)}
              />
              <Button
                onClick={() => {
                  setApiBase(apiBase);
                }}
              >
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <SettingsPage onClose={() => setLocation("/")} />
    </div>
  );
}
