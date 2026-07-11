import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '../../supabase/server'
import { Button } from './ui/button'
import UserProfile from './user-profile'
import MobileMenu from './mobile-menu'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <nav className="w-full border-b border-border bg-background py-3 shadow-sm relative z-50">
      <div className="container mx-auto px-4 flex justify-between items-center">

        {/* Logo */}
        <Link href="/" prefetch className="flex items-center gap-2">
          <Image 
            src="/alexandria_logo.png?v=2" 
            alt="Alexandria Logo" 
            width={360} 
            height={120}
            className="h-24 w-auto"
            priority
          />
        </Link>

        {/* Desktop Center Links */}
        <div className="hidden md:flex gap-4 items-center">
          <Link href="/pricing">
            <Button variant="ghost">Pricing</Button>
          </Link>
          <Link href="/community">
            <Button variant="ghost">Community</Button>
          </Link>
          <Link href="/solutions">
            <Button variant="ghost">Solutions</Button>
          </Link>
        </div>

        {/* Right Side */}
        <div className="flex gap-4 items-center relative">
          
          {/* Mobile Hamburger */}
          <MobileMenu />

          {user ? (
            <>
              <Link href="/dashboard">
                <Button>Dashboard</Button>
              </Link>
              <UserProfile />
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}