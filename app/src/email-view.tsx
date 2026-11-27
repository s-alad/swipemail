'use dom'

import { useLayoutEffect, useRef, useState } from 'react'
import type { DOMProps } from 'expo/dom'

const width = 600

export default function EmailView({ html, fade }: { html: string; fade: string | null; dom?: DOMProps }) {
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ scale: 1, height: 0 })

  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const scale = entry.contentRect.width / width
      setSize({ scale, height: entry.contentRect.height / scale })
    })
    observer.observe(box.current!)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={box} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <iframe
        srcDoc={`<base target="_blank">${html}`}
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        style={{
          width,
          height: size.height,
          border: 0,
          transform: `scale(${size.scale})`,
          transformOrigin: '0 0',
          background: '#fff',
        }}
      />
      {fade && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 96,
            background: `linear-gradient(transparent, ${fade})`,
          }}
        />
      )}
    </div>
  )
}
