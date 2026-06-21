export type AppRole = "ADMIN" | "INSTRUCTOR" | "STUDENT";

export function canManageCourses(role: string | undefined) {
  return role === "ADMIN" || role === "INSTRUCTOR";
}

export function isAdmin(role: string | undefined) {
  return role === "ADMIN";
}
