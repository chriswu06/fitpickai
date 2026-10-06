"use client";
import {montserrat} from "@/app/ui/fonts";
import {AtSymbolIcon, KeyIcon, ExclamationCircleIcon, UserIcon} from "@heroicons/react/24/outline";
import {ArrowRightIcon} from "@heroicons/react/20/solid";
import {Button} from "./button";
import {useActionState} from "react";
import {createUser, UserState} from "@/app/lib/actions";
import {useSearchParams} from "next/navigation";

export default function RegisterForm() {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
    const initialState: UserState = {errors: null, message: null};
    const [errorMessage, formAction, isPending] = useActionState(createUser, initialState);
    return (
        <form action = {formAction} className = "space-y-3">
            <div className = "flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
                <h1 className = {`${montserrat.className} mb-3 text-2xl`}>
                    Register to create your stylish outfits today!
                </h1>
                <div className = "w-full">
                    <div>
                        <label className = "mb-3 mt-5 block text-xs font-medium text-gray-900" htmlFor = "name">
                            Name
                        </label>
                        <div className = "relative">
                            <input
                                className = "peer block w-full rounded-md border border-gray-200 py-[9x] pl-10 text-sm outline-2 placeholder:text-gray-500"
                                id = "name"
                                type = "text"
                                name = "name"
                                placeholder = "Enter your full name"
                                required
                            />
                            <UserIcon className = "pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900"/>
                        </div>
                        {errorMessage?.errors?.name && <p className="mt-1 text-xs text-red-500">{errorMessage.errors.name[0]}</p>}
                    </div>
                    <div className = "mt-4">
                        <label className = "mb-3 mt-5 block text-xs font-medium text-gray-900" htmlFor = "email">
                            Email
                        </label>
                        <div className = "relative">
                            <input
                                className = "peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
                                id = "email"
                                type = "email"
                                name = "email"
                                placeholder = "Enter your email address"
                                required
                            />
                            <AtSymbolIcon className = "pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900"/>
                        </div>
                        {errorMessage?.errors?.email && <p className="mt-1 text-xs text-red-500">{errorMessage.errors.email[0]}</p>}
                    </div>
                    <div className = "mt-4">
                        <label className = "mb-3 mt-5 block text-xs font-medium text-gray-900" htmlFor = "password">
                            Password
                        </label>
                        <div className = "relative">
                            <input
                                className = "peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
                                id = "password"
                                type = "password"
                                name = "password"
                                placeholder = "Enter password"
                                required
                                minLength={11}
                            />
                            <KeyIcon className = "pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900"/>
                        </div>
                        {errorMessage?.errors?.password && <p className="mt-1 text-xs text-red-500">{errorMessage.errors.password[0]}</p>}
                    </div>
                    <div className = "mt-4">
                        <label className = "mb-3 mt-5 block text-xs font-medium text-gray-900" htmlFor = "repassword">
                            Re-Enter Password
                        </label>
                        <div className = "relative">
                            <input
                                className = "peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
                                id = "repassword"
                                type = "password"
                                name = "repassword"
                                placeholder = "Re-Enter password"
                                required
                                minLength={11}
                            />
                            <KeyIcon className = "pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900"/>
                        </div>
                        {errorMessage?.errors?.repassword && <p className="mt-1 text-xs text-red-500">{errorMessage.errors.repassword[0]}</p>}
                    </div>
                    <input type = "hidden" name = "redirectTo" value = {callbackUrl}/>
                    <Button className = "mt-4 w-[100px]" aria-disabled = {isPending}>
                        Register <ArrowRightIcon className = "ml-auto h-5 w-5 text-gray-50"/>
                    </Button>
                    <div className = "flex h-10 items-end space-x-1">
                        {errorMessage?.message && (
                            <>
                                <ExclamationCircleIcon className = "h-5 w-5 text-red-500"/>
                                <p className = "text-sm text-red-500">{errorMessage.message}</p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </form>
    );
}