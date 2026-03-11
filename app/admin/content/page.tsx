import dynamic from "next/dynamic"

const AdminContentClient = dynamic(() => import("./content-client"), { ssr: false })

export default function AdminContentPage() {
  return <AdminContentClient />
}
