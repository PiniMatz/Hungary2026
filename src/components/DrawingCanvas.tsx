import React, { useRef, useState, useEffect } from 'react';

interface DrawingCanvasProps {
  onSaveDrawing: (dataUrl: string | null) => void;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onSaveDrawing }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#0f172a'); // default black/dark color for drawing
  const [brushSize, setBrushSize] = useState(5);
  const [hasDrawing, setHasDrawing] = useState(false);

  // Travel themed color palette
  const colors = [
    { value: '#0f172a', label: 'שחור' },
    { value: '#ef4444', label: 'אדום' },
    { value: '#f97316', label: 'כתום' },
    { value: '#eab308', label: 'צהוב' },
    { value: '#22c55e', label: 'ירוק' },
    { value: '#3b82f6', label: 'כחול' },
    { value: '#8b5cf6', label: 'סגול' },
    { value: '#ec4899', label: 'ורוד' },
    { value: '#ffffff', label: 'מחק / לבן' }
  ];

  const brushSizes = [
    { value: 3, label: 'דק' },
    { value: 6, label: 'בינוני' },
    { value: 12, label: 'עבה' },
    { value: 20, label: 'ענק' }
  ];

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill with white background initially so transparency doesn't turn black when converting to png
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Update drawing state when canvas changes
  const saveCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas && hasDrawing) {
      onSaveDrawing(canvas.toDataURL('image/png'));
    } else {
      onSaveDrawing(null);
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Check if it is a touch event
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent scrolling on touch screens
    if (e.cancelable) {
      e.preventDefault();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;

    setIsDrawing(true);
    setHasDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;

    // Prevent scrolling on touch screens
    if (e.cancelable) {
      e.preventDefault();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveCanvas();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    setHasDrawing(false);
    onSaveDrawing(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="canvas-card">
        <canvas
          ref={canvasRef}
          width={400}
          height={300}
          style={{
            border: '2px solid rgba(0, 0, 0, 0.15)',
            borderRadius: '6px',
            cursor: 'crosshair',
            touchAction: 'none', // Critical to prevent scrolling while drawing
            display: 'block',
            maxWidth: '100%',
            height: 'auto'
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      <div className="canvas-toolbar">
        {/* Colors Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>בחר צבע:</span>
          <div className="color-palette">
            {colors.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`color-swatch ${color === c.value ? 'active' : ''}`}
                style={{ backgroundColor: c.value }}
                title={c.label}
                onClick={() => setColor(c.value)}
              />
            ))}
          </div>
        </div>

        {/* Brush Sizes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>עובי מכחול:</span>
          <div className="brush-sizes">
            {brushSizes.map((b) => (
              <button
                key={b.value}
                type="button"
                className={`brush-btn ${brushSize === b.value ? 'active' : ''}`}
                style={{
                  width: `${24 + b.value * 0.5}px`,
                  height: `${24 + b.value * 0.5}px`,
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}
                onClick={() => setBrushSize(b.value)}
              >
                {b.value}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div>
          <button
            type="button"
            className="btn btn-danger"
            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            onClick={clearCanvas}
          >
            🗑️ נקה לוח
          </button>
        </div>
      </div>
    </div>
  );
};
export default DrawingCanvas;
