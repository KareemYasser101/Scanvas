import { z } from "zod";
import { publicProcedure, router } from "../../trpc";
import { CanvasApi } from "@kth/canvas-api";
import { TRPCError } from "@trpc/server";

const API_URL = "https://canvas.instructure.com";

export const canvasRouter = router({
  authenticateAccessToken: publicProcedure
    .input(
      z.object({
        accessToken: z.string().min(1, "Access token is required"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        console.log("Received access token:", input.accessToken); // Detailed logging

        const canvas = new CanvasApi(API_URL, input.accessToken);
        
        // ✅ Fetch user profile to validate token
        let user;
        try {
          user = await canvas.get("/users/self");
          console.log("Canvas API response:", user); // Log full response
        } catch (apiError) {
          console.error("Canvas API Error:", apiError);
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: apiError instanceof Error ? apiError.message : 'Authentication failed'
          });
        }

        // If successful, return user details
        return {
          success: true,
          // user: {
          //   id: user.id,
          //   name: user.name,
          //   email: user.primary_email || user.login_id,
          //   loginId: user.login_id,
          // },
        };
      } catch (error) {
        console.error("Full authentication error:", error);

        if (error instanceof TRPCError) {
          throw error; // Re-throw tRPC errors
        }

        if (error instanceof Error) {
          if (
            error.message.includes("401") ||
            error.message.includes("Unauthorized")
          ) {
            throw new TRPCError({
              code: 'UNAUTHORIZED',
              message: "Invalid access token"
            });
          }
          if (
            error.message.includes("403") ||
            error.message.includes("Forbidden")
          ) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: "Insufficient permissions"
            });
          }
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: "Unable to authenticate with Canvas"
        });
      }
    }),
});