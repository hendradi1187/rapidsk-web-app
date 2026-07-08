import { useState } from "react";
import { ChevronDown, ChevronRight, Send, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ApiEndpoint, methodColors } from "./api-endpoints";
import { ctsClient as apiClient } from "@/api/clients";

interface EndpointCardProps {
  endpoint: ApiEndpoint;
}

export function EndpointCard({ endpoint }: EndpointCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [requestBody, setRequestBody] = useState<string>(
    endpoint.requestBody?.example
      ? JSON.stringify(endpoint.requestBody.example, null, 2)
      : "{}"
  );

  const colors = methodColors[endpoint.method];

  const handleParamChange = (name: string, value: string) => {
    setParamValues((prev) => ({ ...prev, [name]: value }));
  };

  const buildUrl = () => {
    let url = endpoint.path;

    // Replace path parameters
    endpoint.parameters
      ?.filter((p) => p.in === "path")
      .forEach((param) => {
        const value = paramValues[param.name] || `{${param.name}}`;
        url = url.replace(`{${param.name}}`, value);
      });

    // Add query parameters
    const queryParams = endpoint.parameters
      ?.filter((p) => p.in === "query" && paramValues[p.name])
      .map((p) => `${p.name}=${encodeURIComponent(paramValues[p.name])}`)
      .join("&");

    if (queryParams) {
      url += `?${queryParams}`;
    }

    return url;
  };

  const handleTryIt = async () => {
    setIsLoading(true);
    setResponse(null);
    setResponseStatus(null);

    try {
      const url = buildUrl();
      let result;

      switch (endpoint.method) {
        case "GET":
          result = await apiClient.get(url);
          break;
        case "POST":
          result = await apiClient.post(url, JSON.parse(requestBody));
          break;
        case "PUT":
          result = await apiClient.put(url, JSON.parse(requestBody));
          break;
        case "PATCH":
          result = await apiClient.patch(url, JSON.parse(requestBody));
          break;
        case "DELETE":
          result = await apiClient.delete(url);
          break;
      }

      setResponse(JSON.stringify(result.data, null, 2));
      setResponseStatus(result.status);
    } catch (error: unknown) {
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response: { data: unknown; status: number } };
        setResponse(JSON.stringify(axiosError.response.data, null, 2));
        setResponseStatus(axiosError.response.status);
      } else if (error instanceof Error) {
        setResponse(JSON.stringify({ error: error.message }, null, 2));
        setResponseStatus(500);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (response) {
      navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 rounded-lg border transition-colors",
            isOpen && "bg-muted/50"
          )}
        >
          <div className="flex items-center gap-3 flex-1">
            <Badge
              className={cn(
                "font-mono text-xs px-2 py-1 min-w-[60px] justify-center",
                colors.bg,
                colors.text
              )}
            >
              {endpoint.method}
            </Badge>
            <code className="text-sm font-mono text-foreground">
              {endpoint.path}
            </code>
            <span className="text-sm text-muted-foreground">
              {endpoint.summary}
            </span>
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-x border-b rounded-b-lg p-4 space-y-4 bg-muted/20">
          {endpoint.description && (
            <p className="text-sm text-muted-foreground">
              {endpoint.description}
            </p>
          )}

          {/* Parameters Section */}
          {endpoint.parameters && endpoint.parameters.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Parameters</h4>
              <div className="space-y-2">
                {endpoint.parameters.map((param) => (
                  <div key={param.name} className="flex items-center gap-3">
                    <Label className="w-32 text-sm">
                      {param.name}
                      {param.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </Label>
                    <Input
                      placeholder={`${param.type}${param.description ? ` - ${param.description}` : ""}`}
                      value={paramValues[param.name] || ""}
                      onChange={(e) =>
                        handleParamChange(param.name, e.target.value)
                      }
                      className="flex-1 font-mono text-sm"
                    />
                    <Badge variant="outline" className="text-xs">
                      {param.in}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Request Body Section */}
          {endpoint.requestBody && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Request Body</h4>
              <div className="space-y-2">
                <Badge variant="outline" className="text-xs">
                  {endpoint.requestBody.type}
                </Badge>
                <Textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  className="font-mono text-sm min-h-[120px]"
                  placeholder="Enter JSON request body..."
                />
              </div>
            </div>
          )}

          {/* Try It Button */}
          <div className="flex justify-end">
            <Button onClick={handleTryIt} disabled={isLoading} size="sm">
              <Send className="h-4 w-4 mr-2" />
              {isLoading ? "Sending..." : "Try it out"}
            </Button>
          </div>

          {/* Response Section */}
          {response && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium">Response</h4>
                  {responseStatus && (
                    <Badge
                      variant={responseStatus < 400 ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {responseStatus}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[300px] text-xs font-mono">
                {response}
              </pre>
            </div>
          )}

          {/* Responses Documentation */}
          {endpoint.responses && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Expected Responses</h4>
              <div className="space-y-1">
                {Object.entries(endpoint.responses).map(([code, resp]) => (
                  <div
                    key={code}
                    className="flex items-center gap-3 text-sm"
                  >
                    <Badge
                      variant={
                        code.startsWith("2")
                          ? "default"
                          : code.startsWith("4")
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-xs min-w-[40px] justify-center"
                    >
                      {code}
                    </Badge>
                    <span className="text-muted-foreground">
                      {resp.description}
                    </span>
                    {resp.type && (
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {resp.type}
                      </code>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
