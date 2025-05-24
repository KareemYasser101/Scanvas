import React, { useState, useRef, useEffect } from "react";
import { trpc } from "../../api/trpc";
import { toast } from "react-hot-toast";
import BackButton from "../../components/BackButton";

const OCR: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [images, setImages] = useState<string[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [extractedIds, setExtractedIds] = useState<string[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
  }, [stream]);

  const startCamera = async () => {
    try {
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: isMobile ? "environment" : "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setStream(stream);
      setIsCameraActive(true);
    } catch (e) {
      toast.error("Could not access camera");
    }
  };

  const closeCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setIsCameraActive(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        const { videoWidth, videoHeight } = videoRef.current;
        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;

        context.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);
        const imageDataUrl = canvasRef.current.toDataURL("image/jpeg", 0.95);
        setImages((prev) => [...prev, imageDataUrl]);

        closeCamera();
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImages((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
      e.target.value = "";
    }
  };

  const extractOCR = trpc.ocr.extractStudentIds.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        setExtractedIds(result.ocrExtractedIds);
        if (result.ocrExtractedIds.length === 0) {
          toast.error("No student IDs found in the image");
        }
      } else {
        toast.error("Failed to extract text");
      }
    },
    onError: (error) => {
      console.error("OCR extraction error:", error);
      toast.error(`Extraction failed: ${error.message}`);
    },
  });

  const handleExtract = () => {
    if (images.length === 0) {
      toast.error("Please upload or capture at least one image first");
      return;
    }
    extractOCR.mutate({ imageUrls: images });
  };

  const closeModal = () => {
    setExtractedIds([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="fixed top-3 left-3 z-20">
        <BackButton />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        <div className="bg-white/90 rounded-3xl shadow-2xl backdrop-blur-sm p-8">
          <h1 className="text-2xl font-semibold text-gray-800 text-center mb-6">
            OCR Student ID Extraction
          </h1>

          <div className="mb-6 max-h-[60vh] bg-gray-100/50 rounded-2xl flex items-center justify-center overflow-hidden relative">
            {isCameraActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-contain rounded-2xl transition-opacity"
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                  width="400"
                  height="300"
                />
              </>
            ) : images.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 w-full h-full p-2 overflow-auto">
                {images.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Captured ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={() =>
                        setImages((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="absolute top-1 right-1 bg-white/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No images selected</p>
            )}
          </div>

          <div className={`grid gap-4 mb-6 ${isCameraActive ? "grid-cols-3" : "grid-cols-2"}`}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              multiple
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 cursor-pointer"
            >
              📁 Upload Images
            </button>
            <button
              onClick={isCameraActive ? captureImage : startCamera}
              className="py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 cursor-pointer"
            >
              {isCameraActive ? "📸 Capture" : "📷 Use Camera"}
            </button>
            {isCameraActive && (
              <button
                onClick={closeCamera}
                className="py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 cursor-pointer"
              >
                ❌ Close Camera
              </button>
            )}
          </div>

          <button
            onClick={handleExtract}
            disabled={images.length === 0 || extractOCR.isPending}
            className={`w-full py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition text-sm font-semibold cursor-pointer ${
              extractOCR.isPending ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {extractOCR.isPending
              ? `⏳ Extracting IDs...`
              : `Extract IDs from ${images.length} image${images.length > 1 ? "s" : ""}`}
          </button>

          {extractedIds.length > 0 && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                <h2 className="text-xl font-semibold mb-4">
                  Extraction Results
                </h2>
                <div className="space-y-2">
                  {extractedIds.map((id, index) => (
                    <div
                      key={index}
                      className="bg-gray-100 p-3 rounded-lg font-mono"
                    >
                      {id}
                    </div>
                  ))}
                </div>
                <button
                  onClick={closeModal}
                  className="w-full mt-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OCR;
