"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Send, Heart, ThumbsUp, Laugh, Angry, FrownIcon as Sad, SmileIcon as Surprise, ArrowLeft, Coffee, Code } from "lucide-react"

interface Message {
  id: string
  content: string
  sender: "user" | "ai"
  timestamp: Date
  reactions?: { [key: string]: number }
}

interface Persona {
  name: string
  avatar: string
  description: string
  personality: string
  tagline: string
  color: string
  features: string[]
}

interface ChatInterfaceProps {
  initialPersona?: Persona
  brainstormMode?: boolean
  onBack: () => void
}

const reactionEmojis = [
  { emoji: "❤️", icon: Heart, key: "heart" },
  { emoji: "👍", icon: ThumbsUp, key: "thumbs_up" },
  { emoji: "😂", icon: Laugh, key: "laugh" },
  { emoji: "😮", icon: Surprise, key: "surprise" },
  { emoji: "😢", icon: Sad, key: "sad" },
  { emoji: "😠", icon: Angry, key: "angry" },
]

export default function ChatInterface({ initialPersona, brainstormMode = false, onBack }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [showReactions, setShowReactions] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Initial greeting message
    if (brainstormMode) {
      const initialMessage: Message = {
        id: "1",
        content: "Hey there! We're Chai and Code, ready to brainstorm together! ☕💻 Whether you need life wisdom or tech solutions, we've got you covered. What's on your mind?",
        sender: "ai",
        timestamp: new Date(),
        reactions: {},
      }
      setMessages([initialMessage])
    } else if (initialPersona) {
      const initialMessage: Message = {
        id: "1",
        content: initialPersona.personality,
        sender: "ai",
        timestamp: new Date(),
        reactions: {},
      }
      setMessages([initialMessage])
    }
  }, [initialPersona, brainstormMode])

  const callAPI = async (userMessage: string): Promise<string> => {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { 
              role: "system", 
              content: brainstormMode 
                ? "You are both Chai and Code working together. Chai is a warm, wise tea enthusiast who gives life advice. Code is a tech-savvy programmer who solves technical problems. Respond as both personalities collaborating."
                : `You are ${initialPersona?.name}. ${initialPersona?.personality}`
            },
            { role: "user", content: userMessage }
          ]
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data = await response.json()
      return data.message || "I'm here to help! How can I assist you today?"
    } catch (error) {
      console.error("API Error:", error)
      return "I'm having trouble connecting right now, but I'm here to help! Could you try again?"
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
      reactions: {},
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsTyping(true)

    setTimeout(async () => {
      const aiResponse = await callAPI(inputValue)
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        sender: "ai",
        timestamp: new Date(),
        reactions: {},
      }

      setMessages((prev) => [...prev, aiMessage])
      setIsTyping(false)
    }, 1500)
  }

  const handleReaction = (messageId: string, reactionKey: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          const reactions = { ...msg.reactions }
          reactions[reactionKey] = (reactions[reactionKey] || 0) + 1
          return { ...msg, reactions }
        }
        return msg
      }),
    )
    setShowReactions(null)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleLongPressStart = (messageId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setShowReactions(messageId)
    }, 500)
  }

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleMessageClick = (messageId: string) => {
    if (!longPressTimerRef.current) {
      setShowReactions(showReactions === messageId ? null : messageId)
    }
  }

  const getHeaderInfo = () => {
    if (brainstormMode) {
      return {
        name: "Hitesh & Piyush",
        description: "Brainstorm Mode Active",
        avatar: "/placeholder.svg"
      }
    }
    return {
      name: initialPersona?.name || "AI",
      description: initialPersona?.description || "AI Assistant",
      avatar: initialPersona?.avatar || "/placeholder.svg"
    }
  }

  const headerInfo = getHeaderInfo()

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-amber-200 bg-white/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10 hover:bg-amber-100">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {brainstormMode ? (
            <div className="relative flex -space-x-2">
              <Avatar className="h-10 w-10 ring-2 ring-white">
                <AvatarImage src="/hitesh-choudhary-avatar.png" alt="Hitesh Choudhary" />
                <AvatarFallback>H</AvatarFallback>
              </Avatar>
              <Avatar className="h-10 w-10 ring-2 ring-white">
                <AvatarImage src="/piyush-garg-dev-avatar.png" alt="Piyush Garg" />
                <AvatarFallback>P</AvatarFallback>
              </Avatar>
            </div>
          ) : (
            <Avatar className="h-10 w-10">
              <AvatarImage src={headerInfo.avatar} alt={headerInfo.name} />
              <AvatarFallback>{headerInfo.name[0]}</AvatarFallback>
            </Avatar>
          )}
          
          <div>
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              {headerInfo.name}
              {brainstormMode && (
                <div className="flex items-center gap-1">
                  <Coffee className="h-4 w-4 text-amber-600" />
                  <Code className="h-4 w-4 text-emerald-600" />
                </div>
              )}
            </h2>
            <p className="text-sm text-slate-600">{headerInfo.description}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 fade-in-up ${message.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {message.sender === "ai" && (
              brainstormMode ? (
                <div className="relative flex -space-x-1">
                  <Avatar className="h-8 w-8 ring-2 ring-white">
                    <AvatarImage src="/hitesh-choudhary-avatar.png" alt="Hitesh Choudhary" />
                    <AvatarFallback>H</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-8 w-8 ring-2 ring-white">
                    <AvatarImage src="/piyush-garg-dev-avatar.png" alt="Piyush Garg" />
                    <AvatarFallback>P</AvatarFallback>
                  </Avatar>
                </div>
              ) : (
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarImage src={headerInfo.avatar} alt={headerInfo.name} />
                  <AvatarFallback>{headerInfo.name[0]}</AvatarFallback>
                </Avatar>
              )
            )}

            <div className={`flex flex-col ${message.sender === "user" ? "items-end" : "items-start"}`}>
              <Card
                className={`max-w-xs lg:max-w-md p-3 cursor-pointer transition-all hover:shadow-md ${
                  message.sender === "user" 
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white" 
                    : "bg-white/90 backdrop-blur-sm text-slate-900 border-amber-200"
                }`}
                onMouseDown={() => handleLongPressStart(message.id)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                onTouchStart={() => handleLongPressStart(message.id)}
                onTouchEnd={handleLongPressEnd}
                onClick={() => handleMessageClick(message.id)}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>

                {Object.keys(message.reactions || {}).length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {Object.entries(message.reactions || {}).map(([key, count]) => {
                      const reaction = reactionEmojis.find((r) => r.key === key)
                      return (
                        <span key={key} className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full flex items-center gap-1">
                          {reaction?.emoji} {count}
                        </span>
                      )
                    })}
                  </div>
                )}
              </Card>

              {showReactions === message.id && (
                <div className="flex gap-1 mt-2 p-2 bg-white rounded-lg shadow-lg border border-amber-200 animate-in fade-in-0 zoom-in-95">
                  {reactionEmojis.map((reaction) => (
                    <Button
                      key={reaction.key}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-amber-100"
                      onClick={() => handleReaction(message.id, reaction.key)}
                    >
                      {reaction.emoji}
                    </Button>
                  ))}
                </div>
              )}

              <span className="text-xs text-slate-500 mt-1">
                {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3 fade-in-up">
            {brainstormMode ? (
              <div className="relative flex -space-x-1">
                <Avatar className="h-8 w-8 ring-2 ring-white">
                  <AvatarImage src="/hitesh-choudhary-avatar.png" alt="Hitesh Choudhary" />
                  <AvatarFallback>H</AvatarFallback>
                </Avatar>
                <Avatar className="h-8 w-8 ring-2 ring-white">
                  <AvatarImage src="/piyush-garg-dev-avatar.png" alt="Piyush Garg" />
                  <AvatarFallback>P</AvatarFallback>
                </Avatar>
              </div>
            ) : (
              <Avatar className="h-8 w-8 mt-1">
                <AvatarImage src={headerInfo.avatar} alt={headerInfo.name} />
                <AvatarFallback>{headerInfo.name[0]}</AvatarFallback>
              </Avatar>
            )}
            <Card className="bg-white/90 backdrop-blur-sm text-slate-900 border-amber-200 p-3 max-w-xs">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-amber-500 rounded-full typing-dot"></div>
                <div className="w-2 h-2 bg-amber-500 rounded-full typing-dot"></div>
                <div className="w-2 h-2 bg-amber-500 rounded-full typing-dot"></div>
              </div>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-amber-200 bg-white/90 backdrop-blur-sm">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${headerInfo.name}...`}
              className="resize-none bg-white border-amber-200 focus:ring-amber-500 focus:border-amber-500"
              disabled={isTyping}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            size="icon"
            className="h-10 w-10 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
