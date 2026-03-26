"use client";

import { FormEvent, useState, useTransition } from "react";

type RequestLinkResponse = {
  ok: boolean;
  message: string;
  previewUrl?: string | null;
};

type MagicLinkFormProps = {
  nextPath?: string | null;
};

export function MagicLinkForm({ nextPath }: MagicLinkFormProps) {
  const [email, setEmail] = useState("");
  const [response, setResponse] = useState<RequestLinkResponse | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      setResponse(null);

      const request = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          next: nextPath,
        }),
      });

      const payload = (await request.json()) as RequestLinkResponse;
      setResponse(payload);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block">
        <span className="text-xs uppercase tracking-[0.25em] text-stone-500">
          Work Email
        </span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-[1rem] border border-stone-900/10 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
          placeholder="agent@brokerage.com"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Sending link..." : "Send Magic Link"}
      </button>

      {response ? (
        <div className="rounded-[1.25rem] border border-stone-900/10 bg-stone-50 p-4 text-sm leading-7 text-stone-700">
          <p>{response.message}</p>
          {response.previewUrl ? (
            <p className="mt-2 break-all text-xs text-amber-700">
              Dev preview: {response.previewUrl}
            </p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

