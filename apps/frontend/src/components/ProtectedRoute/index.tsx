import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("canvasAccessToken");
    if (!token) {
      setIsLoading(false);
      return;
    }

    // Optional: Verify token with backend
    const verifyToken = async () => {
      try {
        // You can add a token verification endpoint in your backend
        // const response = await fetch('/api/verify-token', {
        //   headers: { 'Authorization': `Bearer ${token}` }
        // });
        // const data = await response.json();
        // setIsAuthenticated(data.valid);
        
        // For now, we'll just check if token exists
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Token verification failed:", error);
        localStorage.removeItem("canvasAccessToken");
        localStorage.removeItem("userName");
        localStorage.removeItem("userAvatar");
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to /auth but save the current location they were trying to go to
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;