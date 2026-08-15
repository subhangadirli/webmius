import { FitAddon } from '@xterm/addon-fit'
import { Terminal as XTerm } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

export interface TerminalHandle {
  write: (data: string) => void
  reset: () => void
}

interface TerminalProps {
  onData: (data: string) => void
  onResize: (cols: number, rows: number) => void
}

const Terminal = forwardRef<TerminalHandle, TerminalProps>(({ onData, onResize }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)

  useImperativeHandle(ref, () => ({
    write: (data: string) => xtermRef.current?.write(data),
    reset: () => xtermRef.current?.reset(),
  }))

  useEffect(() => {
    if (!containerRef.current) return

    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'monospace',
      theme: { background: '#0a0a0a' },
    })
    const fitAddon = new FitAddon()
    xterm.loadAddon(fitAddon)
    xterm.open(containerRef.current)
    fitAddon.fit()
    xterm.focus()

    xtermRef.current = xterm

    const dataSubscription = xterm.onData(onData)

    const emitSize = () => onResize(xterm.cols, xterm.rows)
    emitSize()

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
      emitSize()
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      dataSubscription.dispose()
      xterm.dispose()
      xtermRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={containerRef} className="h-full w-full" />
})

Terminal.displayName = 'Terminal'

export default Terminal
