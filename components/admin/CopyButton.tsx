'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckIcon, CopyIcon } from 'lucide-react'

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="outline" size="sm" className="text-xs gap-1" onClick={handleCopy}>
      {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
      {copied ? 'コピー済み' : 'URLコピー'}
    </Button>
  )
}
