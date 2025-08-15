'use client';

import { useState } from 'react';
import ChatInterface from '@/components/chat-interface';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Coffee, Code, Sparkles } from 'lucide-react';

interface Persona {
  name: string;
  avatar: string;
  description: string;
  personality: string;
  tagline: string;
  color: string;
  features: string[];
}

const personas: Persona[] = [
  {
    name: "Hitesh Choudhary",
    avatar: "/hitesh-choudhary-avatar.png",
    description: "Your go-to tech mentor who believes in building real projects. Grab a cup of chai, and let's write some code.",
    personality:
      "Namaste! I'm Hitesh, your friendly guide in the world of programming. My philosophy is simple: learning happens by doing. I'm not here to just teach you theory; I'm here to help you build things. I believe in breaking down complex topics into simple, digestible pieces, just like enjoying a good cup of tea. I'm always encouraging, focus on practical results, and love seeing developers grow their skills.",
    tagline: "Chai aur Code: Let's build something great together.",
    color: "from-amber-600 to-orange-500",
    features: [
      "Full-Stack Development (MERN)",
      "Mobile App Dev (React Native, Flutter)",
      "Backend (Go, Node.js)",
      "Developer Career Advice",
      "Building Real-World Projects"
    ]
  },
  {
    name: "Piyush Garg",
    avatar: "/piyush-garg-dev-avatar.jpg",
    description: "Your expert guide to the world of web development. As a GDE for Angular, I help you build performant and scalable frontends.",
    personality:
      "Hey there! I'm Piyush. I am a Google Developer Expert in Angular and I'm passionate about the web platform. My focus is on writing clean, performant, and scalable code by diving deep into the fundamentals. I enjoy exploring the 'why' behind the 'how' and sharing my knowledge through articles, talks, and videos. I believe in following best practices and truly understanding the tools we use to become better engineers.",
    tagline: "Building for the web, one component at a time.",
    color: "from-sky-600 to-indigo-700",
    features: [
      "Angular & RxJS Deep Dives",
      "Web Performance Optimization",
      "Frontend Architecture",
      "Technical Speaking",
      "Content Creation"
    ]
  }
];

