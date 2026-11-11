'use client'

const STROKES = [
  { color: '#1e1e1e', label: 'Black' },
  { color: '#ff2d78', label: 'Pink' },
  { color: '#b026ff', label: 'Purple' },
  { color: '#00c8d4', label: 'Cyan' },
  { color: '#ffd700', label: 'Gold' },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawAPI = any

export function DrawToolbar({
  api,
  tool,
  color,
  onTool,
  onColor,
  onUndo,
  onRedo,
  onClear,
}: {
  api: ExcalidrawAPI | null
  tool: 'freedraw' | 'eraser'
  color: string
  onTool: (tool: 'freedraw' | 'eraser') => void
  onColor: (color: string) => void
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
}) {
  const ready = Boolean(api)

  return (
    <div className='draw-toolbar' role='toolbar' aria-label='Drawing tools'>
      <button
        type='button'
        className={`draw-tool${tool === 'freedraw' ? ' is-active' : ''}`}
        aria-pressed={tool === 'freedraw'}
        aria-label='Pencil'
        disabled={!ready}
        onClick={() => onTool('freedraw')}
      >
        ✎
      </button>
      <div className='draw-swatches' role='group' aria-label='Stroke color'>
        {STROKES.map((swatch) => (
          <button
            key={swatch.color}
            type='button'
            className={`draw-swatch${color === swatch.color && tool === 'freedraw' ? ' is-active' : ''}`}
            style={{ background: swatch.color }}
            aria-label={swatch.label}
            aria-pressed={color === swatch.color && tool === 'freedraw'}
            disabled={!ready}
            onClick={() => onColor(swatch.color)}
          />
        ))}
      </div>
      <button
        type='button'
        className={`draw-tool${tool === 'eraser' ? ' is-active' : ''}`}
        aria-pressed={tool === 'eraser'}
        aria-label='Eraser'
        disabled={!ready}
        onClick={() => onTool('eraser')}
      >
        ⌫
      </button>
      <span className='draw-toolbar-gap' />
      <button
        type='button'
        className='draw-tool'
        aria-label='Undo'
        disabled={!ready}
        onClick={onUndo}
      >
        ↶
      </button>
      <button
        type='button'
        className='draw-tool'
        aria-label='Redo'
        disabled={!ready}
        onClick={onRedo}
      >
        ↷
      </button>
      <button
        type='button'
        className='draw-tool draw-tool-clear'
        aria-label='Clear canvas'
        disabled={!ready}
        onClick={onClear}
      >
        Clear
      </button>
    </div>
  )
}
