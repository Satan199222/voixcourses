"use client";

import dynamic from "next/dynamic";

// SSR désactivé : @elevenlabs/react utilise des hooks qui nécessitent un
// Provider interne monté côté client. Le prérendu statique crashait avec
// "useRegisterCallbacks must be used within a ConversationProvider".
const ConversationPage = dynamic(() => import("./page-client"), {
  ssr: false,
  loading: () => (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center text-[var(--text-muted)]">
      Chargement du mode conversation…
    </div>
  ),
});

export default function Page() {
  return <ConversationPage />;
}
