import { AdminLayout } from "@/components/admin/admin-layout"
import { AdminAccountsManager } from "./admin-accounts-manager"

export default function AdminAccountsPage() {
  return (
    <AdminLayout requireSuperAdmin>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#007cce]">Admin Accounts</h1>
          <p className="text-black">Super Admin-only controls for creating, disabling, and removing admin accounts.</p>
        </div>
        <AdminAccountsManager />
      </div>
    </AdminLayout>
  )
}
