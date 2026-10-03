"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineNotice } from "@/components/ui/inline-notice";
import { PRODUCT_NAME } from "@/lib/product";
import { requestMagicLink, type LoginState } from "./actions";

const INITIAL: LoginState = { ok: false, message: "" };

export function LoginForm({
  authError,
  next = null,
}: {
  authError: string | null;
  /** Where sign-in should land; already checked by signInNextParam. */
  next?: string | null;
}) {
  const [state, action, pending] = useActionState(requestMagicLink, INITIAL);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
        <span className="t-label text-ink-3">{PRODUCT_NAME}</span>
        <h1 className="t-subhead text-ink">Sign in</h1>
        <p className="t-body-sm text-body">
          We&rsquo;ll email you a secure sign-in link. No password to remember.
        </p>
      </div>

      {state.ok ? (
        // Link sent — replace the form with the confirmation (no email field lingering).
        <InlineNotice tone="info">{state.message}</InlineNotice>
      ) : (
        <form action={action} className="flex flex-col gap-4">
          {authError ? <InlineNotice tone="error">{authError}</InlineNotice> : null}
          {next ? <input type="hidden" name="next" value={next} /> : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
            />
          </div>

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Sending…" : "Send sign-in link"}
          </Button>

          {state.message ? <InlineNotice tone="error">{state.message}</InlineNotice> : null}
        </form>
      )}
    </main>
  );
}
