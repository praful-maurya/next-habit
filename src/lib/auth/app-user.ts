import { connection, NextResponse } from "next/server";
import type { User } from "@prisma/client";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

export async function getAuthenticatedAppUser(): Promise<User | null> {
  await connection();
  const { data: session, error } = await auth.getSession();
  if (error) {
    throw new Error("Unable to verify the Neon Auth session.", { cause: error });
  }
  if (!session?.user) return null;

  const identity = session.user;
  return prisma.user.upsert({
    where: { authUserId: identity.id },
    update: {},
    create: {
      authUserId: identity.id,
      email: identity.email,
      displayName: identity.name?.trim() || "Friend",
    },
  });
}

type ApiAuthentication =
  | { authenticated: true; user: User }
  | { authenticated: false; response: NextResponse };

export async function authenticateApiRequest(): Promise<ApiAuthentication> {
  try {
    const user = await getAuthenticatedAppUser();
    if (!user) {
      return {
        authenticated: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }
    return { authenticated: true, user };
  } catch (error) {
    console.error("Unable to authenticate API request.", error);
    return {
      authenticated: false,
      response: NextResponse.json({ error: "Unable to verify your session. Please try again." }, { status: 503 }),
    };
  }
}
