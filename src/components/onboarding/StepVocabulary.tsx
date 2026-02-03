import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Tags, FileJson } from "lucide-react";

const standardVocabularies = [
  { id: "dcat", name: "DCAT", description: "Data Catalog Vocabulary" },
  { id: "odrl", name: "ODRL", description: "Open Digital Rights Language" },
  { id: "dspace", name: "Dataspace Protocol", description: "IDS Dataspace standard" },
  { id: "geo", name: "GeoSPARQL", description: "Geospatial RDF vocabulary" },
];

const dataDomains = [
  "Seismic Data",
  "Well Logs",
  "Production Data",
  "Geological Maps",
  "Reservoir Models",
  "Environmental Data",
  "Infrastructure",
  "Contracts & Licenses",
];

export const StepVocabulary = () => {
  return (
    <div className="space-y-6">
      {/* Standard Vocabularies */}
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
          <BookOpen className="w-4 h-4" />
          Standard Vocabularies
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Select the standard vocabularies to use for metadata interoperability
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {standardVocabularies.map((vocab) => (
            <div
              key={vocab.id}
              className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <Checkbox id={vocab.id} defaultChecked={vocab.id === "dcat" || vocab.id === "odrl"} />
              <div className="space-y-1">
                <label
                  htmlFor={vocab.id}
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  {vocab.name}
                </label>
                <p className="text-xs text-muted-foreground">{vocab.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Domains */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
          <Tags className="w-4 h-4" />
          Data Domains
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Select the data domains relevant to your organization
        </p>
        
        <div className="flex flex-wrap gap-2">
          {dataDomains.map((domain, index) => (
            <Badge
              key={domain}
              variant={index < 4 ? "default" : "outline"}
              className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors py-1.5 px-3"
            >
              {domain}
            </Badge>
          ))}
        </div>
      </div>

      {/* Custom Metadata Schema */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
          <FileJson className="w-4 h-4" />
          Custom Metadata Fields
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Define additional metadata fields specific to your organization
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customField1">Custom Field Name</Label>
            <Input id="customField1" placeholder="e.g., Well ID Format" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customValue1">Field Type</Label>
            <Input id="customValue1" placeholder="e.g., String, Number, Date" />
          </div>
        </div>

        <div className="mt-4 p-4 bg-info/10 rounded-lg border border-info/20">
          <p className="text-sm text-info">
            💡 Tip: Standard vocabularies like DCAT ensure your data catalog is compatible with 
            other dataspaces and can be federated across organizations.
          </p>
        </div>
      </div>
    </div>
  );
};
