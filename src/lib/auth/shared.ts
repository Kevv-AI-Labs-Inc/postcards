export const SESSION_COOKIE_NAME = "postcard_session";

export function getSafeNextPath(input?: string | null) {
  if (!input || !input.startsWith("/") || input.startsWith("//")) {
    return "/";
  }

  return input;
}

