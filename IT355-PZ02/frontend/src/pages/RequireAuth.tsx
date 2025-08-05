import { useLocation, Navigate, Outlet } from "react-router-dom";

import { useUser } from "../data/auth";
import { type RoleType } from "../data/types";

export function RequireAuth({
  role,
  roles,
}: {
  role?: RoleType;
  roles?: RoleType[];
}) {
  const user = useUser();
  const location = useLocation();

  if (
    !user ||
    (role && user.role !== role) ||
    (roles && roles.includes(user.role))
  )
    return <Navigate to="/login" state={{ from: location }} />;

  return <Outlet />;
}
