import { lazy, Suspense, useMemo } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import ErrorPage from "./pages/ErrorPage";
import Home from "./pages/Home";
import Courses from "./pages/Courses";
import { useQueryClient } from "@tanstack/react-query";

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
          path: "/courses",
          element: <Courses />,
          errorElement: <ErrorPage />,
        },
      ]),
    []
  );

  return router;
};

export default useRouter;
