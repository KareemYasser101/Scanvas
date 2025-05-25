import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  return (
    <>
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
            onClick={() => navigate("/auth")}
          >
            <span className="cursor-pointer relative px-6 sm:px-8 py-3 sm:py-4 bg-white/30 rounded-full group-hover:bg-white/50 text-gray-800 transition-all ease-in-out duration-300 group-hover:scale-105 w-full">
              Submit Attendance Sheet
            </span>
          </button>

          <button
            className="cursor-pointer relative inline-flex items-center justify-center p-[2px] overflow-hidden text-base sm:text-lg font-bold text-gray-800 rounded-full group bg-gradient-to-r from-blue-100 via-cyan-100 to-teal-100 backdrop-blur-lg hover:brightness-110 transition duration-300 w-full shadow-sm"
            onClick={() => navigate("/ocr")}
          >
            <span className="relative px-6 sm:px-8 py-3 sm:py-4 bg-white/30 rounded-full group-hover:bg-white/50 text-gray-800 transition-all ease-in-out duration-300 group-hover:scale-105 w-full">
              OCR Test
            </span>
          </button>

          <button
            className="cursor-pointer relative inline-flex items-center justify-center p-[2px] overflow-hidden text-base sm:text-lg font-bold text-gray-800 rounded-full group bg-gradient-to-r from-blue-100 via-cyan-100 to-teal-100 backdrop-blur-lg hover:brightness-110 transition duration-300 w-full shadow-sm"
            onClick={() => {
              const link = document.createElement("a");
              link.href = "/Scanvas_Template.pdf";
              link.download = "Scanvas_Template.pdf";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            <span className="relative px-6 sm:px-8 py-3 sm:py-4 bg-white/30 rounded-full group-hover:bg-white/50 text-gray-800 transition-all ease-in-out duration-300 group-hover:scale-105 w-full">
              Download Template
            </span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Home;
