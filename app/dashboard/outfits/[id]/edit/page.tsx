import {Metadata} from "next";
import {notFound} from "next/navigation";
import EditOutfitForm from "@/app/ui/outfits/edit-form";
import Breadcrumbs from "@/app/ui/outfits/breadcrumbs";
import {fetchOutfitById} from "@/app/lib/data";

export const metadata: Metadata = {
    title: "Edit Outfit"
};

export default async function EditOutfitPage({params}: {params: Promise<{id: string}>}) {
    const {id} = await params;
    const outfit = await fetchOutfitById(id);
    if (!outfit) notFound();

    return (
        <main>
            <Breadcrumbs
                breadcrumbs={[
                    {label: "Outfits", href: "/dashboard/outfits"},
                    {label: `Edit ${outfit.name ?? "Outfit"}`, href: `/dashboard/outfits/${id}/edit`, active: true},
                ]}
            />
            <EditOutfitForm outfit={outfit} />
        </main>
    );
}
