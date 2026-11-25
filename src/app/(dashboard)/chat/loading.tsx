import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function ChatLoading() {
  return (
    <div className="max-w-4xl h-[calc(100vh-10rem)] flex flex-col">
      <Card className="mb-4">
        <CardContent className="flex items-center gap-4 py-4">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1">
        <CardContent className="p-4 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
            >
              <Skeleton
                className={`h-10 ${i % 2 === 0 ? "w-48" : "w-64"} rounded-lg`}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
