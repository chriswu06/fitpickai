import SideNav from "@/app/ui/dashboard/sidenav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen flex-col md:flex-row md:overflow-hidden">
            <div className="w-full flex-none md:w-64">
                <SideNav />
            </div>
            <div className="flex-grow p-6 md:overflow-y-auto md:p-12">
                {children}
                {/* Required by the Amazon Associates Operating Agreement wherever affiliate links appear. */}
                <p className="mt-12 text-center text-[11px] text-gray-400">As an Amazon Associate FitPickAI earns from qualifying purchases.</p>
            </div>
        </div>
    );
}
