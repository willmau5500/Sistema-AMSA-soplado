"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        marginTop: 24,
        padding: "10px 18px",
        background: "#087637",
        color: "#fff",
        border: "none",
        borderRadius: 4,
        cursor: "pointer",
      }}
    >
      Cerrar sesión
    </button>
  );
}
