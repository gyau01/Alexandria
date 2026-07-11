import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Users, Target, MessageSquare, Calendar, BookOpen, TrendingUp, CheckCircle, ArrowRight } from "lucide-react";

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-900 to-indigo-900">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative py-24 px-4 overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>
        <div className="container mx-auto text-center relative z-10">
          <h1 className="text-6xl md:text-7xl font-extrabold text-white mb-6 leading-tight">
            Building Stronger <span className="bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">Study Communities</span>
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-3xl mx-auto font-light">
            Connect with students who share your academic goals and transform your learning experience
          </p>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">
              The Problem
            </h2>
          </div>
          
          <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
            <p>
              Many students end up studying alone, feeling anxious, falling behind, and worrying about failing. 
              Research shows that <span className="font-semibold text-blue-600">collaborative studying can boost GPA by up to 25%</span> (QuadC, 2023). 
              This success is further supported by meta-analyses indicating that students in traditional, 
              non-collaborative lecture courses are <span className="font-semibold text-blue-600">1.5 times more likely to fail</span> than those in 
              active, collaborative learning environments (Freeman et al., 2014).
            </p>
            
            <p>
              But without the right tools, that kind of support just isn't accessible to most students.
            </p>
            
            <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg mt-8">
              <p className="text-gray-800 italic">
                "Cramly started with a simple frustration. It's surprisingly hard to find someone to study with 
                for homework, quizzes, and exams, in order to reach the highest potential. Even though students 
                surround lectures, there's often no easy way to connect with people who share the same goals, 
                schedules, or study habits, especially in general education courses."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Solution Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-white via-blue-50 to-white">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">
              The Solution
            </h2>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8 md:p-12 border-2 border-blue-200 shadow-xl">
            <p className="text-xl text-gray-800 leading-relaxed mb-6">
              <span className="font-bold text-blue-600">Cramly</span> is a web and mobile application platform that helps students 
              form effective study partnerships or small groups that break the barriers based on shared academic 
              characteristics such as courses, majors, availability, study location, and study preferences.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-gray-900 via-blue-900 to-indigo-900 text-white">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Three simple steps to find your perfect study community
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-background/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 hover:bg-background/15 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                <BookOpen className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">1. Create Your Profile</h3>
              <p className="text-blue-100 leading-relaxed">
                Students create a brief academic profile including school, major, classes, schedule, study style, goals, location, and more.
              </p>
            </div>

            <div className="bg-background/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 hover:bg-background/15 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                <Target className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">2. Smart Matching</h3>
              <p className="text-blue-100 leading-relaxed">
                Cramly leverages smart clustering and proven compatibility metrics to ensure every group is a perfect match.
              </p>
            </div>

            <div className="bg-background/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 hover:bg-background/15 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                <Users className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">3. Connect & Study</h3>
              <p className="text-blue-100 leading-relaxed">
                Users can message, schedule group sessions, and join or form groups of up to twenty members.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">
              Platform Features
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need for effective collaborative studying
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Messaging & Communication</h3>
                  <p className="text-muted-foreground">Connect with your study partners through real-time messaging and group chats.</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Group Sessions</h3>
                  <p className="text-muted-foreground">Schedule and organize study sessions with your group members.</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Study Groups</h3>
                  <p className="text-muted-foreground">Join or form study groups of up to twenty members based on your preferences.</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Discussion Boards</h3>
                  <p className="text-muted-foreground">Engage in course-specific discussions and share knowledge with peers.</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Focus Sessions</h3>
                  <p className="text-muted-foreground">Join structured focus sessions to maintain productivity and accountability.</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Shared Resources</h3>
                  <p className="text-muted-foreground">Access and share study materials, notes, and resources with your group.</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Poll & Reserve</h3>
                  <p className="text-muted-foreground">Use polls to coordinate study times and reserve study rooms at your university.</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">User-Friendly Design</h3>
                  <p className="text-muted-foreground">Intuitive interface designed for students, making it easy to connect and collaborate.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Research Stats Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
              Research-Backed Results
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-background/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
              <div className="text-5xl font-extrabold text-cyan-300 mb-4">25%</div>
              <h3 className="text-2xl font-bold mb-3">GPA Boost</h3>
              <p className="text-blue-100">
                Collaborative studying can boost GPA by up to 25% compared to studying alone (QuadC, 2023).
              </p>
            </div>

            <div className="bg-background/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
              <div className="text-5xl font-extrabold text-cyan-300 mb-4">1.5x</div>
              <h3 className="text-2xl font-bold mb-3">Lower Failure Rate</h3>
              <p className="text-blue-100">
                Students in collaborative learning environments are 1.5 times less likely to fail than those in traditional lecture courses (Freeman et al., 2014).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-gray-900 via-blue-900 to-indigo-900">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
              Ready to Join the <span className="bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">Community?</span>
            </h2>
            <p className="text-xl text-blue-200 mb-10 max-w-2xl mx-auto">
              Start connecting with students who share your academic goals and transform your learning experience today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="/sign-up"
                className="group relative px-10 py-5 bg-background text-blue-600 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-xl hover:shadow-2xl"
              >
                Get Started Free
                <ArrowRight className="inline-block ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="/solutions"
                className="px-10 py-5 bg-blue-500/20 text-white border-2 border-blue-400/50 rounded-full font-semibold text-lg hover:bg-blue-500/30 hover:border-blue-400 transition-all"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

