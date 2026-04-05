"use client";

import Image from "next/image";

interface AvatarUploadProps {
  avatarPreview: string | null;
  onFileChange: (file: File | null) => void;
  /** Whether a file is currently selected (controls the REMOVE button) */
  hasFile: boolean;
  /** Max file size in bytes — defaults to 2MB */
  maxSize?: number;
  onError?: (message: string) => void;
}

export default function AvatarUpload({
  avatarPreview,
  onFileChange,
  hasFile,
  maxSize = 2 * 1024 * 1024,
  onError,
}: AvatarUploadProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxSize) {
      onError?.("IMAGE TOO LARGE — MAX 2MB");
      return;
    }
    onFileChange(file);
  }

  return (
    <div>
      <label
        className="font-display text-sm tracking-wider block mb-2"
        style={{ color: "var(--mid)" }}
      >
        PROFILE PHOTO
      </label>
      <div className="flex items-center gap-4">
        <label className="cursor-pointer">
          <div
            className="relative w-20 h-20 border-[3px] border-[var(--black)] flex items-center justify-center overflow-hidden transition-all hover:shadow-[4px_4px_0_var(--gold)]"
            style={{ background: "var(--beige)" }}
          >
            {avatarPreview ? (
              <Image
                src={avatarPreview}
                alt="Preview"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <span
                className="font-display text-2xl"
                style={{ color: "var(--mid)" }}
              >
                +
              </span>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
          />
        </label>
        <div>
          <p
            className="text-[10px] uppercase tracking-wider"
            style={{ color: "var(--mid)" }}
          >
            CLICK TO UPLOAD
          </p>
          <p className="text-[10px]" style={{ color: "var(--mid)" }}>
            JPG / PNG — MAX 2MB
          </p>
          {hasFile && (
            <button
              type="button"
              onClick={() => onFileChange(null)}
              className="text-[10px] uppercase tracking-wider mt-1"
              style={{ color: "var(--cardinal)" }}
            >
              REMOVE
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
