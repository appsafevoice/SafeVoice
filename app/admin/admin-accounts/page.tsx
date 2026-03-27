import { AdminLayout } from "@/components/admin/admin-layout"
import { AdminAccountsManager } from "./admin-accounts-manager"
import { StudentAccountsManager } from "./student-accounts-manager"

export default function AdminAccountsPage() {
  return (
    <AdminLayout requireSuperAdmin>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#800000]">Super Admin Panel</h1>
          <p className="text-[#8f6060]">Manage admin and student accounts, including synchronized removals from Supabase Authentication.</p>
        </div>
        <AdminAccountsManager />
        <StudentAccountsManager />
      </div>
    </AdminLayout>
  )
}
