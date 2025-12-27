"use client";

import { signIn, useSession } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();

  if (!session) {
    return <button onClick={() => signIn("google")}>Sign in with Google</button>;
  }

  return <a href="/dashboard">Go to Dashboard</a>;
}
