/**
 * Shared Cloudinary helpers for the admin dashboard.
 * Files upload straight from the browser to Cloudinary using a server-signed
 * payload — the API secret never leaves the server.
 */

type SignResponse = {
  cloud_name: string;
  api_key: string;
  timestamp: number;
  signature: string;
  folder: string;
  resource_type: string;
  upload_url: string;
};

export async function uploadToCloudinary(
  file: File,
  opts: { resourceType?: "video" | "image"; folderKey?: "showcase" | "preview" } = {}
): Promise<string> {
  const signRes = await fetch("/api/admin/cloudinary-sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resource_type: opts.resourceType ?? "video",
      folder_key: opts.folderKey ?? "showcase",
    }),
  });
  const sign = (await signRes.json()) as SignResponse & { error?: string };
  if (!signRes.ok) throw new Error(sign.error || "Could not get upload signature");

  const data = new FormData();
  data.append("file", file);
  data.append("api_key", sign.api_key);
  data.append("timestamp", String(sign.timestamp));
  data.append("signature", sign.signature);
  data.append("folder", sign.folder);

  const upRes = await fetch(sign.upload_url, { method: "POST", body: data });
  const up = await upRes.json();
  if (!upRes.ok) throw new Error(up.error?.message || "Upload failed");
  return up.secure_url as string;
}

/**
 * Ask the server to delete a mixing order's preview from Cloudinary and clear
 * the order's preview_link. Safe to call any time; no-ops when there's nothing
 * to delete. Never throws — failures are retried on next page load.
 */
export async function deleteMixPreview(orderId: string): Promise<void> {
  try {
    await fetch("/api/mixing/delete-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId }),
    });
  } catch {
    // Silent — retried on next page load.
  }
}

export function isCloudinaryUrl(url: string | null | undefined): boolean {
  return !!url && url.includes("res.cloudinary.com");
}
