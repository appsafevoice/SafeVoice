import { AdminLayout } from "@/components/admin/admin-layout"
import { AdminAccountsManager } from "./admin-accounts-manager"

export default function AdminAccountsPage() {
  return (
    <AdminLayout requireSuperAdmin>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Super Admin Panel</h1>
          <p className="text-slate-400">Add, disable, and remove Admin accounts from a separate management page.</p>
        </div>
        <AdminAccountsManager />
      </div>
    </AdminLayout>
  )
}
