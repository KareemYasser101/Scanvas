import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const [isHydrated, setIsHydrated] = useState(false);
  const navigate = useNavigate();

  // Ensure hydration before animations
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      // Calculate mouse position as percentage of screen width/height
      const x = event.clientX / window.innerWidth;
      const y = event.clientY / window.innerHeight;
      setMousePosition({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Calculate transforms for each blob based on mouse position - with INCREASED movement
  const blob1Transform = {
    transform: `translate(${(mousePosition.x - 0.5) * -120}px, ${(mousePosition.y - 0.5) * -120}px) scale(${1 + (mousePosition.y - 0.5) * 0.1})`,
  };

  const blob2Transform = {
    transform: `translate(${(mousePosition.x - 0.5) * 150}px, ${(mousePosition.y - 0.5) * 150}px) rotate(${(mousePosition.x - 0.5) * 10}deg)`,
  };

  const blob3Transform = {
    transform: `translate(${(mousePosition.x - 0.5) * -100}px, ${(mousePosition.y - 0.5) * 100}px) scale(${1 + (mousePosition.x - 0.5) * 0.2})`,
  };

  const blob4Transform = {
    transform: `translate(${(mousePosition.x - 0.5) * 180}px, ${(mousePosition.y - 0.5) * -180}px) rotate(${(mousePosition.y - 0.5) * -15}deg)`,
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white">
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e0e0e0_1px,transparent_1px),linear-gradient(to_bottom,#e0e0e0_1px,transparent_1px)] bg-[size:14px_14px]"></div>

      {/* Mouse position indicator (for debugging) */}
      {isHydrated && (
        <div
          className="absolute w-4 h-4 bg-red-500 rounded-full z-50 pointer-events-none opacity-50"
          style={{
            left: `${mousePosition.x * 100}%`,
            top: `${mousePosition.y * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
        ></div>
      )}

      <div
        className="absolute left-1/4 top-0 w-[35vw] h-[35vw] bg-[radial-gradient(circle_at_center,#f0e6ff,#ffccf9)] opacity-50 blur-[80px] rounded-full transition-transform duration-300 ease-out"
        style={isHydrated ? blob1Transform : {}}
      ></div>
      <div
        className="absolute right-1/3 top-1/4 w-[25vw] h-[25vw] bg-[radial-gradient(circle_at_center,#cce4ff,#ccf2f1)] opacity-60 blur-[80px] rounded-full transition-transform duration-300 ease-out"
        style={isHydrated ? blob2Transform : {}}
      ></div>
      <div
        className="absolute left-1/3 bottom-0 w-[30vw] h-[30vw] bg-[radial-gradient(circle_at_center,#ffe6e6,#fff5cc)] opacity-50 blur-[80px] rounded-full transition-transform duration-300 ease-out"
        style={isHydrated ? blob3Transform : {}}
      ></div>
      <div
        className="absolute -right-1/4 bottom-1/4 w-[40vw] h-[40vw] bg-[radial-gradient(circle_at_center,#e6d8ff,#ffcce6)] opacity-40 blur-[100px] rounded-full transition-transform duration-300 ease-out"
        style={isHydrated ? blob4Transform : {}}
      ></div>

      <div className="absolute inset-0 bg-white/30"></div>

      <div className="relative z-10 text-gray-800 text-center px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-gray-800">
          Welcome to Scanvas
        </h1>
        <p className="text-base sm:text-lg lg:text-xl mt-3 sm:mt-4 text-gray-600 max-w-2xl mx-auto mb-6">
          An easy way to mark attendance through{" "}
          <br className="hidden sm:block" /> Canvas LMS.
        </p>

        <div className="flex flex-col space-y-4 w-full max-w-xs">
          <button 
          className="relative inline-flex items-center justify-center p-[2px] overflow-hidden text-base sm:text-lg font-bold text-gray-800 rounded-full group bg-gradient-to-r from-purple-100 via-pink-100 to-red-100 backdrop-blur-lg hover:brightness-110 transition duration-300 w-full shadow-sm"
          onClick={() => navigate("/courses")}
          >

            <span className="relative px-6 sm:px-8 py-3 sm:py-4 bg-white/30 rounded-full group-hover:bg-white/50 text-gray-800 transition-all ease-in-out duration-300 group-hover:scale-105 w-full">
              Submit Attendance Sheet
            </span>
          </button>

          <button className="relative inline-flex items-center justify-center p-[2px] overflow-hidden text-base sm:text-lg font-bold text-gray-800 rounded-full group bg-gradient-to-r from-blue-100 via-cyan-100 to-teal-100 backdrop-blur-lg hover:brightness-110 transition duration-300 w-full shadow-sm">
            <span className="relative px-6 sm:px-8 py-3 sm:py-4 bg-white/30 rounded-full group-hover:bg-white/50 text-gray-800 transition-all ease-in-out duration-300 group-hover:scale-105 w-full">
              OCR Test
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
