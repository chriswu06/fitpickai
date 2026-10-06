import "@/app/ui/global.css";
import { inter} from "@/app/ui/fonts";
import {Metadata} from "next";
import React from "react";

export const metadata: Metadata = {
    title: "FitPickAI",
    description: "The official FitPickAI Landing Page",
    metadataBase: new URL("https://fitpickai.vercel.app/"),
    icons: {
        icon: "/favicon.ico"
    }
};

export default function RootLayout({children}: {children: React.ReactNode;}) {
    return (
        <html lang="en">
            <body className = {`${inter.className} antialiased`}>{children}</body>
        </html>
    )
}