/**
 * This file contains the root router of your tRPC-backend
 */
import { publicProcedure, router } from '../trpc';
import { canvasRouter } from './canvas';
import { ocrRouter } from './ocr';
 
export const appRouter = router({
  canvas: canvasRouter,
  ocr: ocrRouter
});
 
export type AppRouter = typeof appRouter;