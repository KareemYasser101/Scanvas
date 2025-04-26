// src/trpc/trpc.ts
import { initTRPC } from '@trpc/server';
import { Context } from './context';

// Lazy transformer initialization
let transformerInstance: any = undefined;

const initializeTransformer = async () => {
  if (transformerInstance) return transformerInstance;
  
  try {
    const superjson = await import('superjson');
    transformerInstance = superjson.default;
    return transformerInstance;
  } catch (error) {
    console.error('Failed to import superjson:', error);
    return undefined;
  }
};

// Async function to create tRPC instance
export async function createTRPCInstance() {
  const transformer = await initializeTransformer();
  
  return initTRPC.context<Context>().create({
    transformer,
  });
}

// Fallback synchronous export
export const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;