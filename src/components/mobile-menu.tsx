'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from './ui/button'

export default function MobileMenu() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Hamburger Button */}
      <button
        className="md:hidden flex flex-col gap-1"
        onClick={() => setOpen(!open)}
      >
        <span className="w-6 h-0.5 bg-foreground"></span>
        <span className="w-6 h-0.5 bg-foreground"></span>
        <span className="w-6 h-0.5 bg-foreground"></span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 w-full bg-background border-t border-border shadow-md md:hidden">
          <div className="flex flex-col p-4 gap-2">
            <Link href="/pricing">
              <Button variant="ghost" className="w-full justify-start">
                Pricing
              </Button>
            </Link>
            <Link href="/community">
              <Button variant="ghost" className="w-full justify-start">
                Community
              </Button>
            </Link>
            <Link href="/solutions">
              <Button variant="ghost" className="w-full justify-start">
                Solutions
              </Button>
            </Link>
          </div>
        </div>
      )}
    </>
  )
}