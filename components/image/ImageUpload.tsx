'use client'

import { useRef, useState, type DragEvent } from 'react'
import { ImagePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  refTable: string
  refId: string
  onUploaded: (url: string) => void
  disabled?: boolean
}

export default function ImageUpload({
  refTable,
  refId,
  onUploaded,
  disabled,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  async function uploadFile(file: File | undefined) {
    if (!file || disabled || isUploading) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('ref_table', refTable)
    formData.append('ref_id', refId)

    setIsUploading(true)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const payload = (await response.json().catch(() => ({}))) as {
        url?: string
        error?: string
      }

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? 'アップロードに失敗しました')
      }

      onUploaded(payload.url)
      toast.success('画像をアップロードしました')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'アップロードに失敗しました')
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setIsDragging(false)
    void uploadFile(event.dataTransfer.files[0])
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled || isUploading}
        onChange={event => void uploadFile(event.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        disabled={disabled || isUploading}
        className={cn(
          'h-28 w-full flex-col gap-2 border-dashed border-amber-400/25 bg-slate-950/40 text-slate-300 hover:bg-amber-400/10',
          isDragging && 'border-amber-300 bg-amber-400/10 text-amber-100'
        )}
        onClick={() => inputRef.current?.click()}
        onDragEnter={event => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragOver={event => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <Loader2 className="size-5 animate-spin text-amber-300" />
        ) : (
          <ImagePlus className="size-5 text-amber-300" />
        )}
        <span className="text-sm">
          {isUploading ? 'アップロード中' : '画像をドラッグまたはクリック'}
        </span>
      </Button>
    </div>
  )
}
