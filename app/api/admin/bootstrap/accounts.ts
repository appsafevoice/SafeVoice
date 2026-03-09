export interface AdminBootstrapAccount {
  email: string
  fullName: string
  password: string
}

export const ADMIN_BOOTSTRAP_ACCOUNTS: AdminBootstrapAccount[] = [
  {
    email: "jethropayoc@gmail.com",
    fullName: "Jethro Pay-oc",
    password: "UserTest0*",
  },
  {
    email: "jthrpayoc@gmail.com",
    fullName: "Jethro Facelo",
    password: "UserTest0*",
  },
  {
    email: "admin3@example.com",
    fullName: "Admin Three",
    password: "UserTest0*",
  },
]
