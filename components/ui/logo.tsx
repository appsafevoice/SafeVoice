import Image from "next/image"

interface LogoProps {
  size?: "sm" | "md" | "lg"
  showText?: boolean
}

export function Logo({ size = "md", showText = true }: LogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-20 h-20",
  }

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  }

  return (
    <div className="flex items-center gap-3">
      <div className={sizeClasses[size]}>
        <Image
          src="/images/safe-voice-logo.png"
          alt="SafeVoice Logo"
          width={80}
          height={80}
          className="w-full h-full object-contain"
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={`${textSizeClasses[size]} font-bold text-foreground leading-tight`}>SafeVoice</span>
          <span className="text-xs text-muted-foreground">Speak up. Stay safe.</span>
        </div>
      )}
    </div>
  )
}
