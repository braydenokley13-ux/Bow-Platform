export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="app-content" className="auth-shell">
      <div className="auth-shell-inner">{children}</div>
    </main>
  );
}
