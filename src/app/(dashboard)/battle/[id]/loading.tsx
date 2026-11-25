import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function BattleDetailLoading() {
  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="w-10 h-10 rounded" />
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      <Card className="h-64">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-6xl animate-pulse">⚔️</div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
