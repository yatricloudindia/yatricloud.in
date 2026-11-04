import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Plus, Loader2, ArrowLeft, Building2, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitExamDump, getProviderMeta } from "@/lib/exam-dumps";
import { getFormProviders, type FormProvider } from "@/lib/cert-catalog";
import { CENTRAL_PROVIDERS_LIST } from "@/lib/central-providers";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const dumpSchema = z.object({
  title: z.string().min(1, "Title is required"),
  provider: z.string().min(1, "Provider is required"),
  originalPrice: z.number().min(0, "Price must be positive"),
  price: z.number().min(0, "Price must be positive"),
  image: z.string().url("Must be a valid URL"),
  downloadUrl: z.string().url("Must be a valid JioAICloud link URL").refine((u) => /^https?:\/\//i.test(u), "URL must start with http:// or https://"),
  description: z.string().min(10, "Description must be at least 10 characters"),
});

type DumpFormData = z.infer<typeof dumpSchema>;

const STANDARD_PROVIDERS = CENTRAL_PROVIDERS_LIST;

const AdminAddExamDump = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [catalogProviders, setCatalogProviders] = useState<FormProvider[]>([]);
  const [selectedProviderOption, setSelectedProviderOption] = useState<string>("AWS");
  const [customProvider, setCustomProvider] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<DumpFormData>({
    resolver: zodResolver(dumpSchema),
    defaultValues: {
      provider: "AWS",
      originalPrice: 499,
      price: 99,
    },
  });

  const currentProvider = watch("provider") || "AWS";
  const providerMeta = getProviderMeta(currentProvider);

  useEffect(() => {
    getFormProviders().then((res) => {
      if (res && res.length > 0) setCatalogProviders(res);
    });
  }, []);

  const handleProviderSelect = (val: string) => {
    setSelectedProviderOption(val);
    if (val === "__CUSTOM__") {
      setValue("provider", customProvider);
    } else {
      setValue("provider", val);
    }
  };

  const handleCustomProviderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomProvider(val);
    setValue("provider", val);
  };

  const onSubmit = async (data: DumpFormData) => {
    setIsSubmitting(true);
    try {
      await submitExamDump(data as Parameters<typeof submitExamDump>[0]);
      toast.success("Exam dump added successfully!");
      navigate("/admin/exam-dumps");
    } catch (error: any) {
      console.error("Error submitting dump:", error);
      toast.error(error?.message || "Failed to add exam dump");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-8 py-8 md:py-10">
      <Button variant="ghost" onClick={() => navigate("/admin/exam-dumps")} className="mb-6 min-h-[44px] rounded-xl hover:bg-brand-50 hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Add New Exam Dump</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create verified practice sets organized by certification provider.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Provider Selection */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6">
          <div className="mb-4 flex items-start gap-3 border-b border-border pb-4">
            <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold tabular-nums text-white">1</span>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold tracking-tight">Certification Provider</h2>
              <p className="text-sm text-muted-foreground">Select or enter the provider this exam dump belongs to (e.g. AWS, Azure, GCP).</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="block text-sm font-medium mb-1.5">Select Provider</Label>
              <Select value={selectedProviderOption} onValueChange={handleProviderSelect}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Choose a provider" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {STANDARD_PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.label}</span>
                        <span className="text-xs text-muted-foreground">(/examdumps/{p.slug})</span>
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="__CUSTOM__" className="cursor-pointer text-primary font-medium">
                    + Other / Custom Provider
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedProviderOption === "__CUSTOM__" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                <Label htmlFor="custom-provider" className="block text-sm font-medium mb-1.5">Custom Provider Name</Label>
                <Input
                  id="custom-provider"
                  value={customProvider}
                  onChange={handleCustomProviderChange}
                  placeholder="e.g., Snowflake, Databricks, Splunk"
                  className="h-11 rounded-xl"
                  autoFocus
                />
              </motion.div>
            )}

            {errors.provider && <p className="text-sm text-destructive mt-1">{errors.provider.message}</p>}

            {/* Provider Live Preview Card */}
            {currentProvider && (
              <div className="flex items-center gap-4 rounded-xl border border-border/80 bg-muted/40 p-4">
                {providerMeta.logoUrl ? (
                  <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-background border border-border p-1 flex items-center justify-center">
                    <img src={providerMeta.logoUrl} alt={providerMeta.name} className="h-full w-full object-contain" />
                  </div>
                ) : (
                  <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm">
                    <Building2 className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{providerMeta.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{providerMeta.badge || "Verified"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    URL Route: <code className="text-primary font-mono text-[11px]">/examdumps/{providerMeta.slug}</code>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dump details */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6">
          <div className="mb-6 flex items-start gap-3 border-b border-border pb-4">
            <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold tabular-nums text-white">2</span>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold tracking-tight">Dump Details</h2>
              <p className="text-sm text-muted-foreground">Title, resource link, and description.</p>
            </div>
          </div>

          <div>
            <Label htmlFor="title" className="block text-sm font-medium mb-1.5">Exam Title & Code</Label>
            <Input id="title" {...register("title")} placeholder="e.g., AWS Certified Solutions Architect Associate (SAA-C03)" className="h-11 rounded-xl" />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <Label htmlFor="downloadUrl" className="block text-sm font-medium mb-1.5">JioAICloud / Resource Download Link</Label>
            <Input id="downloadUrl" {...register("downloadUrl")} placeholder="https://jioaicloud.com/s/..." className="h-11 rounded-xl" />
            <p className="text-xs text-muted-foreground mt-1">Sent automatically to buyers via email upon verified checkout.</p>
            {errors.downloadUrl && <p className="text-sm text-destructive mt-1">{errors.downloadUrl.message}</p>}
          </div>

          <div>
            <Label htmlFor="description" className="block text-sm font-medium mb-1.5">Description & Syllabus Highlights</Label>
            <Textarea id="description" {...register("description")} placeholder="Details about this exam dump (number of questions, topics covered, pass rate guarantee)..." rows={5} className="min-h-[110px] rounded-xl" />
            {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6">
          <div className="mb-6 flex items-start gap-3 border-b border-border pb-4">
            <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold tabular-nums text-white">3</span>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold tracking-tight">Pricing</h2>
              <p className="text-sm text-muted-foreground">List price and the final offer buyers pay in ₹ INR.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <Label htmlFor="originalPrice" className="block text-sm font-medium mb-1.5">Original Price (₹)</Label>
              <Input id="originalPrice" type="number" {...register("originalPrice", { valueAsNumber: true })} className="h-11 rounded-xl tabular-nums" />
              {errors.originalPrice && <p className="text-sm text-destructive mt-1">{errors.originalPrice.message}</p>}
            </div>
            <div>
              <Label htmlFor="price" className="block text-sm font-medium mb-1.5">Offer Price (₹)</Label>
              <Input id="price" type="number" {...register("price", { valueAsNumber: true })} className="h-11 rounded-xl tabular-nums" />
              {errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}
            </div>
          </div>
        </div>

        {/* Media */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6">
          <div className="mb-6 flex items-start gap-3 border-b border-border pb-4">
            <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold tabular-nums text-white">4</span>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold tracking-tight">Cover Media</h2>
              <p className="text-sm text-muted-foreground">Square cover image or badge shown on listing cards.</p>
            </div>
          </div>

          <div>
            <Label htmlFor="image" className="block text-sm font-medium mb-1.5">Image URL</Label>
            <Input
              id="image"
              {...register("image")}
              placeholder="https://example.com/image.jpg"
              onChange={(e) => {
                setValue("image", e.target.value);
                setImagePreview(e.target.value);
              }}
              className="h-11 rounded-xl"
            />
            {errors.image && <p className="text-sm text-destructive mt-1">{errors.image.message}</p>}
            {imagePreview && (
              <div className="mt-3 h-32 w-32 border border-border rounded-xl overflow-hidden bg-muted flex items-center justify-center p-2">
                <img src={imagePreview} alt="Preview" className="h-full w-full object-contain" />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto min-h-[44px] px-8 font-semibold rounded-xl bg-primary text-primary-foreground shadow-inset-btn hover:bg-brand-600">
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</> : <><Plus className="mr-2 h-4 w-4" /> Add Exam Dump</>}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminAddExamDump;
