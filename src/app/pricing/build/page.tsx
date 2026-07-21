import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import OptionCard from "@/components/option-card";
import { createClient } from "../../../../supabase/server";

type Option = {
  id: number;
  name: string;
  description: string;
  amount: number;
};

const OPTIONS: Option[] = [
  {
    id: 8,
    name: "Group Chats",
    description: "Create group chats to coordinate",
    amount: 99,
  },
  {
    id: 4,
    name: "Unlimited Matching",
    description: "As many matches as you want",
    amount: 99,
  },
  {
    id: 2,
    name: "Unlimited Polls",
    description: "As many polls as you want",
    amount: 99,
  },
  {
    id: 1,
    name: "Unlimited Discussion Board Posts",
    description: "As many discussion board posts as you want",
    amount: 99,
  },
];

export default async function Builder() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-900 to-indigo-900">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4">
            Pick as many as you would like
          </h1>
          <p className="text-xl text-blue-200 max-w-2xl mx-auto">
            Less for less and more for more
          </p>
        </div>

        {/* Pass user and options down to the client component */}
        <OptionCard user={user} options={OPTIONS} />
      </div>
      <Footer />
    </div>
  );
}
