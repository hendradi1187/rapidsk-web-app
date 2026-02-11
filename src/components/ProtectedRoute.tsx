import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import * as auth from "@/api/services/auth";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return setOk(false);

    auth.validateToken(token)
      .then(() => setOk(true))
      .catch(() => {
        auth.logout();
        setOk(false);
      });
  }, []);

  if (ok === null) return null; //ganti loader
  if (!ok) return <Navigate to="/login" replace />;
  return children;
}