export function getUserRequestId() {
  if (typeof window === "undefined") return null;

  let id = localStorage.getItem("userRequestId");
  if (!id) {
    id = `guest_${Math.random().toString(36).substring(2, 12)}`;
    localStorage.setItem("userRequestId", id);
  }
  return id;
}
