import { publicProcedure, router } from '../../trpc';
 
export const canvasRouter = router({
  create: publicProcedure.query(() => 'hello tRPC v10!'),
});
 