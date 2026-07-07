import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOpenApiSpec } from "@/hooks/use-openapi-spec";
import { methodColors } from "@/components/api-docs/api-endpoints";

export interface EndpointSelection {
  method: string;
  path: string;
  summary?: string;
}

interface EndpointPickerProps {
  method: string;
  path: string;
  onSelect: (selection: EndpointSelection) => void;
  disabled?: boolean;
}

/**
 * Picker endpoint definitif dari openapi.json live — menggantikan ketik manual
 * method + path yang rawan typo. Admin tinggal cari dan pilih endpoint asli.
 */
export const EndpointPicker = ({ method, path, onSelect, disabled }: EndpointPickerProps) => {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useOpenApiSpec();

  // Garis besar endpoint: 2 segmen statis pertama (abaikan parameter {..}).
  // Contoh: /api/v1/connector/consumer/persistent/... -> "/connector/consumer".
  const groupKey = (path: string) => {
    const clean = path.replace(/^\/api\/v1/, "").replace(/^\//, "");
    const segs = clean.split("/").filter((s) => s && !s.startsWith("{"));
    return "/" + segs.slice(0, 2).join("/");
  };

  const groupedEndpoints = useMemo(() => {
    const byGroup = new Map<string, EndpointSelection[]>();
    for (const cat of data?.categories ?? []) {
      for (const ep of cat.endpoints) {
        const key = groupKey(ep.path);
        if (!byGroup.has(key)) byGroup.set(key, []);
        byGroup.get(key)!.push({ method: ep.method, path: ep.path, summary: ep.summary });
      }
    }
    return Array.from(byGroup.entries())
      .map(([prefix, items]) => ({
        prefix,
        items: items.sort((a, b) => (a.path + a.method).localeCompare(b.path + b.method)),
      }))
      .sort((a, b) => a.prefix.localeCompare(b.prefix));
  }, [data]);

  const selectedLabel = method && path ? `${method.toUpperCase()} ${path}` : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selectedLabel ? (
            <span className="flex min-w-0 items-center gap-2">
              <Badge
                className={cn(
                  "shrink-0 border-0 text-[10px]",
                  methodColors[method.toUpperCase() as keyof typeof methodColors]?.bg,
                  methodColors[method.toUpperCase() as keyof typeof methodColors]?.text,
                )}
              >
                {method.toUpperCase()}
              </Badge>
              <span className="truncate font-mono text-xs">{path}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Pilih endpoint dari API...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(90vw,640px)] p-0" align="start">
        <Command
          filter={(value, search) => (value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}
        >
          <CommandInput placeholder="Cari endpoint (method atau path)..." />
          <CommandList className="max-h-[min(60vh,420px)]">
            {isLoading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat daftar endpoint...
              </div>
            ) : (
              <>
                <CommandEmpty>Tidak ada endpoint yang cocok.</CommandEmpty>
                {groupedEndpoints.map((group) => (
                  <CommandGroup key={group.prefix} heading={`${group.prefix}  ·  ${group.items.length}`}>
                    {group.items.map((ep) => {
                      const key = `${ep.method} ${ep.path}`;
                      const active = method.toUpperCase() === ep.method.toUpperCase() && path === ep.path;
                      return (
                        <CommandItem
                          key={key}
                          value={key}
                          onSelect={() => {
                            onSelect(ep);
                            setOpen(false);
                          }}
                          className="items-start gap-2"
                        >
                          <Check className={cn("mt-0.5 h-4 w-4 shrink-0", active ? "opacity-100" : "opacity-0")} />
                          <Badge
                            className={cn(
                              "mt-0.5 shrink-0 border-0 text-[10px]",
                              methodColors[ep.method]?.bg,
                              methodColors[ep.method]?.text,
                            )}
                          >
                            {ep.method}
                          </Badge>
                          <span className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed">{ep.path}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                ))}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
