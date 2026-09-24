const transitions = {
  PENDING: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["RESOLVED", "CANCELLED"],
  RESOLVED: [],
  CANCELLED: [],
};

export function canChangeStatus(currentStatus, nextStatus) {
  return transitions[currentStatus]?.includes(nextStatus) ?? false;
}

export function canCancel(status) {
  return status === "PENDING" || status === "IN_PROGRESS";
}
