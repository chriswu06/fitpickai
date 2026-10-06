import {Metadata} from "next";
import Form from "@/app/ui/outfits/create-form";
import Breadcrumbs from "@/app/ui/outfits/breadcrumbs";

export const metadata: Metadata = {
    title: "Create Outfit"
};

export default function CreateOutfitPage() {
    return (
        <main>
            <Breadcrumbs
                breadcrumbs={[
                    {label: "Outfits", href: "/dashboard/outfits"},
                    {label: "Create Outfit", href: "/dashboard/outfits/create", active: true},
                ]}
            />
            <Form />
        </main>
    );
}
