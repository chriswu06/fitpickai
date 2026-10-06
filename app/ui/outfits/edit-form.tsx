"use client";

import {Outfit} from "@/app/lib/definitions";
import {updateOutfit} from "@/app/lib/actions";
import OutfitForm from "@/app/ui/outfits/outfit-form";

export default function EditOutfitForm({outfit}: {outfit: Outfit}) {
    const updateOutfitWithId = updateOutfit.bind(null, outfit.id);
    return <OutfitForm action={updateOutfitWithId} outfit={outfit} submitLabel="Update Outfit" />;
}
