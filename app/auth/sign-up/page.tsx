import AuthForm from "@/components/AuthForm";

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-8">
        <h2 className="text-3xl font-bold">Create your account</h2>
        <p className="mt-2 text-white/70">Register to enroll in knowledge and take assessments.</p>
      </div>
      <AuthForm mode="sign-up" />
    </div>
  );
}
