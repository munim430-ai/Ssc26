import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <div className="admin-header">
        <h1>SSC Admin Dashboard</h1>
        <form action="/admin/logout" method="post" style={{ display: 'inline' }}>
          <button className="btn btn-danger" type="submit">Logout</button>
        </form>
      </div>
      {children}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Link href="/" className="muted">← Back to public portal</Link>
      </div>
    </div>
  )
}
