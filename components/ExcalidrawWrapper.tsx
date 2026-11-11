'use client'

import { useCallback, useEffect, useRef } from 'react'
import {
  CaptureUpdateAction,
  Excalidraw,
  newElementWith,
  viewportCoordsToSceneCoords,
} from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { SITE_NAME } from '@/lib/brand'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawImperativeAPI = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FreedrawElement = any

interface Props {
  excalidrawAPI?: (api: ExcalidrawImperativeAPI) => void
  onStableScene?: (elementsJson: string) => void
}

const FREEDRAW_TOOL = {
  type: 'freedraw' as const,
  lastActiveTool: null,
  locked: false,
  customType: null,
}

type TouchPoint = { x: number; y: number; id: number }

function isTouchLike(event: PointerEvent) {
  return event.pointerType === 'touch' || event.pointerType === 'pen'
}

function rewriteClientPoint(event: PointerEvent, x: number, y: number) {
  try {
    Object.defineProperty(event, 'clientX', { configurable: true, value: x })
    Object.defineProperty(event, 'clientY', { configurable: true, value: y })
    return true
  } catch {
    return false
  }
}

function pinFreedrawLiftToLastMove(
  api: ExcalidrawImperativeAPI,
  lastClient: TouchPoint,
) {
  const elements = api.getSceneElements() as FreedrawElement[]
  const last = [...elements]
    .reverse()
    .find((el) => el.type === 'freedraw' && !el.isDeleted)
  if (!last || last.points.length < 2) return

  const scene = viewportCoordsToSceneCoords(
    { clientX: lastClient.x, clientY: lastClient.y },
    api.getAppState(),
  )
  const dx = scene.x - last.x
  const dy = scene.y - last.y
  const end = last.points[last.points.length - 1]
  if (Math.hypot(end[0] - dx, end[1] - dy) < 0.5) return

  api.updateScene({
    elements: elements.map((el) =>
      el.id === last.id
        ? newElementWith(el, {
            points: [...last.points.slice(0, -1), [dx, dy]],
            lastCommittedPoint: [dx, dy],
          })
        : el,
    ),
    captureUpdate: CaptureUpdateAction.NEVER,
  })
}

export function ExcalidrawWrapper({ excalidrawAPI, onStableScene }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const lastTouchRef = useRef<TouchPoint | null>(null)
  const onStableSceneRef = useRef(onStableScene)
  onStableSceneRef.current = onStableScene

  const handleAPI = useCallback(
    (api: ExcalidrawImperativeAPI) => {
      apiRef.current = api
      let primed = false
      const primeFreedraw = () => {
        if (primed) return
        primed = true
        api.setActiveTool({ type: 'freedraw' })
      }
      if (!api.getAppState()?.isLoading) {
        primeFreedraw()
      }
      const unsub = api.onChange((_elements: unknown, appState: { isLoading?: boolean }) => {
        if (!appState.isLoading) {
          primeFreedraw()
          unsub()
        }
      })
      excalidrawAPI?.(api)
    },
    [excalidrawAPI],
  )

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const onPointerDown = (event: PointerEvent) => {
      if (!host.contains(event.target as Node)) return
      if (isTouchLike(event)) {
        lastTouchRef.current = {
          x: event.clientX,
          y: event.clientY,
          id: event.pointerId,
        }
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!isTouchLike(event)) return
      const last = lastTouchRef.current
      if (!last || last.id !== event.pointerId) return
      lastTouchRef.current = {
        x: event.clientX,
        y: event.clientY,
        id: event.pointerId,
      }
    }

    const onPointerLift = (event: PointerEvent) => {
      const last = lastTouchRef.current
      const isStroke = last?.id === event.pointerId || host.contains(event.target as Node)
      if (isTouchLike(event) && last && last.id === event.pointerId) {
        // Excalidraw always appends pointerup scene coords as an extra freedraw
        // point. Touch/pen lift reports a shifted contact centroid, which shows
        // up as a jump at the end of the stroke. Pin the lift to the last move.
        rewriteClientPoint(event, last.x, last.y)
      }

      if (!isStroke) return

      queueMicrotask(() => {
        if (apiRef.current) {
          if (last && last.id === event.pointerId) {
            pinFreedrawLiftToLastMove(apiRef.current, last)
          }
          const elements = apiRef.current.getSceneElements()
          onStableSceneRef.current?.(JSON.stringify(elements))
        }
        if (lastTouchRef.current?.id === event.pointerId) {
          lastTouchRef.current = null
        }
      })
    }

    const blockPageGesture = (event: Event) => {
      if (!host.contains(event.target as Node)) return
      event.preventDefault()
    }

    const blockPinch = (event: TouchEvent) => {
      if (!host.contains(event.target as Node)) return
      if (event.touches.length > 1) event.preventDefault()
    }

    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('pointermove', onPointerMove, true)
    window.addEventListener('pointerup', onPointerLift, true)
    window.addEventListener('pointercancel', onPointerLift, true)
    host.addEventListener('gesturestart', blockPageGesture, { passive: false })
    host.addEventListener('gesturechange', blockPageGesture, { passive: false })
    host.addEventListener('touchmove', blockPinch, { passive: false })
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('pointermove', onPointerMove, true)
      window.removeEventListener('pointerup', onPointerLift, true)
      window.removeEventListener('pointercancel', onPointerLift, true)
      host.removeEventListener('gesturestart', blockPageGesture)
      host.removeEventListener('gesturechange', blockPageGesture)
      host.removeEventListener('touchmove', blockPinch)
    }
  }, [])

  return (
    <div ref={hostRef} className='absolute inset-0 party-excalidraw-host'>
      <Excalidraw
        excalidrawAPI={handleAPI}
        theme='light'
        handleKeyboardGlobally
        name={SITE_NAME}
        initialData={{
          appState: {
            activeTool: FREEDRAW_TOOL,
            currentItemStrokeColor: '#1e1e1e',
            currentItemStrokeWidth: 2,
            currentItemOpacity: 100,
          },
        }}
        UIOptions={{
          canvasActions: {
            export: false,
            loadScene: false,
            saveToActiveFile: false,
            saveAsImage: false,
            toggleTheme: false,
            clearCanvas: false,
            changeViewBackgroundColor: false,
          },
          tools: {
            image: false,
          },
        }}
      />
    </div>
  )
}
