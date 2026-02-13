import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

const ComingSoon = ({ title }) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center pattern-bg" data-testid="coming-soon-page">
      <Card className="w-full max-w-md border-border/50 bg-white/80 backdrop-blur-sm shadow-lg">
        <CardContent className="p-8 text-center">
          {/* Animated Egg */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="w-24 h-28 bg-gradient-to-b from-yellow-100 to-yellow-50 rounded-[50%] shadow-lg egg-wobble border-2 border-yellow-200">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Construction size={32} className="text-yellow-600" />
                </div>
              </div>
              {/* Crack lines */}
              <svg
                className="absolute top-6 left-1/2 -translate-x-1/2 w-16 h-8"
                viewBox="0 0 64 32"
                fill="none"
              >
                <path
                  d="M32 0 L28 12 L36 8 L30 20 L38 16 L32 32"
                  stroke="#d97706"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                  className="opacity-60"
                />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-primary-950 mb-2">
            {title}
          </h2>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 text-yellow-800 text-sm font-medium mb-4">
            <span className="animate-pulse">●</span>
            Hatching Soon
          </div>

          <p className="text-muted-foreground text-sm font-light">
            This feature is currently under development. We're working hard to bring you
            the best experience. Check back soon!
          </p>

          {/* Progress indicator */}
          <div className="mt-6 flex items-center justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < 2 ? "bg-primary" : "bg-green-200"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Development in progress
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComingSoon;
