import { SetupForm } from '@/components/setup/SetupForm'

export default function SetupPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-50">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
      
      <div className="w-full max-w-lg z-10">
        <SetupForm />
        
        <p className="text-center mt-8 text-slate-400 text-xs">
          Copyright &copy; 2026 taskaio. All rights reserved.
        </p>
      </div>
    </div>
  )
}
