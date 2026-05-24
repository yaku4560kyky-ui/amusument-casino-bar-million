'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  disabled?: boolean
}

type SpeechRecognitionResultEvent = Event & {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string
      }
    }
  }
}

type SpeechRecognitionInstance = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

export default function VoiceInput({ onTranscript, disabled = false }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  const unsupportedTitle = 'このブラウザは音声入力非対応です'
  const buttonTitle = useMemo(
    () => (isSupported ? (isRecording ? '音声入力を停止' : '音声入力') : unsupportedTitle),
    [isRecording, isSupported]
  )

  useEffect(() => {
    const speechWindow = window as SpeechRecognitionWindow
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
    setIsSupported(Boolean(Recognition))
    if (!Recognition) return

    const recognition = new Recognition()
    recognition.lang = 'ja-JP'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = event => {
      const transcript = event.results[0]?.[0]?.transcript
      if (transcript) onTranscript(transcript)
    }
    recognition.onerror = () => {
      toast.error('音声認識に失敗しました')
      setIsRecording(false)
    }
    recognition.onend = () => setIsRecording(false)
    recognitionRef.current = recognition

    return () => {
      recognition.stop()
      recognitionRef.current = null
    }
  }, [onTranscript])

  function handleClick() {
    if (!recognitionRef.current || disabled) return

    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
      return
    }

    try {
      recognitionRef.current.start()
      setIsRecording(true)
    } catch {
      toast.error('音声認識に失敗しました')
      setIsRecording(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      title={buttonTitle}
      aria-label={buttonTitle}
      disabled={disabled || !isSupported}
      className={cn(
        'relative border-amber-400/20 bg-transparent text-amber-200 hover:bg-amber-400/10',
        isRecording && 'border-red-400/40 text-red-300'
      )}
      onClick={handleClick}
    >
      {isRecording ? <MicOff className="size-4" /> : <Mic className="size-4" />}
      {isRecording && (
        <span className="absolute right-1 top-1 size-2 animate-pulse rounded-full bg-red-500" />
      )}
    </Button>
  )
}
