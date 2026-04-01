// ImgBB upload helper
// Expects IMGBB_API_KEY in env.

export async function uploadToImgBB({ base64, name }) {
  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) throw new Error("IMGBB_API_KEY is not set");

  const form = new URLSearchParams();
  form.set("key", apiKey);
  form.set("image", base64);
  if (name) form.set("name", name);

  const res = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  const json = await res.json();
  if (!res.ok || !json?.success) {
    throw new Error(json?.error?.message || "ImgBB upload failed");
  }

  return {
    url: json.data.url,
    deleteUrl: json.data.delete_url,
    thumbUrl: json.data.thumb?.url,
  };
}

