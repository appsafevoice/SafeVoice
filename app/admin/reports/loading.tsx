import { LoadingScreen } from "@/components/ui/loading-screen"

export default function Loading() {
  return (
    <LoadingScreen
      title="Loading reports"
      description="Compiling the report workspace and preparing your dashboard."
      progress={35}
    />
  )
}
