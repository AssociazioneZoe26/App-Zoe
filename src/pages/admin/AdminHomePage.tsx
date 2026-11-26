import { useEffect } from "react";
import { Link } from "react-router-dom";
import { dashboardMenu, menuTone } from "../../admin/adminMenu";
import { useAdminAuth } from "../../admin/AuthContext";

export function AdminHomePage() {
  const { session } = useAdminAuth();

  useEffect(() => {
    document.title = "Dashboard · Admin Zoe";
  }, []);

  return (
    <section className="admin-panel">
      <p className="eyebrow eyebrow-red">Dashboard</p>
      <h1>Ciao, {session?.name}.</h1>
      <p className="lede">
        Catalogo e ingressi restano in Academy (poi anche app). I testi e le foto delle pagine
        informative si modificano direttamente sul sito, restando loggati come Team Zoe.
      </p>
      <ul className="admin-dash">
        {dashboardMenu.map((item) => (
          <li key={item.id}>
            <Link className="admin-dash-card" to={item.href} style={menuTone(item)}>
              <span className="admin-dash-icon" aria-hidden="true">
                {item.icon}
              </span>
              <h2>{item.label}</h2>
              <p>{item.description}</p>
              <span className="admin-dash-go">{item.action}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
