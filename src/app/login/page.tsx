import { loginAuthErrorNotice } from "@/lib/app-states";
import { signInNextParam } from "@/lib/auth-callback-next";

import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[]; next?: string | string[] }>;
}) {
  const { error, next } = await searchParams;
  return <LoginForm authError={loginAuthErrorNotice(error)} next={signInNextParam(next)} />;
}
