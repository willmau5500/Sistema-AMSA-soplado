import PwaRegistro from "./components/PwaRegistro";

export const metadata = {
  title: "Multisoplado — Control de planta",
  description: "Sistema de producción de multisoplado de botellas para Multisoplado S.A.S.",
  manifest: "/manifest.webmanifest",
  applicationName: "Multisoplado",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Multisoplado", statusBarStyle: "black-translucent" },
};

export const viewport = {
  themeColor: "#123B7A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0 }}>
        {children}
        <PwaRegistro />
      </body>
    </html>
  );
}
