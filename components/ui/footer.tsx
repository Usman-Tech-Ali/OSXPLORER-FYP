"use client"

import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Github, Linkedin, Twitter, Instagram, Mail, ExternalLink, BookOpen, Code, Gamepad2 } from "lucide-react"

export function Footer() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  // Hide footer on games page
  if (/^\/modules\/[^/]+\/games\/[^/]+/.test(pathname)) return null;

  const currentYear = new Date().getFullYear()

  const platformLinks = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Modules", href: "/modules" },
    { name: "Achievements", href: "/achievements" },
    { name: "Leaderboard", href: "/leaderboard" },
    { name: "Mini-Quests", href: "/mini-quest" },
  ]

  const resourceLinks = [
    { name: "Documentation", href: "/docs" },
    { name: "API Reference", href: "/api" },
    { name: "Tutorials", href: "/tutorials" },
    { name: "Community", href: "/community" },
    { name: "Blog", href: "/blog" },
  ]

  const legalLinks = [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
    { name: "Cookie Policy", href: "/cookies" },
    { name: "DMCA", href: "/dmca" },
  ]

  const supportLinks = [
    { name: "Help Center", href: "/help" },
    { name: "Contact Us", href: "/contact" },
    { name: "Bug Reports", href: "/bugs" },
    { name: "Feature Requests", href: "/features" },
  ]

  const teamMembers = [
    {
      name: "Abdullah Daoud",
      role: "Frontend Developer",
      avatar: "/placeholder.svg?height=40&width=40",
      social: {
        github: "https://github.com/Abdullah-57",
        linkedin: "https://linkedin.com/in/abdullah-daoud-1b3857257",
        instagram: "https://instagram.com/abdullah_daoud_57/",
      },
      color: "from-orange-500 to-red-600",
    },
    {
      name: "Usman Ali",
      role: "Backend Developer",
      avatar: "/placeholder.svg?height=40&width=40",
      social: {
        github: "https://github.com/Usman-Tech-Ali",
        linkedin: "https://linkedin.com/in/usman-ali-6bb4972a0/",
        twitter: "https://www.instagram.com/usmanali._.ua/",
      },
      color: "from-blue-500 to-indigo-600",
    },
    {
      name: "Faizan Rasheed",
      role: "Game Designer",
      avatar: "/placeholder.svg?height=40&width=40",
      social: {
        github: "https://github.com/faizan17579",
        linkedin: "https://linkedin.com/in/faizan-rasheed-aa3a00226/",
        twitter: "https://instagram.com/faizanrasheed175/",
      },
      color: "from-purple-500 to-pink-600",
    },
  ]

  return (
    <footer className="relative z-10 border-t border-gray-800 bg-black backdrop-blur-sm">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-x-12">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <Link href="/">
                <Image
                  src="/OSXplorer.png"
                  alt="OSXplorer Logo"
                  width={120}
                  height={60}
                  priority
                  className="object-contain h-auto w-auto hover:scale-110 transition-transform duration-200 cursor-pointer hover:drop-shadow-[0_0_16px_#00fff7]"
                />
              </Link>
            <p className="text-gray-400 mt-4 text-sm leading-relaxed">
              Master Operating Systems through immersive 2D gaming experiences. Learn complex concepts while having fun
              in our retro-futuristic environment.
            </p>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="text-white font-semibold mb-4 flex items-center">
              <Gamepad2 className="w-4 h-4 mr-2 text-cyan-400" />
              Platform
            </h3>
            <ul className="space-y-2">
              {platformLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-cyan-400 transition-colors text-sm flex items-center group"
                  >
                    {link.name}
                    <ExternalLink className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="text-white font-semibold mb-4 flex items-center">
              <BookOpen className="w-4 h-4 mr-2 text-purple-400" />
              Resources
            </h3>
            <ul className="space-y-2">
              {resourceLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-purple-400 transition-colors text-sm flex items-center group"
                  >
                    {link.name}
                    <ExternalLink className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-white font-semibold mb-4 flex items-center">
              <Mail className="w-4 h-4 mr-2 text-green-400" />
              Support
            </h3>
            <ul className="space-y-2">
              {supportLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-green-400 transition-colors text-sm flex items-center group"
                  >
                    {link.name}
                    <ExternalLink className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Meet the Development Team Section - only for lg and up */}
          <div className="hidden lg:flex flex-col">
            <h3 className="text-white font-semibold mb-6 flex items-center lg:justify-start">
              <Code className="w-5 h-5 mr-2 text-cyan-400" />
              Meet the Development Team
            </h3>
            <div className="flex flex-col gap-2">
              {teamMembers.map((member, index) => (
                <div
                  key={index}
                  className="bg-gray-900/50 rounded-lg p-2 border border-gray-700/50 hover:border-cyan-500/30 transition-all duration-300 group min-h-[60px]"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <div
                      className={`w-8 h-8 rounded-full bg-gradient-to-r ${member.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                    >
                      <span className="text-white font-semibold text-xs">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                    <div>
                      <div className="text-white font-medium text-xs">{member.name}</div>
                      <Badge variant="outline" className="text-[10px] border-gray-600 text-gray-400 mt-0.5">
                        {member.role}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <a
                      href={member.social.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <Github className="w-3 h-3" />
                    </a>
                    <a
                      href={member.social.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-blue-400 transition-colors"
                    >
                      <Linkedin className="w-3 h-3" />
                    </a>
                    <a
                      href={member.social.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-purple-400 transition-colors"
                    >
                      <Instagram className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Meet the Development Team Section - centered only for md and below */}
        <div className="mt-8 md:flex md:justify-center lg:hidden">
          <div className="flex flex-col w-full">
            <h3 className="text-white font-semibold mb-6 flex items-center md:justify-center lg:justify-start">
              <Code className="w-5 h-5 mr-2 text-cyan-400" />
              Meet the Development Team
            </h3>
            <div className="flex flex-col gap-2">
              {teamMembers.map((member, index) => (
                <div
                  key={index}
                  className="bg-gray-900/50 rounded-lg p-2 border border-gray-700/50 hover:border-cyan-500/30 transition-all duration-300 group min-h-[60px]"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <div
                      className={`w-8 h-8 rounded-full bg-gradient-to-r ${member.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                    >
                      <span className="text-white font-semibold text-xs">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                    <div>
                      <div className="text-white font-medium text-xs">{member.name}</div>
                      <Badge variant="outline" className="text-[10px] border-gray-600 text-gray-400 mt-0.5">
                        {member.role}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <a
                      href={member.social.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <Github className="w-3 h-3" />
                    </a>
                    <a
                      href={member.social.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-blue-400 transition-colors"
                    >
                      <Linkedin className="w-3 h-3" />
                    </a>
                    <a
                      href={member.social.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-purple-400 transition-colors"
                    >
                      <Instagram className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Removed old Team Section and Legal Links section here */}
        </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800 bg-black">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 w-full">
            <div className="flex flex-col md:flex-row md:items-center md:space-x-6 w-full justify-between">
              <div className="flex flex-wrap justify-center md:justify-start space-x-6 mb-2 md:mb-0">
              {legalLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-gray-500 hover:text-gray-300 transition-colors text-sm"
                >
                  {link.name}
                </Link>
              ))}
            </div>
            <div className="flex items-center space-x-4 md:justify-end justify-center w-full md:w-auto mt-4 md:mt-0">
              <a
                href="https://github.com/Abdullah-57/OSXplorer"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com/oslearnplus"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-cyan-400 transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a href="mailto:team@oslearn.dev" className="text-gray-400 hover:text-green-400 transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
          {/* Single row, centered copyright and love text at the very bottom */}
          <div className="w-full text-center text-xs text-gray-500 mt-2">
            © 2025 OSLearn+. All rights reserved. Level up your learning. &nbsp;|&nbsp; Made with ❤️ by the OSXplorer Team
          </div>
        </div>
      </div>
    </footer>
  )
}
