import { z } from "zod";
import { publicProcedure, router } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { getExtractedIdsFromOCR } from "../canvas";

export const ocrRouter = router({
  extractStudentIds: publicProcedure
    .input(
      z.object({
        imageUrls: z
          .array(z.string().url("Each image URL must be valid"))
          .min(1, "At least one image URL is required"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Perform OCR
        const ocrExtractedIds = await getExtractedIdsFromOCR(input.imageUrls);


        return {
          success: true,
          ocrExtractedIds,
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
