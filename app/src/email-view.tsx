'use dom'

import { useLayoutEffect, useRef, useState } from 'react'
import type { DOMProps } from 'expo/dom'

const width = 600

export default function EmailView({ html }: { html: string, dom?: DOMProps }) {
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
    <div ref={box} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <iframe
        srcDoc={html}
        sandbox=""
        style={{ width, height: size.height, border: 0, transform: `scale(${size.scale})`, transformOrigin: '0 0', background: '#fff' }}
      />
    </div>
  )
}
