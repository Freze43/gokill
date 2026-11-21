"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ROLE_META, ROLE_ORDER, roleCan, type ActorRole, type Permission } from "@/lib/roles";

export { ROLE_META, ROLE_ORDER, ROLE_PERMISSIONS, roleCan } from "@/lib/roles";
export type { ActorRole, Permission } from "@/lib/roles";



type Actor = { role: ActorRole; nama: string };

type ActorContextValue = {
  actor: Actor;
  ready: boolean;
  setActor: (actor: Actor) => void;
  setRole: (role: ActorRole) => void;
  setNama: (nama: string) => void;
  can: (permission: Permission) => boolean;
};

const ActorContext = createContext<ActorContextValue | null>(null);

const DEFAULT_ACTOR: Actor = { role: "kasir", nama: ROLE_META.kasir.namaContoh };

export function ActorProvider({
  children,
  initialActor,
}: {
  children: React.ReactNode;
  initialActor?: Actor;
}) {
  const fallback: Actor = initialActor ?? DEFAULT_ACTOR;
  const [actor, setActorState] = useState<Actor>(fallback);

  useEffect(() => {
    if (initialActor) setActorState(initialActor);
  }, [initialActor]);

  const persist = useCallback((next: Actor) => setActorState(next), []);

  const value = useMemo<ActorContextValue>(
    () => ({
      actor,
      ready: true,
      setActor: persist,
      setRole: (role) => setActorState({ ...actor, role }),
      setNama: (nama) => setActorState({ ...actor, nama }),
      can: (permission) => roleCan(actor.role, permission),
    }),
    [actor, persist],
  );

  return <ActorContext.Provider value={value}>{children}</ActorContext.Provider>;
}

export function useActor() {
  const context = useContext(ActorContext);
  if (!context) {
    return {
      actor: DEFAULT_ACTOR,
      ready: false,
      setActor: () => undefined,
      setRole: () => undefined,
      setNama: () => undefined,
      can: (permission: Permission) => roleCan(DEFAULT_ACTOR.role, permission),
    } satisfies ActorContextValue;
  }
  return context;
}
