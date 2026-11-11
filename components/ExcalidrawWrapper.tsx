'use client'

import { useCallback, useEffect, useRef } from 'react'
import {
  CaptureUpdateAction,
  Excalidraw,
  newElementWith,
  viewportCoordsToSceneCoords,
} from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawImperativeAPI = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FreedrawElement = any

interface Props {
  excalidrawAPI?: (api: ExcalidrawImperativeAPI) => void
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

export function ExcalidrawWrapper({ excalidrawAPI }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const lastTouchRef = useRef<TouchPoint | null>(null)

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
      if (!isTouchLike(event)) return
      if (!host.contains(event.target as Node)) return
      lastTouchRef.current = {
        x: event.clientX,
        y: event.clientY,
        id: event.pointerId,
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
      if (!isTouchLike(event)) return
      const last = lastTouchRef.current
      if (!last || last.id !== event.pointerId) return

      // Excalidraw always appends pointerup scene coords as an extra freedraw
      // point. Touch/pen lift reports a shifted contact centroid, which shows
      // up as a jump at the end of the stroke. Pin the lift to the last move.
      rewriteClientPoint(event, last.x, last.y)

      queueMicrotask(() => {
        if (apiRef.current) {
          pinFreedrawLiftToLastMove(apiRef.current, last)
        }
        if (lastTouchRef.current?.id === last.id) {
          lastTouchRef.current = null
        }
      })
    }

    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('pointermove', onPointerMove, true)
    window.addEventListener('pointerup', onPointerLift, true)
    window.addEventListener('pointercancel', onPointerLift, true)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('pointermove', onPointerMove, true)
      window.removeEventListener('pointerup', onPointerLift, true)
      window.removeEventListener('pointercancel', onPointerLift, true)
    }
  }, [])

  return (
    <div ref={hostRef} className='absolute inset-0 party-excalidraw-host'>
      <Excalidraw
        excalidrawAPI={handleAPI}
        theme='light'
        initialData={{
          appState: {
            activeTool: FREEDRAW_TOOL,
          },
        }}
        UIOptions={{
          canvasActions: {
            export: false,
            loadScene: false,
            saveToActiveFile: false,
            saveAsImage: false,
          },
        }}
      />
    </div>
  )
}
