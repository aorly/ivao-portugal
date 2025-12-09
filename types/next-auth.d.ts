import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      vid?: string;
      role?: string;
      navigraphId?: string | null;
    } & DefaultSession["user"];
  }
}
