import {
  useEffect,
  useState
} from "react";

import {
  useLocation
} from "react-router-dom";

import AiAssistant from "../AiAssistant";
import AdminSidebar from "./AdminSidebar";

import "./adminLayout.css";

const STORAGE_KEY =
  "qsm_admin_sidebar_collapsed";

export default function AdminLayout({
  children
}) {
  const location = useLocation();

  const [collapsed, setCollapsed] =
    useState(() =>
      localStorage.getItem(
        STORAGE_KEY
      ) === "true"
    );

  const [mobileOpen, setMobileOpen] =
    useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;

      localStorage.setItem(
        STORAGE_KEY,
        String(next)
      );

      return next;
    });
  };

  return (
    <div
      className={[
        "qsm-global-admin-layout",
        collapsed
          ? "is-collapsed"
          : ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <AdminSidebar
        collapsed={collapsed}
        onToggleCollapsed={
          toggleCollapsed
        }
        mobileOpen={mobileOpen}
        onCloseMobile={() =>
          setMobileOpen(false)
        }
      />

      <button
        type="button"
        className="qsm-global-admin-mobile-button"
        onClick={() =>
          setMobileOpen(true)
        }
        aria-label="Abrir menú administrativo"
      >
        ☰
      </button>

      <div className="qsm-global-admin-layout__content">
        {children}
      </div>

      {location.pathname !==
        "/admin/messages" && (
        <AiAssistant
          pageContext={
            location.pathname
          }
        />
      )}
    </div>
  );
}
