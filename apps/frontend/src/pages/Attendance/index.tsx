import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { trpc } from "../../api/trpc";
import { toast } from "react-hot-toast";

const Attendance: React.FC = () => {
  const { cid } = useParams<{ cid: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Now storing multiple images
  const [images, setImages] = useState<string[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [assignmentName, setAssignmentName] = useState(
    `Attendance - ${new Date().toLocaleDateString()}`
  );
  const [pointsPossible, setPointsPossible] = useState(1);
  const [accessToken, setAccessToken] = useState("");

  const AccessToken = localStorage.getItem("canvasAccessToken");

  // Validate access token
  useEffect(() => {
    if (!AccessToken) {
      toast.error("Please authenticate first");
      navigate("/auth");
    } else {
      setAccessToken(AccessToken);
    }
  });

  // Handle selecting multiple files
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
      // clear to allow re-uploading same files if needed
      e.target.value = "";
    }
  };

  // Start camera stream
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      toast.error("Unable to access camera");
      console.error(error);
    }
  };

  // Capture current frame into images array
  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      context?.drawImage(videoRef.current, 0, 0, 400, 300);
      const imageDataUrl = canvasRef.current.toDataURL("image/jpeg");
      setImages((prev) => [...prev, imageDataUrl]);
    }
  };

  // Stop camera and close view
  const closeCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setIsCameraActive(false);
  };

  // Mutation for creating attendance with multiple images
  const createAttendanceAssignment =
    trpc.canvas.create_Mark_AttendanceAssignment.useMutation({
      onSuccess: (result) => {
        if (result.success) {
          toast.success(
            `Attendance marked for ${result.markedStudents} students`
          );
          setImages([]);
          navigate("/");
        } else {
          toast.error("Failed to mark attendance");
        }
      },
      onError: (error) => {
        console.error("Attendance marking error:", error);
        toast.error("An error occurred while marking attendance");
      },
    });

  // Submit handler
  const handleMarkAttendance = () => {
    if (images.length === 0) {
      toast.error("Please upload or capture at least one image first");
      return;
    }
    if (!cid) {
      toast.error("Course ID is missing");
      return;
    }

    createAttendanceAssignment.mutate({
      accessToken: accessToken || "",
      courseId: cid,
      // send array of image URLs
      imageUrls: images,
      assignmentName,
      pointsPossible,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* ... background blobs ... */}
      <div className="relative z-10 w-full max-w-2xl">
        <div className="bg-white/90 rounded-3xl shadow-2xl backdrop-blur-sm p-8">
          <h1 className="text-2xl font-semibold text-gray-800 text-center mb-6">
            Mark Attendance
          </h1>

          {/* Preview area: either camera or grid of images or placeholder */}
          <div className="mb-6 h-80 bg-gray-100/50 rounded-2xl flex items-center justify-center overflow-hidden relative">
            {isCameraActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  className="w-full h-full object-cover rounded-2xl"
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
                      alt={`Attendance ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={() =>
                        setImages((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="absolute top-1 right-1 bg-white/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
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
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No images selected</p>
            )}
          </div>

          {/* Inputs for assignment details */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Assignment Name */}
            <div className="space-y-1">
              <label
                htmlFor="assignmentName"
                className="block text-sm font-medium text-gray-700"
              >
                Assignment Name
              </label>
              <input
                type="text"
                id="assignmentName"
                value={assignmentName}
                onChange={(e) => setAssignmentName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter assignment name"
              />
            </div>

            {/* Points Possible */}
            <div className="space-y-1">
              <label
                htmlFor="pointsPossible"
                className="block text-sm font-medium text-gray-700"
              >
                Points Possible
              </label>
              <input
                type="number"
                id="pointsPossible"
                min="0.5"
                step="0.5"
                value={pointsPossible}
                onChange={(e) => setPointsPossible(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="1"
              />
            </div>
          </div>

          {/* Action Buttons: Upload, Capture, Close (if camera active) */}
          <div
            className={`${isCameraActive ? "grid-cols-3" : "grid-cols-2"} grid gap-4 mb-6`}
          >
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
              className="w-full py-3 px-2 text-sm font-medium text-gray-800 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition flex items-center justify-center space-x-2 shadow-sm"
            >
              {/* upload icon and label */}
              <span>Upload Images</span>
            </button>
            <button
              onClick={isCameraActive ? captureImage : startCamera}
              className="w-full py-3 px-2 text-sm font-medium text-gray-800 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition flex items-center justify-center space-x-2 shadow-sm"
            >
              <span>{isCameraActive ? "Capture" : "Use Camera"}</span>
            </button>
            {isCameraActive && (
              <button
                onClick={closeCamera}
                className="w-full py-3 px-2 text-sm font-medium text-gray-800 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition flex items-center justify-center space-x-2 shadow-sm"
              >
                <span>Close Camera</span>
              </button>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleMarkAttendance}
            className="w-full py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition text-sm font-semibold"
          >
            Mark Attendance
          </button>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
