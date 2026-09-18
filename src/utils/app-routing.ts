import type { AcademyId } from "../types";

export type AppRouteView = "root" | "academy" | "login" | "register" | "dashboard" | "payment";

export type AppRoute = {
  view: AppRouteView;
  academyId: AcademyId | null;
};

const academyIds = new Set<AcademyId>(["swim", "cricket"]);

export function parseAppRoute(pathname: string): AppRoute {
  const normalized = `/${String(pathname || "/").split("?")[0].split("#")[0].split("/").filter(Boolean).join("/")}`;
  if (normalized === "/") return { view: "root", academyId: null };
  if (normalized === "/pay") return { view: "payment", academyId: null };

  const match = normalized.match(/^\/academy\/([^/]+)(?:\/(login|register|dashboard))?$/);
  const academyId = match?.[1] as AcademyId | undefined;
  if (!academyId || !academyIds.has(academyId)) return { view: "root", academyId: null };

  return {
    view: (match?.[2] as AppRouteView | undefined) || "academy",
    academyId
  };
}

export function academyPath(academyId: AcademyId, view: "academy" | "login" | "register" | "dashboard" = "academy") {
  const base = `/academy/${academyId}`;
  return view === "academy" ? base : `${base}/${view}`;
}
