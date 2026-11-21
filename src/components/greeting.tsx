"use client";

import { ROLE_META, useActor } from "@/components/actor-context";

export function Greeting({ fallback = "Rekan" }: { fallback?: string }) {
  const { actor } = useActor();
  const hour = new Date().getHours();
  const sapaan = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";
  return (
    <span>
      {sapaan}, <span className="text-brand-300">{actor.nama || fallback}</span>
      <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 align-middle text-[0.55rem] font-semibold uppercase tracking-wide text-white/60">
        {ROLE_META[actor.role].label}
      </span>
    </span>
  );
}
