import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "../../api/trpc";
import { toast } from "react-hot-toast";

const OCR: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [extractedIds, setExtractedIds] = useState<string[]>([]);

  const accessToken = localStorage.getItem("canvasAccessToken");

  // Validate access token
  useEffect(() => {
    if (!accessToken) {
      toast.error("Please authenticate first");
      navigate("/auth");
    }
  }, [accessToken, navigate]);

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
      console.log("OCR Extraction Result:", result);
      if (result.success) {
        // Store the raw text
        setExtractedText(result.text);

        // Extract 9-digit student IDs from the text
        const studentIds = result.text.match(/\b\d{9}\b/g) || [];
        const uniqueStudentIds = [...new Set(studentIds)];

        if (uniqueStudentIds.length > 0) {
          setExtractedIds(uniqueStudentIds);
        } else {
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

  // Handle extraction
  const handleExtract = () => {
    if (!imagePreview) {
      toast.error("Please upload an image first");
      return;
    }

    // Log the image preview to verify base64 encoding
    console.log(
      "Image Preview (first 100 chars):",
      imagePreview.substring(0, 100)
    );

    extractOCR.mutate({
      imageUrl: imagePreview,
    });
  };

  // Close modal
  const closeModal = () => {
    setExtractedText(null);
    setExtractedIds([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* Background gradient blobs */}
      <div className="absolute left-1/4 top-0 w-[35vw] h-[35vw] bg-[radial-gradient(circle_at_center,#f0e6ff,#ffccf9)] opacity-50 blur-[80px] rounded-full z-0"></div>
      <div className="absolute right-1/3 top-1/4 w-[25vw] h-[25vw] bg-[radial-gradient(circle_at_center,#cce4ff,#ccf2f1)] opacity-60 blur-[80px] rounded-full z-0"></div>

      <div className="relative z-10 w-full max-w-2xl">
        <div className="bg-white/90 rounded-3xl shadow-2xl backdrop-blur-sm border-none p-8">
          <h1 className="text-2xl font-semibold text-gray-800 text-center mb-6">
            OCR Student ID Extraction
          </h1>

          {/* Image Preview Area */}
          <div className="mb-6 h-80 bg-gray-100/50 rounded-2xl flex items-center justify-center overflow-hidden relative">
            {imagePreview ? (
              <div className="w-full h-full relative">
                <img
                  src={imagePreview}
                  alt="OCR Preview"
                  className="w-full h-full object-cover rounded-2xl"
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
          <div className="grid grid-cols-2 gap-4 mb-6">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-2 text-sm font-medium text-gray-800 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition flex items-center justify-center space-x-2 shadow-sm cursor-pointer"
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
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>Upload Image</span>
            </button>
          </div>

          {/* Extract Button */}
          <button
            onClick={handleExtract}
            disabled={!imagePreview}
            className="w-full py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Extract
          </button>

          {/* Results Modal */}
          {(extractedText || extractedIds.length > 0) && (
            <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full">
                <h2 className="text-xl font-semibold mb-4">
                  Extraction Results
                </h2>

                {/* Extracted Student IDs */}
                {extractedIds.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-lg font-medium mb-2">Student IDs:</h3>
                    {extractedIds.map((id, index) => (
                      <div key={index} className="bg-gray-100 p-2 rounded mb-2">
                        {id}
                      </div>
                    ))}
                  </div>
                )}

                {/* Raw Extracted Text */}
                {extractedText && (
                  <div className="mb-4">
                    <h3 className="text-lg font-medium mb-2">
                      Extracted Text:
                    </h3>
                    <div className="bg-gray-100 p-2 rounded max-h-40 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm">
                        {extractedText}
                      </pre>
                    </div>
                  </div>
                )}

                <button
                  onClick={closeModal}
                  className="w-full py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
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
