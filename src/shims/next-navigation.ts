// src/shims/next-navigation.ts
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router";

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (url: string) => navigate(url),
    replace: (url: string) => navigate(url, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => navigate(0),
  };
}

export function usePathname() {
  const location = useLocation();
  return location.pathname;
}

export { useParams, useSearchParams, useLocation };
