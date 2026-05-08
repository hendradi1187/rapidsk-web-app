import { AlertTriangle, CheckCircle2, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { RuntimeCapability, RuntimeExecutionLogEntry } from "@/lib/runtime-capabilities";
import { formatRuntimeStatusLabel } from "@/lib/runtime-capabilities";

const STATUS_STYLES = {
  live: "border-emerald-500/40 text-emerald-600",
  broken_backend: "border-red-500/40 text-red-600",
  missing_backend: "border-amber-500/40 text-amber-600",
  fallback_available: "border-blue-500/40 text-blue-600",
} as const;

export function RuntimeCapabilityNotice({ capability }: { capability: RuntimeCapability }) {
  return (
    <Alert>
      {capability.status === "live" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      <AlertTitle className="flex items-center gap-2">
        {capability.label}
        <Badge variant="outline" className={STATUS_STYLES[capability.status]}>
          {formatRuntimeStatusLabel(capability.status)}
        </Badge>
      </AlertTitle>
      <AlertDescription>
        <span>{capability.description}</span>
        <span className="mt-1 block">
          Primary: <code>{capability.primaryEndpoint}</code>
        </span>
        {capability.fallbackEndpoint && (
          <span className="block">
            Fallback: <code>{capability.fallbackEndpoint}</code>
          </span>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function RuntimeExecutionLogPanel({
  title = "Execution Log",
  entries,
}: {
  title?: string;
  entries: RuntimeExecutionLogEntry[];
}) {
  return (
    <Alert>
      <Wrench className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {entries.length === 0 ? (
          <p>No runtime execution logs yet.</p>
        ) : (
          <div className="space-y-2">
            {entries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="rounded border border-border/50 bg-muted/30 p-2 text-xs">
                <p className="font-medium">{entry.intent}</p>
                <p>{entry.detail}</p>
                <p className="text-muted-foreground">
                  {formatRuntimeStatusLabel(entry.endpointStatus)} · <code>{entry.primaryEndpoint}</code>
                  {entry.fallbackEndpoint ? <> · fallback <code>{entry.fallbackEndpoint}</code></> : null}
                </p>
              </div>
            ))}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
