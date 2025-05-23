import { z } from "zod";
import { publicProcedure, router } from "../../trpc";
import { TRPCError } from "@trpc/server";
import * as tesseract from "tesseract.js";

export const ocrRouter = router({
  extractStudentIds: publicProcedure
    .input(
      z.object({
        imageUrl: z.string().min(1, "Image URL is required"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Remove data URL prefix if present
        const base64Image = input.imageUrl.replace(
          /^data:image\/\w+;base64,/,
          ""
        );

        // Convert base64 to buffer
        const imageBuffer = Buffer.from(base64Image, "base64");

        // Perform OCR
        const {
          data: { text },
        } = await tesseract.recognize(imageBuffer, "eng", {
          logger: (m) => console.log(m),
        });


        return {
          success: true,
          text,
        };
      } catch (error) {
        console.error("OCR extraction error:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to extract student IDs",
        });
      }
    }),
});
