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

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [assignmentName, setAssignmentName] = useState(
    `Attendance - ${new Date().toLocaleDateString()}`
  );
  const [pointsPossible, setPointsPossible] = useState(1);

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

  // Camera capture methods
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

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      context?.drawImage(videoRef.current, 0, 0, 400, 300);
      const imageDataUrl = canvasRef.current.toDataURL("image/jpeg");
      setImagePreview(imageDataUrl);
      setIsCameraActive(false);

      // Stop video stream
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
    }
  };

  // Mutation for creating attendance assignment
  const createAttendanceAssignment =
    trpc.canvas.create_Mark_AttendanceAssignment.useMutation({
      onSuccess: (result) => {
        if (result.success) {
          toast.success(
            `Attendance marked for ${result.markedStudents} students`
          );
          setImagePreview(null);
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

  // Attendance marking handler
  const handleMarkAttendance = () => {
    if (!imagePreview) {
      toast.error("Please upload or capture an image first");
      return;
    }

    if (!cid) {
      toast.error("Course ID is missing");
      return;
    }

    createAttendanceAssignment.mutate({
      accessToken: accessToken || "",
      courseId: cid,
      imageUrl: imagePreview,
      assignmentName,
      pointsPossible,
    });
  };

  return (
    <div className=" min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* Background gradient blobs */}
      <div className="absolute left-1/4 top-0 w-[35vw] h-[35vw] bg-[radial-gradient(circle_at_center,#f0e6ff,#ffccf9)] opacity-50 blur-[80px] rounded-full z-0"></div>
      <div className="absolute right-1/3 top-1/4 w-[25vw] h-[25vw] bg-[radial-gradient(circle_at_center,#cce4ff,#ccf2f1)] opacity-60 blur-[80px] rounded-full z-0"></div>

      <div className="relative z-10 w-full max-w-2xl">
        <div className="bg-white/90 rounded-3xl shadow-2xl backdrop-blur-sm border-none p-8">
          <h1 className="text-2xl font-semibold text-gray-800 text-center mb-6">
            Mark Attendance
          </h1>

          {/* Image Preview Area */}
          <div className="mb-6 h-80 bg-gray-100/50 rounded-2xl flex items-center justify-center overflow-hidden relative">
            {imagePreview ? (
              <div className="w-full h-full relative">
                <img
                  src={imagePreview}
                  alt="Attendance"
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
            ) : isCameraActive ? (
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
            ) : (
              <p className="text-gray-500">No image selected</p>
            )}
          </div>

          {/* Assignment Details Inputs */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label
                htmlFor="assignmentName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Assignment Name
              </label>
              <input
                type="text"
                id="assignmentName"
                value={assignmentName}
                onChange={(e) => setAssignmentName(e.target.value)}
                className="w-full py-2 px-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter assignment name"
              />
            </div>
            <div>
              <label
                htmlFor="pointsPossible"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Points Possible
              </label>
              <input
                type="number"
                id="pointsPossible"
                value={pointsPossible}
                onChange={(e) => setPointsPossible(Number(e.target.value))}
                min="0.5"
                step="0.5"
                className="w-full py-2 px-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter points"
              />
            </div>
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
            <button
              onClick={isCameraActive ? captureImage : startCamera}
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
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>{isCameraActive ? "Capture" : "Use Camera"}</span>
            </button>
          </div>

          {/* Mark Attendance Button */}
          <button
            onClick={handleMarkAttendance}
            className="w-full py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition text-sm font-semibold cursor-pointer"
          >
            Mark Attendance
          </button>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
