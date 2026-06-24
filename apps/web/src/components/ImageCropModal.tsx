'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';

interface Props {
  src: string;
  aspect: number;
  shape?: 'round' | 'rect';
  onConfirm: (file: File) => void;
  onCancel: () => void;
  zh?: boolean;
}

async function getCroppedFile(imageSrc: string, pixelCrop: Area): Promise<File> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height,
  );
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(new File([blob!], 'crop.jpg', { type: 'image/jpeg' })),
      'image/jpeg',
      0.92,
    );
  });
}

export default function ImageCropModal({ src, aspect, shape = 'rect', onConfirm, onCancel, zh }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [confirming, setConfirming] = useState(false);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setConfirming(true);
    try {
      const file = await getCroppedFile(src, croppedAreaPixels);
      onConfirm(file);
    } catch {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black/90">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition"
        >
          {zh ? '取消' : 'Cancel'}
        </button>
        <p className="text-white text-sm font-semibold">{zh ? '調整照片' : 'Adjust Photo'}</p>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={confirming}
          className="text-indigo-400 font-semibold text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition disabled:opacity-50"
        >
          {confirming ? '…' : (zh ? '完成' : 'Done')}
        </button>
      </div>

      {/* Crop area */}
      <div className="relative flex-1">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          cropShape={shape}
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      {/* Zoom slider */}
      <div className="shrink-0 flex flex-col items-center gap-2 px-6 py-4 bg-black/60">
        <p className="text-gray-400 text-xs">{zh ? '捏合或滾動縮放・拖曳調整位置' : 'Scroll to zoom · Drag to reposition'}</p>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-48 accent-indigo-500"
        />
      </div>
    </div>
  );
}
