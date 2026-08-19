"use client";

import { useRef } from "react";
import { ImagePlus } from "lucide-react";
import { useUploadThing } from "~/utils/uploadthing";

export function PortraitUploader({
  projectId,
  disabled,
  onComplete,
}: {
  projectId: string;
  disabled: boolean;
  onComplete: (asset: { id: string; url: string }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { startUpload, isUploading } = useUploadThing("characterPortrait", {
    onClientUploadComplete: (files) => {
      const response = files[0]?.serverData;
      if (response) onComplete({ id: response.id, url: response.url });
    },
  });
  return (
    <>
      <button
        disabled={disabled || isUploading}
        className="upload-field"
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus size={17} />
        <span>
          {isUploading ? "Uploading portrait…" : "Upload an image"}
          <small>PNG, JPG or WebP · max 8 MB</small>
        </span>
      </button>
      <input
        ref={inputRef}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void startUpload([file], { projectId });
          event.target.value = "";
        }}
      />
    </>
  );
}
