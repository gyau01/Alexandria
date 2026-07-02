import Link from "next/link";
import Image from "next/image";
import { Button } from "./ui/button";
import UserProfile from "./user-profile";

export default function DashboardNavbar() {
  return (
    <nav className="w-full border-b border-border bg-background py-3 shadow-sm">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <Image 
            src="/alexandria_logo.png?v=2" 
            alt="Alexandria Logo" 
            width={360} 
            height={120}
            className="h-24 w-auto"
            priority
          />
        </Link>
        <div className="flex gap-4 items-center absolute left-1/2 transform -translate-x-1/2">
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
        <div className="flex gap-4 items-center ml-auto">
          <Link href="/dashboard">
            <Button variant="ghost">Dashboard</Button>
          </Link>
          <UserProfile />
        </div>
      </div>
    </nav>
  );
}