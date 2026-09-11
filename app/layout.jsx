export const metadata = {
  title: "AMSA Soplado — Control de planta",
  description: "Sistema de producción de multisoplado de botellas para AMSA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
