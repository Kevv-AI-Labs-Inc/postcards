import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "scaffolded",
    nextSteps: [
      "Install dependencies",
      "Create .env from .env.example",
      "Start Docker services",
      "Run Prisma generate and migrate",
      "Implement auth and queue adapters",
    ],
  });
}

