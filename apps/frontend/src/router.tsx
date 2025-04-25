import { lazy, Suspense, useMemo } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import ErrorPage from "./pages/ErrorPage";
import Home from "./pages/Home";

const useRouter = () => {

  const router = useMemo(
    () =>
      createBrowserRouter([
        {
          path: "/",
          element: (
            <Home />
          ),
          errorElement:<ErrorPage/>,
          // children: [
          //   {
          //     index: true,
          //     element: ,
          //   },
          // ],
        },
      ]),
    []
  );

  return router;
};

export default useRouter;
