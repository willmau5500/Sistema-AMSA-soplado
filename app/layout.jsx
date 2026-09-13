export const metadata = {
  title: "Multisoplado — Control de planta",
  description: "Sistema de producción de multisoplado de botellas para Multisoplado S.A.S.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
