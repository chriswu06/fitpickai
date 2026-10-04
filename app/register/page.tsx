import FitPickAILogo from "@/app/ui/fitpickai-logo";
import RegisterForm from "@/app/ui/register-form";
import { Suspense } from "react";
import { Metadata } from "next";
import GoogleSignIn from "@/app/ui/google-sign-in";

export const metadata: Metadata = {
    title: "Register"
};

export default function RegisterPage() {
    return (
        <main className="flex items-center justify-center md:h-screen">
            <div className="relative mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4 md:-mt-32">
                <div className="flex h-20 w-full items-end rounded-lg bg-pink-500 p-3 md:h-36">
                <div className="text-white">
                    <FitPickAILogo />
                </div>
                </div>
                <Suspense fallback = {<p>Hang on, getting the register page...</p>}>
                <RegisterForm />
                </Suspense>
                <GoogleSignIn />
            </div>
        </main>
    );
}