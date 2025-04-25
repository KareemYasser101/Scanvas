/**
 * This file contains the root router of your tRPC-backend
 */
import { publicProcedure, router } from '../trpc';
import { canvasRouter } from './canvas';
 
export const appRouter = router({
  canvas: canvasRouter
});
 
export type AppRouter = typeof appRouter;