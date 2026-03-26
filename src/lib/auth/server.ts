import crypto from "node:crypto";

import type { User } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Resend } from "resend";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getSafeNextPath, SESSION_COOKIE_NAME } from "@/lib/auth/shared";

const MAGIC_LINK_TTL_MS = 1000 * 60 * 15;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const MAX_MAGIC_LINKS_PER_WINDOW = 5;
const RATE_LIMIT_WINDOW_MS = 1000 * 60 * 10;

export class AuthError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type MagicLinkIssueInput = {
  email: string;
  nextPath?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  appUrl?: string | null;
};

type VerifiedSession = {
  user: User;
  sessionToken: string;
  expiresAt: Date;
  nextPath: string;
};

export function normalizeEmail(input: string) {
  return input.trim().toLowerCase();
}

function hashToken(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function generateToken() {
  return crypto.randomBytes(32).toString("base64url");
}

async function sendMagicLinkEmail(email: string, verificationUrl: string) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    if (process.env.NODE_ENV === "production") {
      throw new AuthError(
        503,
        "Email delivery is not configured. Add Resend credentials before using magic links in production.",
      );
    }

    return {
      delivery: "preview" as const,
      previewUrl: verificationUrl,
    };
  }

  const resend = new Resend(env.RESEND_API_KEY);

  await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: email,
    subject: "Your Postcard sign-in link",
    text: [
      "Use the link below to sign in to Postcard.",
      "",
      verificationUrl,
      "",
      "This link expires in 15 minutes and can only be used once.",
    ].join("\n"),
  });

  return {
    delivery: "email" as const,
    previewUrl: null,
  };
}

export async function issueMagicLink(input: MagicLinkIssueInput) {
  const email = normalizeEmail(input.email);

  if (!email) {
    throw new AuthError(400, "Email is required.");
  }

  const recentWindowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const recentCount = await prisma.magicLinkToken.count({
    where: {
      email,
      createdAt: {
        gte: recentWindowStart,
      },
    },
  });

  if (recentCount >= MAX_MAGIC_LINKS_PER_WINDOW) {
    throw new AuthError(
      429,
      "Too many login links requested for this email. Wait a few minutes and try again.",
    );
  }

  const rawToken = generateToken();
  const nextPath = getSafeNextPath(input.nextPath);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

  await prisma.magicLinkToken.create({
    data: {
      email,
      tokenHash: hashToken(rawToken),
      redirectTo: nextPath,
      requestedIp: input.ipAddress ?? undefined,
      requestedUserAgent: input.userAgent ?? undefined,
      expiresAt,
    },
  });

  const verificationUrl = new URL(
    "/api/auth/verify",
    input.appUrl?.trim() || env.NEXT_PUBLIC_APP_URL,
  );
  verificationUrl.searchParams.set("token", rawToken);
  verificationUrl.searchParams.set("next", nextPath);

  const delivery = await sendMagicLinkEmail(email, verificationUrl.toString());

  return {
    email,
    expiresAt,
    delivery,
  };
}

export async function verifyMagicLink(
  rawToken: string,
  metadata?: {
    ipAddress?: string | null;
    userAgent?: string | null;
  },
): Promise<VerifiedSession> {
  if (!rawToken) {
    throw new AuthError(400, "Magic link token is required.");
  }

  const tokenHash = hashToken(rawToken);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const tokenRecord = await tx.magicLinkToken.findUnique({
      where: {
        tokenHash,
      },
    });

    if (!tokenRecord) {
      throw new AuthError(404, "This sign-in link is invalid.");
    }

    if (tokenRecord.expiresAt <= now) {
      throw new AuthError(410, "This sign-in link has expired.");
    }

    const consumeResult = await tx.magicLinkToken.updateMany({
      where: {
        id: tokenRecord.id,
        consumedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      data: {
        consumedAt: now,
      },
    });

    if (consumeResult.count !== 1) {
      throw new AuthError(409, "This sign-in link has already been used.");
    }

    const user = await tx.user.upsert({
      where: {
        email: tokenRecord.email,
      },
      update: {},
      create: {
        email: tokenRecord.email,
      },
    });

    const sessionToken = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await tx.userSession.create({
      data: {
        userId: user.id,
        sessionTokenHash: hashToken(sessionToken),
        ipAddress: metadata?.ipAddress ?? undefined,
        userAgent: metadata?.userAgent ?? undefined,
        expiresAt,
      },
    });

    return {
      user,
      sessionToken,
      expiresAt,
      nextPath: getSafeNextPath(tokenRecord.redirectTo),
    };
  });
}

export function getSessionCookieDescriptor(
  value: string,
  expiresAt: Date,
): {
  name: string;
  value: string;
  options: {
    expires: Date;
    httpOnly: true;
    path: "/";
    sameSite: "lax";
    secure: boolean;
  };
} {
  return {
    name: SESSION_COOKIE_NAME,
    value,
    options: {
      expires: expiresAt,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  };
}

export async function clearSessionByToken(rawSessionToken?: string | null) {
  if (!rawSessionToken) {
    return;
  }

  await prisma.userSession.deleteMany({
    where: {
      sessionTokenHash: hashToken(rawSessionToken),
    },
  });
}

export async function getCurrentUserFromSessionToken(rawSessionToken?: string | null) {
  if (!rawSessionToken) {
    return null;
  }

  const now = new Date();
  const session = await prisma.userSession.findUnique({
    where: {
      sessionTokenHash: hashToken(rawSessionToken),
    },
    include: {
      user: true,
    },
  });

  if (!session || session.expiresAt <= now) {
    return null;
  }

  return session.user;
}

/**
 * Dev mode: auto-create and return a seed user so the app works without Magic Link.
 * Only activates when RESEND_API_KEY is not set.
 */
async function getOrCreateDevUser() {
  const DEV_EMAIL = "dev@postcard.local";

  let user = await prisma.user.findUnique({
    where: { email: DEV_EMAIL },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: DEV_EMAIL,
        name: "Dev Agent",
      },
    });
  }

  return user;
}

function isDevMode() {
  const key = process.env.RESEND_API_KEY;
  return !key || key.trim() === "";
}

export async function getCurrentUser() {
  // Dev mode bypass: return a seeded user without requiring a session cookie
  if (isDevMode()) {
    return getOrCreateDevUser();
  }

  const cookieStore = await cookies();
  const rawSessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return getCurrentUserFromSessionToken(rawSessionToken);
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

