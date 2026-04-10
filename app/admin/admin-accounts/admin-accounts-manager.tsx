"use client"

import { useEffect, useMemo, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { SUPER_ADMIN_EMAIL, getAdminPositionLabel, isSuperAdminEmail, normalizeEmail } from "@/lib/admin"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2, Plus, ShieldCheck, Trash2, UserCog } from "lucide-react"

type AdminAccountRow = {
  id: string
  full_name: string
  position: string | null
  email: string
  is_active: boolean
  created_at: string
}

export function AdminAccountsManager() {
  const supabase = useMemo(() => createBrowserClient(), [])

  const [accounts, setAccounts] = useState<AdminAccountRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [accountPendingRemove, setAccountPendingRemove] = useState<AdminAccountRow | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [processingAccountId, setProcessingAccountId] = useState<string | null>(null)

  const [form, setForm] = useState({
    fullName: "",
    position: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const canManageAdmins = isSuperAdminEmail(currentUserEmail)

  const loadCurrentUserEmail = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setCurrentUserEmail(user?.email ? normalizeEmail(user.email) : null)
  }

  const fetchAccounts = async () => {
    setIsLoading(true)
    setErrorMessage("")

    const { data, error } = await supabase
      .from("admin_accounts")
      .select("id, full_name, position, email, is_active, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      if (error.code === "42P01") {
        setErrorMessage("Admin accounts table is missing. Run the Supabase migrations to create `admin_accounts`.")
      } else if (error.code === "42501") {
        setErrorMessage("Only the Super Admin can load the full Admin accounts list.")
      } else {
        setErrorMessage(error.message || "Failed to load admin accounts.")
      }
      setAccounts([])
      setIsLoading(false)
      return
    }

    const nextAccounts = ((data as AdminAccountRow[]) || []).sort((left, right) => {
      const leftIsSuperAdmin = isSuperAdminEmail(left.email) ? 1 : 0
      const rightIsSuperAdmin = isSuperAdminEmail(right.email) ? 1 : 0

      if (leftIsSuperAdmin !== rightIsSuperAdmin) {
        return rightIsSuperAdmin - leftIsSuperAdmin
      }

      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    })

    setAccounts(nextAccounts)
    setIsLoading(false)
  }

  useEffect(() => {
    loadCurrentUserEmail()
    fetchAccounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetForm = () => {
    setForm({
      fullName: "",
      position: "",
      email: "",
      password: "",
      confirmPassword: "",
    })
  }

  const createAdminAccount = async () => {
    setErrorMessage("")
    setSuccessMessage("")

    const fullName = form.fullName.trim()
    const position = form.position.trim()
    const email = normalizeEmail(form.email)
    const password = form.password

    if (!canManageAdmins) {
      setErrorMessage("Only the Super Admin can create Admin accounts.")
      return
    }
    if (!fullName) {
      setErrorMessage("Full name is required.")
      return
    }
    if (!position) {
      setErrorMessage("Position is required.")
      return
    }
    if (!email) {
      setErrorMessage("Email is required.")
      return
    }
    if (isSuperAdminEmail(email)) {
      setErrorMessage(`The reserved Super Admin account (${SUPER_ADMIN_EMAIL}) is managed separately.`)
      return
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.")
      return
    }
    if (password !== form.confirmPassword) {
      setErrorMessage("Passwords do not match.")
      return
    }

    setIsSaving(true)

    const { data: createdRows, error: createError } = await supabase.rpc("admin_accounts_create", {
      p_full_name: fullName,
      p_position: position,
      p_email: email,
      p_password: password,
    })

    if (createError || !createdRows || createdRows.length === 0) {
      if (createError?.code === "42883") {
        setErrorMessage(createError.message || "Database is missing required functions. Run the Supabase migrations and try again.")
      } else if (createError?.code === "42501") {
        setErrorMessage("Only the Super Admin can create Admin accounts.")
      } else {
        setErrorMessage(createError?.message || "Failed to create admin account.")
      }
      setIsSaving(false)
      return
    }

    setSuccessMessage("Admin account created.")

    setTimeout(() => setSuccessMessage(""), 3000)
    setDialogOpen(false)
    resetForm()
    await fetchAccounts()
    setIsSaving(false)
  }

  const setAccountActive = async (account: AdminAccountRow, nextActive: boolean) => {
    setErrorMessage("")
    setSuccessMessage("")

    const targetEmail = normalizeEmail(account.email)
    if (!canManageAdmins) {
      setErrorMessage("Only the Super Admin can update Admin accounts.")
      return
    }
    if (isSuperAdminEmail(targetEmail)) {
      setErrorMessage("The reserved Super Admin account cannot be deactivated from this panel.")
      return
    }
    if (!nextActive && currentUserEmail && targetEmail === currentUserEmail) {
      setErrorMessage("You cannot deactivate your own admin account.")
      return
    }

    setProcessingAccountId(account.id)

    const { error } = await supabase.from("admin_accounts").update({ is_active: nextActive }).eq("id", account.id)

    if (error) {
      if (error.code === "42501") {
        setErrorMessage("Only the Super Admin can update Admin accounts.")
      } else {
        setErrorMessage(error.message || "Failed to update account status.")
      }
      setProcessingAccountId(null)
      return
    }

    setSuccessMessage("Admin account updated.")
    setTimeout(() => setSuccessMessage(""), 2000)
    await fetchAccounts()
    setProcessingAccountId(null)
  }

  const cancelRemoveAccount = () => {
    setAccountPendingRemove(null)
  }

  const confirmRemoveAccount = async () => {
    if (!accountPendingRemove) return

    const account = accountPendingRemove
    setErrorMessage("")
    setSuccessMessage("")

    const targetEmail = normalizeEmail(account.email)

    if (!canManageAdmins) {
      setErrorMessage("Only the Super Admin can remove Admin accounts.")
      setAccountPendingRemove(null)
      return
    }
    if (isSuperAdminEmail(targetEmail)) {
      setErrorMessage("The reserved Super Admin account cannot be removed.")
      setAccountPendingRemove(null)
      return
    }
    if (currentUserEmail && targetEmail === currentUserEmail) {
      setErrorMessage("You cannot remove your own admin account.")
      setAccountPendingRemove(null)
      return
    }

    setProcessingAccountId(account.id)
    setAccountPendingRemove(null)

    const { error } = await supabase.rpc("super_admin_delete_admin_account", {
      p_admin_account_id: account.id,
    })

    if (error) {
      if (error.code === "42883" || error.code === "PGRST202") {
        setErrorMessage(
          "Database is missing the synchronized admin deletion function. Apply the latest Supabase migrations and try again.",
        )
      } else if (error.code === "42501") {
        setErrorMessage("Only the Super Admin can remove Admin accounts.")
      } else {
        setErrorMessage(error.message || "Failed to remove admin account.")
      }
      setProcessingAccountId(null)
      return
    }

    setSuccessMessage("Admin account removed from the database and Supabase Authentication.")
    setTimeout(() => setSuccessMessage(""), 2000)
    await fetchAccounts()
    setProcessingAccountId(null)
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white rounded-lg">
              <UserCog className="w-5 h-5 text-black" />
            </div>
            <div>
              <CardTitle className="text-white">Admin Management</CardTitle>
              <p className="text-sm text-slate-400">Super Admin-only tools for creating, disabling, and removing Admin logins with synced auth cleanup</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={fetchAccounts}
              className="border-slate-300 bg-white text-black hover:bg-slate-100 hover:text-black"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-black" />
              ) : (
                <ShieldCheck className="w-4 h-4 mr-2 text-black" />
              )}
              Refresh
            </Button>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" className="bg-cyan-600 hover:bg-cyan-700" disabled={!canManageAdmins}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Admin
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 max-w-lg [&_[data-slot=dialog-close]>svg]:text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">Add Admin Account</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-200">Full name</Label>
                    <Input
                      value={form.fullName}
                      onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                      placeholder="e.g., Maria Santos"
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-200">Position</Label>
                    <Input
                      value={form.position}
                      onChange={(e) => setForm((prev) => ({ ...prev, position: e.target.value }))}
                      placeholder="e.g., Guidance Counselor"
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-200">Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="admin@school.edu"
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-slate-200">Password</Label>
                      <Input
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                        placeholder="Min 6 characters"
                        className="bg-slate-700/50 border-slate-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-200">Confirm</Label>
                      <Input
                        type="password"
                        value={form.confirmPassword}
                        onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Repeat password"
                        className="bg-slate-700/50 border-slate-600 text-white"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="flex-1 border-slate-600 text-black hover:bg-slate-700/50"
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={createAdminAccount}
                      className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {currentUserEmail && !canManageAdmins && (
          <Alert className="bg-amber-500/10 border-amber-500/50">
            <AlertDescription className="text-amber-300">
              Only the Super Admin can add, disable, or remove Admin accounts.
            </AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="bg-green-500/10 border-green-500/50">
            <AlertDescription className="text-green-400">{successMessage}</AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert className="bg-red-500/10 border-red-500/50">
            <AlertDescription className="text-red-400">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-sm text-slate-400">No admin accounts found.</div>
        ) : (
          <div className="space-y-2">
            {accounts.map((account) => {
              const accountIsSuperAdmin = isSuperAdminEmail(account.email)
              const isCurrentUser = currentUserEmail ? normalizeEmail(account.email) === currentUserEmail : false
              const isProcessing = processingAccountId === account.id
              const positionLabel = getAdminPositionLabel(account.position, account.email)

              return (
                <div
                  key={account.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-slate-700/30 border border-slate-700"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{account.full_name}</p>
                      {accountIsSuperAdmin ? (
                        <Badge className="border border-amber-300 bg-amber-100 text-amber-900">Super Admin</Badge>
                      ) : (
                        <Badge variant="outline" className="border-slate-500 text-slate-200">
                          Admin
                        </Badge>
                      )}
                      {isCurrentUser && (
                        <Badge variant="outline" className="border-cyan-400/40 text-cyan-200">
                          You
                        </Badge>
                      )}
                      {!account.is_active && <span className="text-xs text-slate-400">(Inactive)</span>}
                    </div>
                    {(account.position?.trim() || accountIsSuperAdmin) && (
                      <p className="text-xs text-slate-300">{positionLabel}</p>
                    )}
                    <p className="text-xs text-slate-400 truncate">{account.email}</p>
                    <p className="text-[11px] text-slate-500">Created {new Date(account.created_at).toLocaleString()}</p>
                  </div>

                  {accountIsSuperAdmin ? (
                    <div className="text-xs font-medium text-amber-900">Protected account</div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between sm:justify-end gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Active</span>
                        <Switch
                          checked={account.is_active}
                          onCheckedChange={(value) => setAccountActive(account, value)}
                          disabled={isProcessing || !canManageAdmins}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setAccountPendingRemove(account)}
                        disabled={isProcessing || !canManageAdmins}
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <AlertDialog open={!!accountPendingRemove} onOpenChange={(open) => !open && cancelRemoveAccount()}>
          <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this admin account?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-300">
                {accountPendingRemove
                  ? `This will remove admin access for ${accountPendingRemove.full_name}. This action cannot be undone.`
                  : "Confirm the removal of this admin account."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={cancelRemoveAccount}
                className="border-slate-600 bg-slate-700 text-slate-100 hover:bg-slate-600 hover:text-white"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  void confirmRemoveAccount()
                }}
                className="bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500/40"
                disabled={!accountPendingRemove}
              >
                Confirm Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
