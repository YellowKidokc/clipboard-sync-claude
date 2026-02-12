import { useQuery } from "@tanstack/react-query";
import { AppNav } from "@/components/app-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function PredictionsPage() {
  const { data: current } = useQuery<{ prediction: string; confidence: number }>(
    { queryKey: ["/api/predictions/current"] }
  );
  const { data: stats } = useQuery<{
    accuracy: number;
    total: number;
    correct: number;
    streak: number;
    recent_predictions: { id: string; predictedContent: string; wasCorrect: boolean | null }[];
  }>({ queryKey: ["/api/predictions/stats"] });

  const accuracy = stats ? Math.round((stats.accuracy || 0) * 100) : 0;
  const confidence = current ? Math.round((current.confidence || 0) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Predictions Dashboard</h1>
          <p className="text-sm text-muted-foreground">Track AI prediction accuracy and streaks.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 space-y-2">
              <p className="text-sm text-muted-foreground">Accuracy</p>
              <p className="text-3xl font-semibold">{accuracy}%</p>
              <Progress value={accuracy} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 space-y-2">
              <p className="text-sm text-muted-foreground">Current Streak</p>
              <p className="text-3xl font-semibold">{stats?.streak ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total predictions: {stats?.total ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 space-y-2">
              <p className="text-sm text-muted-foreground">Current Prediction</p>
              <p className="text-sm font-medium">{current?.prediction || "No prediction yet"}</p>
              <Progress value={confidence} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Predictions</h2>
              <Badge variant="secondary">{stats?.correct ?? 0} correct</Badge>
            </div>
            <div className="space-y-2">
              {(stats?.recent_predictions || []).map((prediction) => (
                <div key={prediction.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <p className="text-sm">{prediction.predictedContent}</p>
                  <Badge
                    variant={prediction.wasCorrect ? "default" : prediction.wasCorrect === false ? "destructive" : "secondary"}
                  >
                    {prediction.wasCorrect === null ? "Pending" : prediction.wasCorrect ? "Correct" : "Miss"}
                  </Badge>
                </div>
              ))}
              {stats && stats.recent_predictions.length === 0 && (
                <p className="text-sm text-muted-foreground">No prediction history yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
