import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, Upload, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { adminGetResource, updateResource, uploadResourceImage, type ResourceInput } from "@/lib/resources-api";
import { CENTRAL_PROVIDER_NAMES } from "@/lib/central-providers";

const PROVIDERS = [...CENTRAL_PROVIDER_NAMES, "Other"];
const CATEGORIES = ["Exam Guide", "Practice Test", "Cheat Sheet", "Lab Guide", "Video Course", "Ebook", "Template", "Other"];

const schema = z.object({
  name: z.string().min(3, "Name is required"),
  description: z.string().optional().default(""),
  imageUrl: z.string().optional().default(""),
  accessUrl: z.string().url("Enter a valid URL").min(1, "Access URL is required").refine((u) => /^https?:\/\//i.test(u), "URL must start with http:// or https://"),
  resourceType: z.enum(["link", "file"]),
  isFree: z.boolean(),
  priceInr: z.number().min(0),
  provider: z.string().min(1, "Provider is required"),
  category: z.string().min(1, "Category is required"),
  tags: z.string().optional().default(""),
  isPublished: z.boolean(),
});

type FormData = z.infer<typeof schema>;

const AdminEditResource = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register, handleSubmit, watch, setValue, control, reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { resourceType: "link", isFree: true, priceInr: 0, isPublished: true, provider: "", category: "" },
  });

  const isFree = watch("isFree");

  useEffect(() => {
    if (!id) return;
    (async () => {
      setIsLoading(true);
      try {
        const r = await adminGetResource(id);
        if (!r) { toast.error("Resource not found"); navigate("/admin/resources"); return; }
        reset({
          name: r.name,
          description: r.description,
          imageUrl: r.imageUrl,
          accessUrl: r.accessUrl,
          resourceType: r.resourceType,
          isFree: r.isFree,
          priceInr: r.priceInr,
          provider: r.provider,
          category: r.category,
          tags: r.tags.join(", "),
          isPublished: r.isPublished,
        });
        setImagePreview(r.imageUrl);
      } catch {
        toast.error("Failed to load resource");
      } finally {
        setIsLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadResourceImage(file);
      setValue("imageUrl", url);
      setImagePreview(url);
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const input: Partial<ResourceInput> = {
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl ?? "",
        accessUrl: data.accessUrl,
        resourceType: data.resourceType,
        isFree: data.isFree,
        priceInr: data.isFree ? 0 : data.priceInr,
        provider: data.provider,
        category: data.category,
        tags: data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        isPublished: data.isPublished,
      };
      await updateResource(id, input);
      toast.success("Resource updated!");
      navigate("/admin/resources");
    } catch (e: any) {
      toast.error(e?.message ?? "Update failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const Section = ({ n, title, desc }: { n: number; title: string; desc: string }) => (
    <div className="mb-6 flex items-start gap-3 border-b border-border pb-4">
      <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold tabular-nums text-white">{n}</span>
      <div><h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2><p className="text-sm text-muted-foreground">{desc}</p></div>
    </div>
  );

  if (isLoading) return (
    <div className="flex min-h-[50vh] items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading…
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-8 py-8 md:py-10">
      <Button variant="ghost" onClick={() => navigate("/admin/resources")} className="mb-6 min-h-[44px] rounded-xl hover:bg-brand-50 hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Resources
      </Button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Edit Resource</h1>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Details */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6">
          <Section n={1} title="Resource Details" desc="Name, provider, category and access link." />

          <div>
            <Label htmlFor="name" className="block text-sm font-medium mb-1.5">Resource Name</Label>
            <Input id="name" {...register("name")} className="h-11 rounded-xl" />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <Label htmlFor="provider" className="block text-sm font-medium mb-1.5">Certification Provider</Label>
              <Controller name="provider" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="provider" className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{PROVIDERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              )} />
              {errors.provider && <p className="text-sm text-destructive mt-1">{errors.provider.message}</p>}
            </div>
            <div>
              <Label htmlFor="category" className="block text-sm font-medium mb-1.5">Category</Label>
              <Controller name="category" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="category" className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              )} />
              {errors.category && <p className="text-sm text-destructive mt-1">{errors.category.message}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <Label htmlFor="accessUrl" className="block text-sm font-medium mb-1.5">Access URL</Label>
              <Input id="accessUrl" {...register("accessUrl")} placeholder="https://…" className="h-11 rounded-xl" />
              {errors.accessUrl && <p className="text-sm text-destructive mt-1">{errors.accessUrl.message}</p>}
            </div>
            <div>
              <Label htmlFor="resourceType" className="block text-sm font-medium mb-1.5">Resource Type</Label>
              <Controller name="resourceType" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="resourceType" className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="link">Link</SelectItem><SelectItem value="file">File</SelectItem></SelectContent>
                </Select>
              )} />
            </div>
          </div>

          <div>
            <Label htmlFor="tags" className="block text-sm font-medium mb-1.5">Tags (comma separated)</Label>
            <Input id="tags" {...register("tags")} className="h-11 rounded-xl" />
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6">
          <Section n={2} title="Pricing" desc="Free or paid." />
          <div className="flex items-center gap-3">
            <Controller name="isFree" control={control} render={({ field }) => (
              <Switch id="isFree" checked={field.value} onCheckedChange={field.onChange} />
            )} />
            <Label htmlFor="isFree" className="text-sm font-medium cursor-pointer">
              {isFree ? "Free resource" : "Paid resource"}
            </Label>
          </div>
          {!isFree && (
            <div className="max-w-xs">
              <Label htmlFor="priceInr" className="block text-sm font-medium mb-1.5">Price (₹)</Label>
              <Input id="priceInr" type="number" min={0} {...register("priceInr", { valueAsNumber: true })} className="h-11 rounded-xl tabular-nums" />
            </div>
          )}
        </div>

        {/* Media */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6">
          <Section n={3} title="Thumbnail Image" desc="Update the cover image if needed." />
          <div className="flex gap-2 border border-border rounded-xl p-1 w-fit">
            {(["url", "upload"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setImageMode(m)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${imageMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                {m === "url" ? <><LinkIcon className="h-3.5 w-3.5" /> URL</> : <><Upload className="h-3.5 w-3.5" /> Upload</>}
              </button>
            ))}
          </div>
          {imageMode === "url" ? (
            <Input {...register("imageUrl")} placeholder="https://…" onChange={(e) => { setValue("imageUrl", e.target.value); setImagePreview(e.target.value); }} className="h-11 rounded-xl" />
          ) : (
            <>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="min-h-[44px] rounded-xl">
                {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading…</> : <><Upload className="mr-2 h-4 w-4" />Choose image</>}
              </Button>
            </>
          )}
          {imagePreview && <div className="h-32 w-32 rounded-xl border border-border overflow-hidden"><img src={imagePreview} alt="Preview" className="h-full w-full object-cover" /></div>}
        </div>

        {/* Visibility */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <Section n={4} title="Visibility" desc="Publish or keep as draft." />
          <div className="flex items-center gap-3">
            <Controller name="isPublished" control={control} render={({ field }) => (
              <Switch id="isPublished" checked={field.value} onCheckedChange={field.onChange} />
            )} />
            <Label htmlFor="isPublished" className="text-sm font-medium cursor-pointer">
              {watch("isPublished") ? "Published" : "Draft"}
            </Label>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto min-h-[44px] px-6 font-semibold rounded-xl bg-primary text-primary-foreground shadow-inset-btn hover:bg-brand-600">
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : <><Save className="mr-2 h-4 w-4" />Save Changes</>}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminEditResource;
