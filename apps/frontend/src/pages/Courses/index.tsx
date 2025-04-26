import { useState } from "react";
import { trpc } from "../../api/trpc";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const Courses = () => {
  const [accessToken, setAccessToken] = useState("");
  const navigate = useNavigate();

  const { mutate, error } =
    trpc.canvas.authenticateAccessToken.useMutation({
      onSuccess(data) {
        toast.success(`Authenticated successfully`);
        // Navigate or store user details
        // navigate("/dashboard");
      },
      onError(error) {
        console.error("Authentication Error:", error);
        toast.error(error.message || "Authentication failed");
      },
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!accessToken.trim()) {
      toast.error("Please enter an access token");
      return;
    }

    console.log("Attempting to authenticate with token:", accessToken);

    mutate({
      accessToken,
    });
  };

  // Debug logging for any tRPC errors
  if (error) {
    console.error("tRPC Mutation Error:", error);
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white">
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e0e0e0_1px,transparent_1px),linear-gradient(to_bottom,#e0e0e0_1px,transparent_1px)] bg-[size:14px_14px]"></div>

      {/* Soft background blobs */}
      <div className="absolute left-1/4 top-0 w-[35vw] h-[35vw] bg-[radial-gradient(circle_at_center,#f0e6ff,#ffccf9)] opacity-50 blur-[80px] rounded-full"></div>
      <div className="absolute right-1/3 top-1/4 w-[25vw] h-[25vw] bg-[radial-gradient(circle_at_center,#cce4ff,#ccf2f1)] opacity-60 blur-[80px] rounded-full"></div>

      <div className="relative z-10 w-full max-w-md px-4 sm:px-6 lg:px-8">
        <div className="bg-white/30 backdrop-blur-lg rounded-2xl shadow-lg p-6 sm:p-8 space-y-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-center text-gray-800 mb-4">
            Enter Canvas Access Token
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Paste your Canvas LMS token here"
              className="w-full px-4 py-3 rounded-full bg-white/30 backdrop-blur-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-200 text-gray-800"
            />

            <button
              type="submit"
              disabled={false}
              className="w-full relative inline-flex items-center justify-center p-[2px] overflow-hidden text-base sm:text-lg font-bold text-gray-800 rounded-full group bg-gradient-to-r from-blue-100 via-cyan-100 to-teal-100 backdrop-blur-lg hover:brightness-110 transition duration-300 shadow-sm disabled:opacity-50"
            >
              <span className="relative px-6 sm:px-8 py-3 sm:py-4 bg-white/30 rounded-full group-hover:bg-white/50 text-gray-800 transition-all ease-in-out duration-300 group-hover:scale-105 w-full">
                {false ? "Authenticating..." : "Submit Token"}
              </span>
            </button>
          </form>

          {/* Error display for debugging */}
          {error && (
            <div className="text-red-500 text-sm text-center mt-4">
              Error: {error.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Courses;
