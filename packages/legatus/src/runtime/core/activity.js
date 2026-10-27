/** Activity metadata is supplied by producers; legacy payloads keep useful fallbacks. */
export function activityKind(item) {
  const d = item?.data || {};
  const type = String(item?.event_type || d.event_type || d.eventType || d.activityType || "").toLowerCase();
  const hint = [type, item?.source, d.source, d.category].filter(Boolean).join(" ").toLowerCase();
  if (/library|reus|remix|duplicat|clon|content\.used/.test(hint)) return "library";
  if (/homework|attempt|submitted|completed|quiz\.started|quiz\.played|assignment\.progress/.test(hint)) return "learning";
  if (d.assignmentId || d.assignment_id || d.sessionCount != null || d.completedCount != null) return "learning";
  return "updates";
}

export const activityLabel = { learning: "groupLearning", library: "groupLibrary", updates: "groupUpdates" };
