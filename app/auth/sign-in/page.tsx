import AuthForm from "@/components/AuthForm";

export default function SignInPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-8">
        <h2 className="text-3xl font-bold">Welcome to PanAvest Courses</h2>
        <p className="mt-2 text-white/70">Sign in to access your dashboard and courses.</p>
      </div>
      <AuthForm mode="sign-in" />
    </div>
  );
}
