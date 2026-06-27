'use client'
import { useEffect, useState, useCallback } from 'react'
import { UserCircle, User } from 'lucide-react'
import { Button } from './ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { createClient } from '../../supabase/client'
import { useRouter } from 'next/navigation'

/** Fired from Profile (and similar) when `public.users` display fields change so the header can refetch. */
export const PROFILE_USER_UPDATED_EVENT = "cramly:profile-user-updated"

export default function UserProfile() {
    const [userName, setUserName] = useState<string>("")
    const [profilePicture, setProfilePicture] = useState<string | null>(null)
    const router = useRouter()

    const loadUserData = useCallback(async (bustImageCache?: boolean) => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data } = await supabase
                .from("users")
                .select("full_name, profile_picture_url")
                .eq("user_id", user.id)
                .single()
            
            if (data) {
                setUserName(data.full_name || "")
                const raw = data.profile_picture_url
                if (!raw) {
                    setProfilePicture(null)
                } else if (bustImageCache) {
                    const base = raw.split("?")[0]
                    setProfilePicture(`${base}?v=${Date.now()}`)
                } else {
                    setProfilePicture(raw)
                }
            }
        }
    }, [])

    useEffect(() => {
        loadUserData()
        const onUserProfileUpdated = () => {
            loadUserData(true)
        }
        window.addEventListener(PROFILE_USER_UPDATED_EVENT, onUserProfileUpdated)
        return () => window.removeEventListener(PROFILE_USER_UPDATED_EVENT, onUserProfileUpdated)
    }, [loadUserData])

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Avatar className="h-8 w-8">
                        {profilePicture && <AvatarImage key={profilePicture} src={profilePicture} alt={userName} />}
                        <AvatarFallback className="bg-blue-600 text-white">
                            {userName?.[0]?.toUpperCase() || <UserCircle className="h-5 w-5" />}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{userName || "User"}</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/dashboard?tab=profile")}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => {
                    const supabase = createClient()
                    await supabase.auth.signOut()
                    router.push("/")
                }}>
                    Sign out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}