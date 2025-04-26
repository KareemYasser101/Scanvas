import { lazy, Suspense, useMemo } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import ErrorPage from "./pages/ErrorPage";
import Home from "./pages/Home";
import Courses from "./pages/Courses";
import { useQueryClient } from "@tanstack/react-query";
import Auth from "./pages/Auth";
import Attendance from "./pages/Attendance";
import OCR from "./pages/OCR";

const useRouter = () => {
  // const queryClient = useQueryClient();
  const router = useMemo(
    () =>
      createBrowserRouter([
        {
          path: "/",
          element: <Home />,
          errorElement: <ErrorPage />,
        },
        {
          path: "/auth",
          element: <Auth />,
          errorElement: <ErrorPage />,
        },
        {
          path: "/courses",
          element: <Courses />,
          errorElement: <ErrorPage />,
        },
        {
          path: "/attendance/:cid",
          element: <Attendance />,
          errorElement: <ErrorPage />,
        },
        {
          path: "/ocr",
          element: <OCR />,
          errorElement: <ErrorPage />,
        },
      ]),
    []
  );

  return router;
};

export default useRouter;
