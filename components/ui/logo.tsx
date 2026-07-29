import Image from "next/image"

interface LogoProps {
  size?: "sm" | "md" | "lg"
  showText?: boolean
  className?: string
}

export function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
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
    <div className={`flex items-center ${showText ? "gap-3" : ""} ${className}`.trim()}>
      <div className={sizeClasses[size]}>
        <Image
          src="/SafeVoiceLogo.png"
          alt="SafeVoice Logo"
          width={80}
          height={80}
          className="w-full h-full object-contain"
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={`${textSizeClasses[size]} font-bold text-primary leading-tight`}>SafeVoice</span>
          <span className="text-xs text-primary/70">Speak up. Stay safe.</span>
        </div>
      )}
    </div>
  )
}
