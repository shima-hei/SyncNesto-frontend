"use client";

import { useRef, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { ImageIcon } from "lucide-react";

import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { useUpdateCurrentUserAvatar } from "@/features/auth/hooks/use-update-current-user-avatar";

import { createCroppedImageBlob } from "../../utils/crop-image";

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

type AvatarUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AvatarUploadDialog({
  open,
  onOpenChange,
}: AvatarUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    updateCurrentUserAvatar,
    deleteCurrentUserAvatar,
    isUpdating,
    isDeleting,
    error: uploadError,
  } = useUpdateCurrentUserAvatar();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropArea, setCropArea] = useState<Area | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);

    if (!nextOpen) {
      resetState();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("PNG、JPEG、WebP の画像を選択してください。");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("画像サイズは2MB以下にしてください。");
      return;
    }

    setError(null);
    setImageSrc(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleCropComplete = (_croppedArea: Area, croppedAreaPixels: Area) => {
    setCropArea(croppedAreaPixels);
  };

  const handleConfirm = async () => {
    if (!imageSrc || !cropArea) {
      setError("画像を選択してください。");
      return;
    }

    try {
      const blob = await createCroppedImageBlob(imageSrc, cropArea);
      await updateCurrentUserAvatar(blob);
      handleOpenChange(false);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "画像の更新に失敗しました。"
      );
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCurrentUserAvatar();
      setDeleteDialogOpen(false);
      handleOpenChange(false);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "画像の削除に失敗しました。"
      );
    }
  };

  const resetState = () => {
    if (imageSrc) {
      URL.revokeObjectURL(imageSrc);
    }

    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropArea(null);
    setError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>アイコン画像を変更</DialogTitle>
          <DialogDescription>
            画像を選択して、表示したい範囲を調整してください。
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="sr-only"
          onChange={handleFileChange}
        />

        <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-full border bg-muted text-muted-foreground">
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          ) : (
            <button
              type="button"
              className="flex size-full flex-col items-center justify-center gap-2 text-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon />
              画像を選択
            </button>
          )}
        </div>

        {imageSrc ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span>ズーム</span>
              <span className="text-muted-foreground">{zoom.toFixed(1)}x</span>
            </div>
            <Slider
              min={1}
              max={3}
              step={0.1}
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0] ?? 1)}
            />
          </div>
        ) : null}

        {error ? <FieldError>{error}</FieldError> : null}
        {uploadError ? <FieldError>{uploadError.message}</FieldError> : null}

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isUpdating || isDeleting}
          >
            {isDeleting ? <Spinner data-icon="inline-start" /> : null}
            削除
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUpdating || isDeleting}
            >
              画像を選択
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!imageSrc || isUpdating || isDeleting}
            >
              {isUpdating ? <Spinner data-icon="inline-start" /> : null}
              確定
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="アイコン画像を削除しますか？"
        description="削除するとデフォルト画像に戻ります。"
        confirmLabel="削除"
        destructive
        isPending={isDeleting}
        onConfirm={handleDelete}
      />
    </Dialog>
  );
}
