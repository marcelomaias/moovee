"use client";

import { useRouter } from "next/navigation";
import { UploadButton } from "@/lib/uploadthing";
import { authClient } from "@/lib/auth/client";

export function AvatarUpload() {
  const router = useRouter();
  const { refetch } = authClient.useSession();

  return (
    <UploadButton
      endpoint="imageUploader"
      onClientUploadComplete={async (res) => {
        const imageUrl = res?.[0]?.ufsUrl || res?.[0]?.url;

        if (!imageUrl) {
          console.error("No valid image URL returned from UploadThing");
          return;
        }

        const { error } = await authClient.updateUser({
          image: imageUrl,
        });

        if (error) {
          console.error("Failed to update avatar:", error);
          return;
        }

        // Update BetterAuth client session
        await refetch();
        // Force Next.js App Router to fetch new server data and re-render components
        router.refresh();
      }}
      onUploadError={(error) => {
        console.error("Upload error:", error);
      }}
    />
  );
}
