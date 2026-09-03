import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UTApi, UploadThingError } from "uploadthing/server";
import { auth } from "@/lib/auth/server";

const f = createUploadthing();
const utapi = new UTApi();

function extractFileKey(url: string | null | undefined): string | null {
  if (!url) return null;
  const parts = url.split("/");
  const key = parts[parts.length - 1];
  return key || null;
}

export const ourFileRouter = {
  imageUploader: f({
    image: {
      maxFileSize: "1MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => {
      const session = await auth.api.getSession({
        headers: req.headers,
      });

      if (!session) {
        throw new UploadThingError("Unauthorized");
      }

      return {
        userId: session.user.id,
        currentImage: session.user.image,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const oldImageKey = extractFileKey(metadata.currentImage);

      if (oldImageKey) {
        try {
          await utapi.deleteFiles(oldImageKey);
          console.log("Deleted old profile picture:", oldImageKey);
        } catch (error) {
          console.error("Failed to delete old image:", error);
        }
      }

      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
