import { supabase } from "@/integrations/supabase/client";

function sanitizeStoragePath(path: string): string {
  const parts = path.split("/").map((part) =>
    part
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 96),
  );
  const joined = parts.filter(Boolean).join("/");
  return joined || "upload";
}

export async function uploadAdminImage(
  path: string,
  file: File,
  t: (key: string) => string,
): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error(t("admin.notImage"));
  if (file.size > 8 * 1024 * 1024) throw new Error(t("admin.tooLarge5mb"));
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const base = sanitizeStoragePath(path.replace(/\.[^./]+$/, ""));
  const storagePath = `${base}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("product-media")
    .upload(storagePath, file, { contentType: file.type, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("product-media").getPublicUrl(storagePath);
  if (!data.publicUrl) throw new Error(t("admin.urlFailed"));
  return `${data.publicUrl}?v=${Date.now()}`;
}
