import {montserrat} from '@/app/ui/fonts';
import Search from '@/app/ui/search';
import Link from 'next/link';
import {UserField} from '@/app/lib/definitions';
import FollowButton from '@/app/ui/users/follow-button';

const avgRating = (value: number | null) => (value === null ? 'no' : value);

export default function UserSearchTable({users}: {users: UserField[]}) {
    return (
        <div className = "w-full">
            <h1 className = {`${montserrat.className} mb-8 text-xl md:text-2xl`}>
                Find Users
            </h1>
            <Search placeholder = "Search users..."/>
            <div className="mt-6 flow-root">
            <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden rounded-md bg-gray-50 p-2 md:pt-0">
                <div className="md:hidden">
                    {users?.map((user) => (
                    <div
                        key={user.id}
                        className="mb-2 w-full rounded-md bg-white p-4"
                    >
                        <div className="flex items-center justify-between border-b pb-4">
                        <div>
                            <div className="mb-2 flex items-center">
                            <div className="flex items-center gap-3">
                                <Link href={`/dashboard/connect/${user.id}`} className="font-medium hover:underline">{user.name}</Link>
                            </div>
                            </div>
                            <p className="text-sm text-gray-500">
                            {user.email} | {avgRating(user.avg_self_rating)} average self-rating
                            </p>
                        </div>
                        </div>
                        <div className="flex w-full items-center justify-between border-b py-5">
                        <div className="flex w-1/2 flex-col">
                            <p className="text-xs">Outfits in Rotation</p>
                            <p className="font-medium">{user.total_in_rotation}</p>
                        </div>
                        <div className="flex w-1/2 flex-col">
                            <p className="text-xs">Outfits out of Rotation</p>
                            <p className="font-medium">{user.total_out_of_rotation}</p>
                        </div>
                        </div>
                        <div className="pt-4 text-sm">
                        <p>{user.total_outfits} total outfits </p>
                        </div>
                        <div className="pt-4">
                        <FollowButton userId={user.id} isFollowing={user.is_following} />
                        </div>
                    </div>
                    ))}
                </div>
                <table className="hidden min-w-full rounded-md text-gray-900 md:table">
                    <thead className="rounded-md bg-gray-50 text-left text-sm font-normal">
                    <tr>
                        <th scope="col" className="px-4 py-5 font-medium sm:pl-6">
                        Name
                        </th>
                        <th scope="col" className="px-3 py-5 font-medium">
                        Email & Avg Self-Rating
                        </th>
                        <th scope="col" className="px-3 py-5 font-medium">
                        Total Outfits in Rotation
                        </th>
                        <th scope="col" className="px-3 py-5 font-medium">
                        Total Outfits out of Rotation
                        </th>
                        <th scope="col" className="px-4 py-5 font-medium">
                        Total Outfits
                        </th>
                        <th scope="col" className="px-4 py-5 font-medium">
                        <span className="sr-only">Follow</span>
                        </th>
                    </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 text-gray-900">
                    {users.map((user) => (
                        <tr key={user.id} className="group">
                        <td className="whitespace-nowrap bg-white py-5 pl-4 pr-3 text-sm text-black group-first-of-type:rounded-md group-last-of-type:rounded-md sm:pl-6">
                            <div className="flex items-center gap-3">
                            <Link href={`/dashboard/connect/${user.id}`} className="font-medium hover:underline">{user.name}</Link>
                            </div>
                        </td>
                        <td className="whitespace-nowrap bg-white px-4 py-5 text-sm">
                            {user.email} | {avgRating(user.avg_self_rating)} average self-rating
                        </td>
                        <td className="whitespace-nowrap bg-white px-4 py-5 text-sm">
                            {user.total_in_rotation}
                        </td>
                        <td className="whitespace-nowrap bg-white px-4 py-5 text-sm">
                            {user.total_out_of_rotation}
                        </td>
                        <td className="whitespace-nowrap bg-white px-4 py-5 text-sm">
                            {user.total_outfits}
                        </td>
                        <td className="whitespace-nowrap bg-white px-4 py-5 text-right text-sm group-first-of-type:rounded-md group-last-of-type:rounded-md">
                            <FollowButton userId={user.id} isFollowing={user.is_following} />
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                {users.length === 0 && (
                    <p className="p-6 text-center text-sm text-gray-500">No users found.</p>
                )}
                </div>
            </div>
            </div>
        </div>
        </div>
    );
}