import { Suspense } from "react";
import UserSearchTable from "@/app/ui/users/search-table";
import { fetchFilteredUsers } from "@/app/lib/data";

export default async function ConnectPage({
    searchParams,
}: {
    searchParams?: Promise<{ query?: string }>;
}) {
    const params = await searchParams;
    const query = params?.query || "";
    const users = await fetchFilteredUsers(query);

    return (
        <div className="w-full">
            <Suspense fallback={null}>
                <UserSearchTable users={users} />
            </Suspense>
        </div>
    );
}
