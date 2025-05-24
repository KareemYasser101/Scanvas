import { useState, useEffect } from "react";
import { trpc } from "../../api/trpc";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton";

const Auth = () => {
  const [accessToken, setAccessToken] = useState("");
  const [isVerifying, setIsVerifying] = useState(true);
  const navigate = useNavigate();

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/');
  };

  const {
    mutate: verifyToken,
    isPending,
    error,
  } = trpc.canvas.authenticateAccessToken.useMutation({
    onSuccess(data) {
      // Store user data
      localStorage.setItem("canvasAccessToken", accessToken);
      localStorage.setItem("userName", data.user.name);
      localStorage.setItem("userAvatar", data.user.avatarUrl);

      // Only show success message if it's a new login
      if (!isVerifying) {
        toast.success(`Welcome back, ${data.user.name}!`);
      }

      // Navigate to courses if not already there
      if (!window.location.pathname.includes("courses")) {
        navigate("/courses");
      }
    },
    onError(error) {
      console.error("Authentication Error:", error);
      localStorage.removeItem("canvasAccessToken");
      localStorage.removeItem("userName");
      localStorage.removeItem("userAvatar");
      if (!isVerifying) {
        toast.error(error.message || "Authentication failed");
      }
      setIsVerifying(false);
    },
  });

  // Check for existing token on component mount
  useEffect(() => {
    const token = localStorage.getItem("canvasAccessToken");

    if (token) {
      verifyToken({ accessToken: token });
    } else {
      setIsVerifying(false);
    }
  }, [navigate, verifyToken]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken.trim()) {
      toast.error("Please enter an access token");
      return;
    }
    setIsVerifying(false);
    verifyToken({ accessToken });
  };

  const token = localStorage.getItem("canvasAccessToken");
  if (token && !isVerifying) {
    return null;
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed top-3 left-3 z-20">
        <BackButton onClick={handleBack} />
      </div>

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
              disabled={isPending}
              className={`w-full relative inline-flex items-center justify-center p-[2px] overflow-hidden text-base sm:text-lg font-bold text-gray-800 rounded-full group bg-gradient-to-r from-blue-100 via-cyan-100 to-teal-100 backdrop-blur-lg hover:brightness-110 transition duration-300 shadow-sm ${isPending ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span className="relative px-6 sm:px-8 py-3 sm:py-4 bg-white/30 rounded-full group-hover:bg-white/50 text-gray-800 transition-all ease-in-out duration-300 group-hover:scale-105 w-full flex items-center justify-center">
                {isPending ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-800"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Authenticating...
                  </>
                ) : (
                  "Submit Token"
                )}
              </span>
            </button>
          </form>

          {error && (
            <div className="text-red-500 text-sm text-center mt-4">
              Error: {error.message}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Auth;
