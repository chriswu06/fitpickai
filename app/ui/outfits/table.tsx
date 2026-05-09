import Image from "next/image";
import {UpdateOutfit, DeleteOutfit} from "@/app/ui/outfits/buttons";
import OutfitStatus from "@/app/ui/outfits/status";
import {formatDateToLocal} from "@/app/lib/utils";
import {fetchFilteredOutfits} from "@/app/lib/data";
import clsx from "clsx";

export default async function OutfitsTable({
    query,
    currentPage
}: {
    query: string;
    currentPage: number;
}) {
    const outfits = await fetchFilteredOutfits(query, currentPage);
    return (
        <div className = "mt-6 flow-root">
            <div className="inline-block min-w-full align-middle">
                <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
                    <div className="md:hidden">
                        {outfits.map((outfit, i) => {
                            return (
                                <div
                                key={outfit.id}
                                className={clsx(
                                "flex flex-row items-center justify-between py-4",
                                {"border-t": i !== 0,})}
                                >
                                    <div className = "flex items-center bg-gray-200 px-4">
                                        <div className = "min-w-0">
                                            <p className = "truncate text-sm font-semibold md:text-base">
                                                {outfit.name ?? `${outfit.user_name}'s outfit`} | Created on {outfit.date} | {outfit.rotation_status}
                                            </p>
                                            <Image
                                            src = "/clothes-hanger.jpg"
                                            alt = "Clothes hanger"
                                            className = "mx-auto"
                                            width = {75}
                                            height = {75}
                                            />
                                            <Image 
                                            src = {outfit.shirt_image_url}
                                            alt = {`${outfit.user_name}'s shirt`}
                                            className = "mx-auto"
                                            width = {100}
                                            height = {100}
                                            />
                                            <Image 
                                            src = {outfit.pants_image_url}
                                            alt = {`${outfit.user_name}'s pants`}
                                            className = "mx-auto"
                                            width = {100}
                                            height = {100}
                                            />
                                            <Image 
                                            src = {outfit.shoes_image_url}
                                            alt = {`${outfit.user_name}'s shoes`}
                                            className = "mx-auto"
                                            width = {100}
                                            height = {100}
                                            />
                                            <p className = "truncate text-md font-bold md:text-base">
                                                {outfit.user_name}
                                            </p>
                                        </div> 
                                    </div>
                                </div>
                            );})}
                    </div>
                </div>
            </div>
        </div>
    );
}