import React, { useState, useRef, useEffect } from "react";
import { trpc } from "../../api/trpc";
import { toast } from "react-hot-toast";
import BackButton from "../../components/BackButton";

const OCR: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [extractedIds, setExtractedIds] = useState<string[]>([]);

  // Camera setup
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
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

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        const { videoWidth, videoHeight } = videoRef.current;
        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;
        context.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);
        const imageDataUrl = canvasRef.current.toDataURL("image/jpeg", 0.95);
        setImagePreview(imageDataUrl);
        closeCamera();
      }
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  // Image upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // OCR Extraction mutation
  const extractOCR = trpc.ocr.extractStudentIds.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        setExtractedText(result.text);
        const studentIds = result.text.match(/\b\d{9}\b/g) || [];
        setExtractedIds([...new Set(studentIds)]);

        if (studentIds.length === 0) {
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
    if (!imagePreview) {
      toast.error("Please capture or upload an image first");
      return;
    }
    extractOCR.mutate({ imageUrl: imagePreview });
  };

  const closeModal = () => {
    setExtractedText(null);
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

          {/* Camera/Image Preview Area */}
          <div className="mb-6 max-h-[60vh] bg-gray-100/50 rounded-2xl flex items-center justify-center overflow-hidden relative">
            {isCameraActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-contain rounded-2xl"
                />
                <canvas ref={canvasRef} className="hidden" />
              </>
            ) : imagePreview ? (
              <div className="w-full h-full relative">
                <img
                  src={imagePreview}
                  alt="OCR Preview"
                  className="w-full h-full object-contain rounded-2xl"
                />
                <button
                  onClick={() => setImagePreview(null)}
                  className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded-full p-1 shadow-md transition cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <p className="text-gray-500">No image selected</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-6">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            {isCameraActive ? (
              <>
                <button
                  onClick={captureImage}
                  className="w-full py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition cursor-pointer"
                >
                  📸 Capture
                </button>
                <button
                  onClick={closeCamera}
                  className="w-full py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition cursor-pointer"
                >
                  ❌ Close
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>📁 Upload</span>
                </button>
                <button
                  onClick={startCamera}
                  className="w-full py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition cursor-pointer"
                >
                  📷 Use Camera
                </button>
              </>
            )}
          </div>

          {/* Extract Button */}
          <button
            onClick={handleExtract}
            disabled={!imagePreview || extractOCR.isPending}
            className={`w-full py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition text-sm font-semibold ${
              !imagePreview || extractOCR.isPending
                ? "opacity-70 cursor-not-allowed"
                : "cursor-pointer"
            }`}
          >
            {extractOCR.isPending ? "Extracting..." : "Extract Student IDs"}
          </button>

          {/* Results Modal */}
          {(extractedText || extractedIds.length > 0) && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                <h2 className="text-xl font-semibold mb-4">
                  Extraction Results
                </h2>

                {extractedIds.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-lg font-medium mb-2">Student IDs:</h3>
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
                  </div>
                )}

                {extractedText && (
                  <div className="mb-4">
                    <h3 className="text-lg font-medium mb-2">
                      Extracted Text:
                    </h3>
                    <div className="bg-gray-100 p-3 rounded-lg max-h-40 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {extractedText}
                      </pre>
                    </div>
                  </div>
                )}

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
