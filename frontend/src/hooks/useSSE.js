import { useEffect, useRef } from 'react'

// Generic EventSource hook.
// url: string | null — pass null to disconnect / stay idle.
// onMessage: (parsedData: any) => void — called with JSON-parsed event data.
// options.onError: (event) => void — optional error handler.
export function useSSE(url, onMessage, options = {}) {
  const onMessageRef = useRef(onMessage)
  const onErrorRef   = useRef(options.onError)

  useEffect(() => { onMessageRef.current = onMessage }, [onMessage])
  useEffect(() => { onErrorRef.current   = options.onError }, [options.onError])

  useEffect(() => {
    if (!url) return

    const es = new EventSource(url)

    es.onmessage = event => {
      try {
        onMessageRef.current(JSON.parse(event.data))
      } catch (err) {
        console.error('[useSSE] parse error', err)
      }
    }

    es.onerror = event => {
      onErrorRef.current?.(event)
    }

    return () => es.close()
  }, [url])
}
