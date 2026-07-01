import Hero from "@/components/hero";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import WaitlistSection from "@/components/waitlist-section";
import FeedbackSection from "@/components/feedback-section";
import { createClient } from "../../supabase/server";
import { ArrowUpRight, Users, MessageSquare, Target, Shield } from 'lucide-react';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative py-24 px-4 overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>
        <div className="container mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
            Find Your Perfect <span className="bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">Study Buddy</span>
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-2xl mx-auto font-light">
            Connect with compatible study partners in three simple steps to improve your grades!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a href={user ? "/dashboard" : "/sign-up"} className="group relative px-8 py-4 bg-white text-blue-600 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-xl hover:shadow-2xl">
              {user ? "Go to Dashboard" : "Get Started Free"}
              <ArrowUpRight className="inline-block ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="/solutions" className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-full font-semibold text-lg hover:bg-white/20 transition-all">
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Waitlist Section */}
      <WaitlistSection />

      {/* Platform Preview Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            {/* Left: Text Content */}
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Step 1: Create Profile
              </h2>
              <p className="text-lg text-gray-600">
                Students add their university, major, enrolled classes, GPA, and study preferences (time, location, group size, study style).
              </p>
            </div>
            {/* Right: Image Placeholder */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg aspect-square flex items-center justify-center min-h-[300px] border border-blue-100 overflow-hidden">
              <img 
                src="/profile1.png" 
                alt="Student Profile Example" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            {/* Left: Profile Images */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8 min-h-[800px] border border-blue-100">
              <div className="grid grid-cols-1 gap-6 h-full">
                <div className="bg-white rounded-xl overflow-hidden shadow-md">
                  <img 
                    src="/profile2.png" 
                    alt="Student Profile Example 2" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="bg-white rounded-xl overflow-hidden shadow-md">
                  <img 
                    src="/profile3.png" 
                    alt="Student Profile Example 3" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
            {/* Right: Text Content */}
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Step 2: Smart Matching
              </h2>
              <p className="text-lg text-gray-600 mb-32">
                Our algorithm analyzes compatibility based on shared classes, similar study preferences, availability overlap, and academic goals to find your perfect study partners.
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Step 3: Connect & Study
              </h2>
              <p className="text-lg text-gray-600">
                Once matched, you can message your study partners, schedule group sessions, share resources, and form study groups of up to 20 members.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gradient-to-b from-white via-blue-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Find study partners who match your academic profile and study style in three simple steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="group relative text-center p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200 hover:border-blue-400 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Create Your Profile</h3>
              <p className="text-gray-700">Add your major, classes, GPA, and study preferences to help us understand your needs</p>
            </div>

            <div className="group relative text-center p-8 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-100 border-2 border-indigo-200 hover:border-indigo-400 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Get Matched</h3>
              <p className="text-gray-700">Our algorithm finds compatible study partners based on shared classes and preferences</p>
            </div>

            <div className="group relative text-center p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-100 border-2 border-blue-200 hover:border-blue-400 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Start Studying</h3>
              <p className="text-gray-700">Connect via chat and coordinate study sessions with your new study buddies</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Why Students Love Us</h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">Join thousands of students who have improved their grades through collaborative studying</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: <Target className="w-8 h-8" />, title: "Smart Matching", description: "AI-powered algorithm finds your ideal study partners" },
              { icon: <Users className="w-8 h-8" />, title: "Verified Students", description: "University email verification ensures authentic connections" },
              { icon: <MessageSquare className="w-8 h-8" />, title: "Real-time Chat", description: "Instant messaging to coordinate study sessions" },
              { icon: <Shield className="w-8 h-8" />, title: "Safe & Secure", description: "Your data is protected with enterprise-grade security" }
            ].map((feature, index) => (
              <div key={index} className="text-center bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 hover:bg-white/15 transition-all">
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-blue-50">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feedback Section */}
      <FeedbackSection />

      <Footer />
    </div>
  );
}