import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function HatchLoading() {
  return (
    <div className="max-w-5xl space-y-6">
      <div className="text-center">
        <Skeleton className="h-8 w-64 mx-auto mb-2" />
        <Skeleton className="h-4 w-80 max-w-full mx-auto" />
      </div>

      <Card className="text-center">
        <CardHeader>
          <div className="text-8xl mb-4 animate-egg-wobble">🥚</div>
          <Skeleton className="h-6 w-40 mx-auto" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-48 mx-auto" />
        </CardContent>
      </Card>
    </div>
  );
}
