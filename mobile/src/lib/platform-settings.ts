import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";

/**
 * The few things about the platform itself that the app has to ask before
 * it knows what to offer.
 *
 * Only one of them so far: whether an advocate may register a chamber
 * without being invited. It is a server decision — the API refuses the
 * registration outright when it is off — and the app asks so that it does
 * not show a door that will be slammed.
 */
type PlatformSettings = Record<string, string>;

export function usePublicSignup(): boolean {
  const { data } = useQuery({
    queryKey: ["platform", "settings"],
    queryFn: () => apiFetch<PlatformSettings>("/api/site/settings"),
    // It changes about as often as the platform's mind does.
    staleTime: 10 * 60 * 1000,
  });

  // Hidden until the answer is known, rather than offered and withdrawn. A
  // button that appears is a nicer surprise than one that vanishes under a
  // thumb already moving towards it.
  return data?.["signup.public"] === "on";
}
