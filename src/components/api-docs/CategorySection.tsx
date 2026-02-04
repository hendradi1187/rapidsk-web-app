import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ApiCategory } from "./api-endpoints";
import { EndpointCard } from "./EndpointCard";

interface CategorySectionProps {
  category: ApiCategory;
  defaultOpen?: boolean;
}

export function CategorySection({
  category,
  defaultOpen = false,
}: CategorySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <CollapsibleTrigger asChild>
        <div
          className={cn(
            "flex items-center justify-between p-4 cursor-pointer rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          )}
        >
          <div className="flex items-center gap-3">
            {isOpen ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
            <h3 className="text-base font-semibold">{category.name}</h3>
            <Badge variant="secondary" className="text-xs">
              {category.endpoints.length} endpoint
              {category.endpoints.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          {category.description && (
            <span className="text-sm text-muted-foreground hidden sm:block">
              {category.description}
            </span>
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 pl-4">
          {category.endpoints.map((endpoint, index) => (
            <EndpointCard
              key={`${endpoint.method}-${endpoint.path}-${index}`}
              endpoint={endpoint}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
