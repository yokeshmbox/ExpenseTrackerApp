
"use client"

import { CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const Icon = variant === 'destructive' ? XCircle : CheckCircle;
        const iconColor = variant === 'destructive' ? 'text-destructive-foreground' : 'text-emerald-500';

        return (
          <Toast key={id} variant={variant} {...props}>
             <div className="flex items-start gap-3">
              <Icon className={`h-6 w-6 mt-0.5 ${iconColor}`} />
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
