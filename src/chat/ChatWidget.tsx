import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { ensureContactChannelsLoaded } from '../catalog/contactChannels'
import { answerFor } from './chatbot'

type ChatMessage = {
  id: number
  role: 'user' | 'bot'
  text: string
  link?: { label: string; href: string }
}

const TYPING_DELAY_MS = 450

const SUGGESTIONS = ['¿Cómo hago un pedido?', '¿Cuánto tarda la entrega?', '¿Hacen envíos?']

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="currentColor">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="currentColor">
      <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  )
}

/**
 * Floating rules-based chat widget. Mounts once in the shop root so it floats
 * above every view. Answers come from the local rule engine; contact-channel
 * data hydrates from Supabase through the shared catalog singleton so the
 * chat always reflects the owner's panel edits.
 */
export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [entered, setEntered] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const greetedRef = useRef(false)
  const nextIdRef = useRef(0)
  const listRef = useRef<HTMLDivElement>(null)
  const timersRef = useRef<number[]>([])
  const pendingRepliesRef = useRef(0)

  // Warm the channels singleton on mount so DB-fresh contact data is in
  // place before the visitor asks anything (bundled JSON serves meanwhile).
  useEffect(() => {
    void ensureContactChannelsLoaded()
  }, [])

  const appendMessage = (message: Omit<ChatMessage, 'id'>) => {
    setMessages((prev) => [...prev, { ...message, id: nextIdRef.current++ }])
  }

  const replyWithTyping = (text: string, link?: ChatMessage['link']) => {
    pendingRepliesRef.current += 1
    setIsTyping(true)
    const timer = window.setTimeout(() => {
      appendMessage({ role: 'bot', text, link })
      pendingRepliesRef.current -= 1
      if (pendingRepliesRef.current === 0) setIsTyping(false)
    }, TYPING_DELAY_MS)
    timersRef.current.push(timer)
  }

  // Greeting message on the first time the panel is opened.
  useEffect(() => {
    if (!open || greetedRef.current) return
    greetedRef.current = true
    const greeting = answerFor('hola')
    replyWithTyping(greeting.text, greeting.link)
  }, [open])

  // Entry animation: the panel mounts hidden and flips to visible on the
  // next frame so the CSS transition runs from the hidden state.
  useEffect(() => {
    if (!open) return
    setEntered(false)
    const raf = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(raf)
  }, [open])

  // Keep the newest message in view.
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages, isTyping, open])

  // Clear pending timers on unmount.
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  const sendMessage = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    appendMessage({ role: 'user', text: trimmed })
    setInput('')
    const answer = answerFor(trimmed)
    replyWithTyping(answer.text, answer.link)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      sendMessage(input)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }

  const close = () => {
    setClosing(true)
    setEntered(false)
    const timer = window.setTimeout(() => {
      setOpen(false)
      setClosing(false)
    }, 180)
    timersRef.current.push(timer)
  }

  const toggle = () => {
    if (open) {
      close()
    } else {
      setOpen(true)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? 'Cerrar chat' : 'Abrir chat'}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-surface shadow-lg transition-transform motion-reduce:transition-none hover:scale-105"
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>

      {open && (
        <div
          className={`fixed bottom-24 right-5 z-50 flex h-[min(60vh,460px)] w-[min(92vw,360px)] flex-col overflow-hidden rounded-xl border border-brand-primary/20 bg-white shadow-2xl transition-all duration-200 ease-out motion-reduce:transition-none ${
            closing || !entered ? 'pointer-events-none translate-y-2 scale-95 opacity-0' : 'translate-y-0 scale-100 opacity-100'
          }`}
        >
          <header className="flex items-center justify-between bg-brand-deep px-4 py-3 text-surface">
            <div>
              <p className="font-display text-lg font-semibold">¿Te ayudamos?</p>
              <p className="text-xs text-surface/70">Consultas y pedidos</p>
            </div>
            <button
              type="button"
              onClick={toggle}
              aria-label="Cerrar chat"
              className="rounded-full p-1 text-surface/80 transition-colors motion-reduce:transition-none hover:text-surface"
            >
              <CloseIcon />
            </button>
          </header>

          <div ref={listRef} role="log" className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'rounded-br-sm bg-surface text-ink'
                      : 'rounded-bl-sm bg-brand-primary/10 text-ink'
                  }`}
                >
                  <p>{message.text}</p>
                  {message.link && (
                    <a
                      href={message.link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex font-medium text-brand-primary underline underline-offset-2 transition-colors motion-reduce:transition-none hover:text-brand-deep"
                    >
                      {message.link.label}
                    </a>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-brand-primary/10 px-3 py-2">
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/50 motion-reduce:animate-none"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/50 motion-reduce:animate-none"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/50 motion-reduce:animate-none"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 border-t border-brand-primary/10 px-3 py-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => sendMessage(suggestion)}
                  className="rounded-full border border-brand-primary/30 px-3 py-1.5 text-xs text-brand-primary transition-colors motion-reduce:transition-none hover:bg-brand-primary hover:text-surface"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-brand-primary/10 p-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu consulta..."
              aria-label="Escribe tu consulta"
              className="flex-1 rounded-full border border-brand-primary/30 bg-surface/60 px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:border-brand-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={() => sendMessage(input)}
              aria-label="Enviar mensaje"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary text-surface transition-colors motion-reduce:transition-none hover:bg-brand-deep"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      )}
    </>
  )
}