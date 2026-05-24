'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface ImageGalleryProps {
  urls: string[]
  onDelete?: (url: string) => void
  readonly?: boolean
}

export default function ImageGallery({ urls, onDelete, readonly }: ImageGalleryProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)

  if (urls.length === 0) return null

  function openLightbox(url: string) {
    setSelectedUrl(url)
    requestAnimationFrame(() => dialogRef.current?.showModal())
  }

  function closeLightbox() {
    dialogRef.current?.close()
    setSelectedUrl(null)
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {urls.map(url => (
          <motion.div
            key={url}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="group relative aspect-square overflow-hidden rounded-lg border border-slate-800 bg-slate-950"
          >
            <button
              type="button"
              className="size-full"
              onClick={() => openLightbox(url)}
              aria-label="画像を表示"
            >
              <img
                src={url}
                alt=""
                className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
            </button>
            {!readonly && onDelete && (
              <Button
                type="button"
                size="icon-xs"
                variant="destructive"
                className="absolute right-1.5 top-1.5 bg-slate-950/80"
                onClick={() => onDelete(url)}
                aria-label="画像を削除"
              >
                <Trash2 className="size-3" />
              </Button>
            )}
          </motion.div>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        className="max-h-[90vh] max-w-[92vw] rounded-xl border border-slate-700 bg-slate-950 p-0 text-slate-100 backdrop:bg-black/75"
        onClose={() => setSelectedUrl(null)}
      >
        <AnimatePresence>
          {selectedUrl && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              className="relative"
            >
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="absolute right-2 top-2 bg-slate-950/80 text-slate-200 hover:bg-slate-800"
                onClick={closeLightbox}
                aria-label="閉じる"
              >
                <X className="size-4" />
              </Button>
              <img
                src={selectedUrl}
                alt=""
                className="max-h-[90vh] max-w-[92vw] object-contain"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </dialog>
    </>
  )
}
