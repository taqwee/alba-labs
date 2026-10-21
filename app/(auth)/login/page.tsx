import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/auth-forms"; // Assuming this is your form component
import { GoogleLoginButton } from "@/components/google-login-button";

export const metadata: Metadata = { title: "Client login", robots: { index: false } };

export default function Page() {
  return (
    <AuthShell title="Client login" subtitle="Sign in to see your projects and messages.">
      
      {/* Google Login Button */}
      <GoogleLoginButton />
      
      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          {/* Note: Adjust bg-surface to bg-background if the line goes through the text */}
          <span className="bg-surface px-2 text-muted">Or continue with email</span> 
        </div>
      </div>

      {/* Existing Email Login Form */}
      <LoginForm />
      
    </AuthShell>
  );
}