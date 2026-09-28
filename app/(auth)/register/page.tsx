import AuthCard from "@/components/auth/AuthCard";
import RegisterForm from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100">
      <AuthCard
        title="Create Account"
        description="Register to access the WACCI Leave Management System."
      >
        <RegisterForm />
      </AuthCard>
    </main>
  );
}
