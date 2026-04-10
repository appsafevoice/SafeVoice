import { AdminLayout } from "@/components/admin/admin-layout"
import { StudentAccountsManager } from "../admin-accounts/student-accounts-manager"

export default function AccountManagementPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#007cce]">Account Management</h1>
          <p className="text-[#8f6060]">Review student accounts, verify reporting access, and manage student records.</p>
        </div>
        <StudentAccountsManager />
      </div>
    </AdminLayout>
  )
}
