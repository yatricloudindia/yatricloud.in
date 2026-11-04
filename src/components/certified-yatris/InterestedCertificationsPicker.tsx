import { useState, KeyboardEvent } from "react";
import { Plus, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hint, OptionalTag } from "@/components/ui/form-layout";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const POPULAR_PROVIDERS = [
  { id: "aws", label: "Amazon AWS", code: "AWS" },
  { id: "azure", label: "Microsoft Azure", code: "Azure" },
  { id: "gcp", label: "Google Cloud (GCP)", code: "GCP" },
  { id: "kubernetes", label: "Kubernetes / CNCF", code: "K8s" },
  { id: "github", label: "GitHub", code: "GitHub" },
  { id: "hashicorp", label: "HashiCorp / Terraform", code: "Terraform" },
  { id: "linux", label: "Linux Foundation", code: "Linux" },
  { id: "comptia", label: "CompTIA", code: "CompTIA" },
  { id: "cisco", label: "Cisco", code: "Cisco" },
  { id: "salesforce", label: "Salesforce", code: "Salesforce" },
  { id: "servicenow", label: "ServiceNow", code: "ServiceNow" },
  { id: "openai", label: "OpenAI / Generative AI", code: "AI / ML" },
  { id: "anthropic", label: "Anthropic / Claude AI", code: "Claude AI" },
  { id: "snowflake", label: "Snowflake Data Cloud", code: "SnowPro" },
  { id: "oracle", label: "Oracle", code: "Oracle" },
  { id: "docker", label: "Docker", code: "Docker" },
  { id: "databricks", label: "Databricks", code: "Databricks" },
  { id: "redis", label: "Redis", code: "Redis" },
];

interface InterestedCertificationsPickerProps {
  value: string[];
  onChange: (items: string[]) => void;
  label?: string;
  description?: string;
  required?: boolean;
}

export const InterestedCertificationsPicker = ({
  value = [],
  onChange,
  label = "Which certifications are you interested in?",
  description = "Select from top providers and/or type custom certifications (e.g. CKA, AWS SAA, AZ-104).",
  required = false,
}: InterestedCertificationsPickerProps) => {
  const [customInput, setCustomInput] = useState("");

  const handleToggle = (providerLabel: string) => {
    if (value.includes(providerLabel)) {
      onChange(value.filter((v) => v !== providerLabel));
    } else {
      onChange([...value, providerLabel]);
    }
  };

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (!value.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...value, trimmed]);
    }
    setCustomInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCustom();
    }
  };

  const handleRemove = (itemToRemove: string) => {
    onChange(value.filter((v) => v !== itemToRemove));
  };

  return (
    <div className="space-y-3.5">
      <div>
        <Label className="block text-sm font-medium text-foreground">
          {label}{!required && <OptionalTag />}
        </Label>
        {description && (
          <Hint>{description}</Hint>
        )}
      </div>

      {/* Selected tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2.5 bg-background border border-border rounded-xl min-h-[48px] items-center">
          {value.map((item) => (
            <Badge
              key={item}
              className="bg-primary text-primary-foreground border-transparent hover:bg-primary/90 text-[13px] px-2.5 py-1 flex items-center gap-1.5 font-medium shadow-xs transition-all"
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => handleRemove(item)}
                className="rounded-full hover:bg-primary-foreground/20 p-0.5 transition-colors ml-0.5 text-primary-foreground"
                title={`Remove ${item}`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Quick Select from Provider Dropdown & Custom Input in a responsive row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Select
            onValueChange={(val) => {
              if (val && !value.includes(val)) {
                onChange([...value, val]);
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a provider" />
            </SelectTrigger>
            <SelectContent className="max-h-[240px]">
              {POPULAR_PROVIDERS.map((p) => {
                const isSelected = value.includes(p.label);
                return (
                  <SelectItem key={p.id} value={p.label} className="text-sm py-2">
                    <div className="flex items-center justify-between w-full gap-2">
                      <span>{p.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-primary ml-auto" />}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Custom input for typing specific exams or others */}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Type your own, e.g. CKA"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddCustom}
            disabled={!customInput.trim()}
            className="h-12 px-4 shrink-0 rounded-xl text-sm gap-1 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </Button>
        </div>
      </div>

      {/* Checkboxes Grid - 2 cols on mobile, 3 cols on sm, 4 cols on md/lg */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {POPULAR_PROVIDERS.map((p) => {
          const isChecked = value.includes(p.label);
          return (
            <button
              type="button"
              key={p.id}
              onClick={() => handleToggle(p.label)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[13px] text-left cursor-pointer select-none transition-all ${
                isChecked
                  ? "bg-primary border-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-background border-input text-foreground hover:border-primary/50 hover:bg-muted"
              }`}
            >
              {isChecked ? (
                <div className="w-4 h-4 rounded bg-primary-foreground text-primary flex items-center justify-center shrink-0 shadow-xs">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              ) : (
                <div className="w-4 h-4 rounded border border-input bg-background shrink-0" />
              )}
              <span className="truncate">{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
