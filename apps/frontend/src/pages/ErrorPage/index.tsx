import React from "react";
import { useRouteError, useNavigate } from "react-router-dom";

const ErrorPage = () => {
  const error = useRouteError() as {
    status?: number;
    statusText?: string;
    message?: string;
  };
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* Background gradient blobs */}
      <div className="absolute left-1/4 top-0 w-[35vw] h-[35vw] bg-[radial-gradient(circle_at_center,#f0e6ff,#ffccf9)] opacity-50 blur-[80px] rounded-full z-0"></div>
      <div className="absolute right-1/3 top-1/4 w-[25vw] h-[25vw] bg-[radial-gradient(circle_at_center,#cce4ff,#ccf2f1)] opacity-60 blur-[80px] rounded-full z-0"></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/90 rounded-3xl shadow-2xl backdrop-blur-sm border-none p-8 text-center">
          <div className="mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-24 w-24 mx-auto text-red-500 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
              />
            </svg>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {error.status
                ? `Error ${error.status}`
                : "Oops! Something went wrong"}
            </h1>
            <p className="text-gray-600 mb-4">
              {error.statusText ||
                error.message ||
                "An unexpected error occurred"}
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => navigate("/")}
              className="w-full py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition text-sm font-semibold"
            >
              Return to Home
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-white border border-gray-300 text-gray-800 rounded-xl hover:bg-gray-100 transition text-sm font-semibold"
            >
              Reload Page
            </button>
          </div>

          <div className="mt-6 text-xs text-gray-500">
            If the problem persists, please contact support.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