export default function Home() {
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [brainstormMode, setBrainstormMode] = useState(false);

  if (selectedPersona) {
    return (
      <ChatInterface
        initialPersona={selectedPersona}
        onBack={() => setSelectedPersona(null)}
      />
    );
  }

  if (brainstormMode) {
    return (
      <ChatInterface
        brainstormMode={true}
        onBack={() => setBrainstormMode(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 py-10 px-4 transition-colors duration-500">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-slate-900 dark:text-amber-200 mb-4 animate-fade-in-up">
            Welcome to ChaiGPT.
          </h1>
          <p className="text-lg text-slate-700 dark:text-slate-300 animate-fade-in-up">
            Select the latest Super Intelligent model to chat
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {personas.map((persona, index) => (
            <Card
              key={persona.name}
              className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl border-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-900 animate-fade-in-up group`}
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => setSelectedPersona(persona)}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${persona.color} opacity-10 group-hover:opacity-20 transition-opacity duration-500`} />
              <div className="relative p-8 flex flex-col items-center text-center space-y-4">
                <Avatar className="h-20 w-20 ring-4 ring-white dark:ring-slate-800 shadow-lg group-hover:ring-amber-200 transition-all duration-500">
                  <AvatarImage src={persona.avatar} alt={persona.name} />
                  <AvatarFallback className={`bg-gradient-to-r ${persona.color} text-white text-2xl font-bold`}>
                    {persona.name[0]}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-amber-100 mb-1 group-hover:text-amber-800 dark:group-hover:text-amber-300 transition-colors duration-300">
                  {persona.name}
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-base mb-2">{persona.description}</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">{persona.tagline}</p>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {persona.features.map((feature) => (
                    <span
                      key={feature}
                      className="px-2 py-1 bg-amber-100 dark:bg-slate-800 text-amber-800 dark:text-amber-200 text-xs rounded-full"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
                <Button
                  className={`w-full mt-4 bg-gradient-to-r ${persona.color} hover:shadow-lg transition-all duration-300 text-white border-0 h-12 text-base font-semibold group-hover:scale-[1.02] animate-gradient-x`}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedPersona(persona);
                  }}
                >
                  Chat with {persona.name}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Brainstorm Mode Card */}
        <div className="max-w-2xl mx-auto">
          <Card
            className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer bg-gradient-to-r from-white/95 via-amber-50/90 to-orange-50/95 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm hover:from-white hover:via-amber-50 hover:to-orange-50 dark:hover:from-slate-900 dark:hover:via-slate-800 dark:hover:to-slate-900 animate-fade-in-up"
            onClick={() => setBrainstormMode(true)}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 dark:from-indigo-900/20 dark:via-slate-800/10 dark:to-indigo-900/20 group-hover:from-amber-500/20 group-hover:via-orange-500/20 group-hover:to-yellow-500/20 dark:group-hover:from-indigo-900/30 dark:group-hover:via-slate-800/20 dark:group-hover:to-indigo-900/30 transition-all duration-500" />
            <div className="relative p-8 flex flex-col items-center text-center space-y-4">
              <div className="flex items-center gap-4 mb-2">
                <Avatar className="h-14 w-14 ring-4 ring-white dark:ring-slate-800 shadow-lg group-hover:ring-amber-200 transition-all duration-500 z-10">
                  <AvatarImage src="/hitesh-choudhary-avatar.png" alt="Hitesh Choudhary" />
                  <AvatarFallback className="bg-gradient-to-r from-amber-600 to-orange-500 text-white text-xl font-bold">H</AvatarFallback>
                </Avatar>
                <Avatar className="h-14 w-14 ring-4 ring-white dark:ring-slate-800 shadow-lg group-hover:ring-indigo-200 transition-all duration-500">
                  <AvatarImage src="/piyush-garg-dev-avatar.png" alt="Piyush Garg" />
                  <AvatarFallback className="bg-gradient-to-r from-sky-600 to-indigo-700 text-white text-xl font-bold">P</AvatarFallback>
                </Avatar>
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-indigo-600 dark:from-indigo-700 dark:to-amber-600 shadow-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-100 to-indigo-100 dark:from-slate-800 dark:to-indigo-900 rounded-full px-4 py-2 mb-2">
                <Sparkles className="h-4 w-4 text-amber-600 dark:text-indigo-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Brainstorm Mode</span>
                <Coffee className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <Code className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-amber-100 mb-1 group-hover:bg-gradient-to-r group-hover:from-amber-700 group-hover:to-indigo-700 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-500">
                Chai + Code Collaboration
              </h3>
              <p className="text-base text-slate-700 dark:text-slate-300 mb-2 group-hover:text-slate-800 dark:group-hover:text-amber-200 transition-colors duration-300">
                Get the best of both worlds! Brainstorm with both Hitesh and Piyush simultaneously. Perfect for when you need life wisdom <b>and</b> technical solutions.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mb-2">
                {["Creative Solutions", "Life + Tech Balance", "Holistic Approach", "Double Wisdom"].map(
                  (feature, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gradient-to-r from-amber-200 to-indigo-200 dark:from-slate-800 dark:to-indigo-900 text-indigo-900 dark:text-indigo-200 text-xs rounded-full"
                    >
                      {feature}
                    </span>
                  )
                )}
              </div>
              <Button className="w-full mt-2 bg-gradient-to-r from-amber-600 via-orange-500 to-indigo-600 dark:from-indigo-700 dark:via-amber-700 dark:to-orange-700 hover:from-amber-700 hover:via-orange-600 hover:to-indigo-700 dark:hover:from-indigo-800 dark:hover:via-amber-800 dark:hover:to-orange-800 hover:shadow-xl transition-all duration-300 text-white border-0 h-12 px-8 text-base font-semibold group-hover:scale-[1.02] animate-gradient-x">
                Start Brainstorming Together
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}