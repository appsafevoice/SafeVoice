"use client"

import { CheckCheck, AlertCircle } from "lucide-react"

interface PasswordStrengthIndicatorProps {
  password: string
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const validations = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  }

  const score = Object.values(validations).filter(Boolean).length

  const getStrengthLabel = () => {
    if (score <= 1) return { label: "Very Weak", color: "bg-red-500" }
    if (score <= 2) return { label: "Weak", color: "bg-orange-500" }
    if (score <= 3) return { label: "Fair", color: "bg-yellow-500" }
    if (score <= 4) return { label: "Good", color: "bg-blue-500" }
    return { label: "Strong", color: "bg-green-500" }
  }

  const { label, color } = getStrengthLabel()

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Password Strength</span>
        <span className={`text-sm font-semibold ${
          score <= 1 ? "text-red-600" :
          score <= 2 ? "text-orange-600" :
          score <= 3 ? "text-yellow-600" :
          score <= 4 ? "text-blue-600" : "text-green-600"
        }`}>
          {label}
        </span>
      </div>
      
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${color}`}
          style={{ width: `${score * 20}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2">
        {Object.entries(validations).map(([key, valid]) => (
          <div key={key} className="flex items-center gap-2 text-xs">
            {valid ? (
              <CheckCheck className="w-3 h-3 text-green-500" />
            ) : (
              <AlertCircle className="w-3 h-3 text-muted-foreground" />
            )}
            <span className={valid ? "text-green-600" : "text-muted-foreground"}>
              {key === "length" && "8+ characters"}
              {key === "uppercase" && "Uppercase letter"}
              {key === "lowercase" && "Lowercase letter"}
              {key === "number" && "Number"}
              {key === "specialChar" && "Special character"}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}