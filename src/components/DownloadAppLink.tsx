import { Link } from "react-router-dom";
import { useAdminAuth } from "../admin/AuthContext";
import { useMemberAuth } from "../member/MemberAuthContext";

type Props = {
  className?: string;
  /** Mostra sempre il testo completo (es. in home), senza versione corta “App”. */
  fullLabel?: boolean;
};

export function DownloadAppLink({ className = "", fullLabel = false }: Props) {
  const { session: memberSession, ready: memberReady } = useMemberAuth();
  const { session: adminSession, ready: adminReady } = useAdminAuth();
  if ((memberReady && memberSession) || (adminReady && adminSession)) {
    return null;
  }

  return (
    <Link
      className={["nav-download", className].filter(Boolean).join(" ")}
      to="/scarica-app"
      aria-label="Scarica l’app"
    >
      <span className={fullLabel ? undefined : "nav-download-label-full"}>
        Scarica l’app
      </span>
      {fullLabel ? null : <span className="nav-download-label-short">App</span>}
      <span className="nav-download-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
          <path
            d="M12 3v11"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M7.5 10.5 12 15l4.5-4.5"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 19h14"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </Link>
  );
}
