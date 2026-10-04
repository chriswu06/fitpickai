"use client";

import {createOutfit} from "@/app/lib/actions";
import OutfitForm from "@/app/ui/outfits/outfit-form";

export default function Form() {
    return <OutfitForm action={createOutfit} submitLabel="Create Outfit" />;
}
