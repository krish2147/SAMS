import type { MemberPresentationStatus } from "./member-presentation";

export const MEMBER_DIRECTORY_PAGE_SIZE = 25;

export interface MemberDirectoryQuery {
  page: number;
  academyId: string;
  search?: string;
  status?: MemberPresentationStatus | "";
  planId?: string;
  batchId?: string;
  archiveState?: "current" | "archived";
}

export function buildMemberDirectoryParams(query: MemberDirectoryQuery): URLSearchParams {
  const params = new URLSearchParams({
    page: String(Math.max(1, Math.floor(Number(query.page) || 1))),
    pageSize: String(MEMBER_DIRECTORY_PAGE_SIZE),
    academyId: query.academyId
  });
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.status) params.set("status", query.status);
  if (query.planId && /^\d+$/.test(query.planId)) params.set("planId", query.planId);
  if (query.batchId && /^\d+$/.test(query.batchId)) params.set("batchId", query.batchId);
  if (query.archiveState === "archived") params.set("archiveState", "archived");
  return params;
}
