"use client";

import {useOptimistic, useTransition} from "react";
import clsx from "clsx";
import {followUser, unfollowUser} from "@/app/lib/actions";

export default function FollowButton({userId, isFollowing}: {userId: string; isFollowing: boolean}) {
    const [optimisticFollowing, setOptimisticFollowing] = useOptimistic(isFollowing);
    const [isPending, startTransition] = useTransition();

    return (
        <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(async () => {
                setOptimisticFollowing(!optimisticFollowing);
                await (optimisticFollowing ? unfollowUser(userId) : followUser(userId));
            })}
            className={clsx(
                "h-8 rounded-md px-3 text-sm font-medium transition-colors disabled:opacity-60",
                optimisticFollowing
                    ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                    : "bg-blue-600 text-white hover:bg-blue-500",
            )}
        >
            {optimisticFollowing ? "Following" : "Follow"}
        </button>
    );
}
