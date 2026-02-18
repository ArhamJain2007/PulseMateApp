import * as z from "zod";

import { userDb } from "@/backend/db/users";

import { createTRPCRouter, publicProcedure } from "@/backend/trpc/create-context";

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        username: z.string().min(3),
        password: z.string().min(6),
      }),
    )
    .mutation(({ input }: { input: { email: string; username: string; password: string } }) => {
      const existingUser = userDb.findByUsername(input.username);
      if (existingUser) {
        throw new Error("Username already exists");
      }

      const existingEmail = userDb.findByEmail(input.email);
      if (existingEmail) {
        throw new Error("Email already exists");
      }

      const user = userDb.create({
        email: input.email,
        username: input.username,
        password: input.password,
      });

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      };
    }),

  login: publicProcedure
    .input(
      z.object({
        username: z.string(),
        password: z.string(),
      }),
    )
    .mutation(({ input }) => {
      const user = userDb.findByUsername(input.username);

      if (!user || user.password !== input.password) {
        throw new Error("Invalid username or password");
      }

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      };
    }),
});
