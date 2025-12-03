export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Login page uses its own layout without the admin sidebar
  return <>{children}</>;
}
