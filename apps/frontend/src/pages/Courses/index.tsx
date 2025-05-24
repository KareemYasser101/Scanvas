import { useState, useEffect } from "react";
import { trpc } from "../../api/trpc";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton";

const Courses = () => {
  const navigate = useNavigate();
  const accessToken = localStorage.getItem("canvasAccessToken");
  const userName = localStorage.getItem("userName") || "there";
  const userAvatar = localStorage.getItem("userAvatar") || null;

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (document.referrer.includes("auth")) {
      navigate("/");
    } else {
      navigate(-1);
    }
  };

  // Fetch courses query
  const coursesQuery = trpc.canvas.getCourses.useQuery(
    { accessToken: accessToken || "" },
    {
      enabled: !!accessToken,
    }
  );

  // Handle no access token or query errors
  useEffect(() => {
    if (!accessToken) {
      navigate("/auth");
      return;
    }

    if (coursesQuery.error) {
      toast.error(coursesQuery.error.message || "Failed to fetch courses");
      navigate("/auth");
    }
  }, [accessToken, coursesQuery.error, navigate]);

  // Loading state
  if (coursesQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-white p-8">
      <div className="fixed top-3 left-3 z-20">
        <BackButton onClick={handleBack}/>
      </div>

      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-4">
          {userAvatar ? (
            <img
              src={userAvatar}
              alt="Profile"
              className="w-12 h-12 rounded-full border-2 border-white shadow-md"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-200 border-2 border-white shadow-md flex items-center justify-center">
              <span className="text-gray-500 text-xl font-semibold">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-800">Hi, {userName}!</h1>
        </div>
      </div>

      {/* Background gradient blobs */}
      <div className="absolute left-1/4 top-0 w-[35vw] h-[35vw] bg-[radial-gradient(circle_at_center,#f0e6ff,#ffccf9)] opacity-50 blur-[80px] rounded-full"></div>
      <div className="absolute right-1/3 top-1/4 w-[25vw] h-[25vw] bg-[radial-gradient(circle_at_center,#cce4ff,#ccf2f1)] opacity-60 blur-[80px] rounded-full"></div>

      <div className="relative z-10">
        <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">
          Your Courses
        </h1>

        {coursesQuery.data?.courses &&
        coursesQuery.data.courses.length === 0 ? (
          <div className="text-center text-gray-600">
            No courses found. Try refreshing your access token.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coursesQuery.data?.courses.map((course) => (
              <div
                key={course.id}
                className="bg-white shadow-lg rounded-xl overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <div
                  onClick={() => navigate(`/attendance/${course.id}`)}
                  className="p-6"
                >
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">
                    {course.name}
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Course Code: {course.course_code}
                  </p>
                  <div className="flex justify-between text-xs text-gray-500">
                    {course.start_at && (
                      <span>
                        Starts: {new Date(course.start_at).toLocaleDateString()}
                      </span>
                    )}
                    {course.end_at && (
                      <span>
                        Ends: {new Date(course.end_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;
