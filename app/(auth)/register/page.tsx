import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/auth-forms";
import { GoogleLoginButton } from "@/components/google-login-button"; // Import your new button

export const metadata: Metadata = { title: "Create your account", robots: { index: false } };

export default function Page() {
  return (
    <AuthShell title="Create your account" subtitle="Customer accounts give you a private space for projects, files and messages.">
      
      {/* Google Login Button */}
      <GoogleLoginButton />
      
      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-background px-2 text-muted">Or continue with email</span>
        </div>
      </div>

      {/* Existing Email Registration Form */}
      <RegisterForm />
      
    </AuthShell>
  );
}