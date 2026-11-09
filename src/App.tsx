import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as fabric from 'fabric';
import { 
  Plus, 
  Trash2, 
  RotateCcw, 
  Download, 
  FlipHorizontal, 
  Copy, 
  Upload, 
  Type, 
  HelpCircle,
  PenTool,
  MousePointer,
  Check,
  X,
  Sparkles,
  Sliders,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eraser,
  Undo2,
  Grid,
  Maximize2
} from 'lucide-react';
import { CHARACTERS, BACKGROUNDS, STICKERS, BUBBLES, COMIC_SYMBOLS } from './constants';
import { Asset } from './types';
import { removeWhiteBackground } from './imageUtils';
import confetti from 'canvas-confetti';

interface PanelState {
  id: string;
  title: string;
}

interface TextPropsState {
  fontFamily: string;
  fontSize: number;
  fill: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  textAlign: 'left' | 'center' | 'right';
  stroke: string;
  strokeWidth: number;
  backgroundColor: string;
}

const COMIC_FONTS = [
  { id: 'Bangers', name: 'Bangers (Titoli Azione)' },
  { id: 'Comic Neue', name: 'Comic Neue (Dialogo Classico)' },
  { id: 'Patrick Hand', name: 'Patrick Hand (Manoscritto)' },
  { id: 'Anton', name: 'Anton (Pugno Visivo)' },
  { id: 'Bungee', name: 'Bungee (Grafico Pop)' },
];

const COMIC_COLORS = [
  { name: 'Nero', hex: '#111827' },
  { name: 'Bianco', hex: '#ffffff' },
  { name: 'Giallo Fumetto', hex: '#facc15' },
  { name: 'Rosso Fuoco', hex: '#dc2626' },
  { name: 'Blu Elettrico', hex: '#2563eb' },
  { name: 'Verde Acido', hex: '#16a34a' },
  { name: 'Viola Ombra', hex: '#7c3aed' },
  { name: 'Arancione', hex: '#ea580c' },
];

export default function App() {
  const [panels, setPanels] = useState<PanelState[]>([
    { id: 'panel-1', title: 'Scena 1: In Classe' },
    { id: 'panel-2', title: 'Scena 2: Sul Tetto' },
  ]);
  const [activePanelId, setActivePanelId] = useState<string>('panel-1');
  const [viewMode, setViewMode] = useState<'focus' | 'all'>('focus');
  const [activeTab, setActiveTab] = useState<'text' | 'characters' | 'backgrounds' | 'bubbles' | 'stickers' | 'symbols' | 'upload'>('text');
  
  // Selection and Drawing state
  const [selectedObjectType, setSelectedObjectType] = useState<string | null>(null);
  const [selectedTextContent, setSelectedTextContent] = useState<string>('');
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [inkColor, setInkColor] = useState<string>('#111827');
  const [inkWidth, setInkWidth] = useState<number>(5);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [canvasRevision, setCanvasRevision] = useState<number>(0);
  const bumpRevision = useCallback(() => setCanvasRevision(r => r + 1), []);

  // Active text styling state (pure comic black fill by default, never painted over by white stroke)
  const [textProps, setTextProps] = useState<TextPropsState>({
    fontFamily: 'Comic Neue',
    fontSize: 20,
    fill: '#111827',
    isBold: true,
    isItalic: false,
    isUnderline: false,
    textAlign: 'center',
    stroke: '',
    strokeWidth: 0,
    backgroundColor: 'transparent',
  });

  // Global map storing all permanent canvas instances by panel ID
  const canvasInstances = useRef<Map<string, fabric.Canvas>>(new Map());
  // Ref keeping track of last selected object across blur events
  const lastSelectedObjectRef = useRef<fabric.FabricObject | null>(null);

  const registerCanvas = useCallback((id: string, canvas: fabric.Canvas) => {
    canvasInstances.current.set(id, canvas);
  }, []);

  const unregisterCanvas = useCallback((id: string) => {
    canvasInstances.current.delete(id);
  }, []);

  const getActiveCanvas = useCallback((): fabric.Canvas | null => {
    return canvasInstances.current.get(activePanelId) || null;
  }, [activePanelId]);

  // Synchronize state when an object on canvas is selected
  const handleSelectionUpdate = useCallback((activeObj: fabric.FabricObject | null) => {
    lastSelectedObjectRef.current = activeObj;

    if (!activeObj) {
      setSelectedObjectType(null);
      setSelectedTextContent('');
      return;
    }

    let textTarget: fabric.IText | fabric.Textbox | null = null;
    if (activeObj.type === 'i-text' || activeObj.type === 'textbox' || activeObj.type === 'text') {
      textTarget = activeObj as fabric.IText;
    } else if ((activeObj as any).associatedText) {
      textTarget = (activeObj as any).associatedText as fabric.Textbox;
    }

    setSelectedObjectType(activeObj.type);

    if (textTarget) {
      setSelectedTextContent((textTarget as any).text || '');
      setTextProps({
        fontFamily: textTarget.fontFamily || 'Comic Neue',
        fontSize: textTarget.fontSize || 20,
        fill: (textTarget.fill as string) || '#111827',
        isBold: textTarget.fontWeight === 'bold',
        isItalic: textTarget.fontStyle === 'italic',
        isUnderline: !!textTarget.underline,
        textAlign: (textTarget.textAlign as 'left' | 'center' | 'right') || 'center',
        stroke: (textTarget.stroke as string) || '',
        strokeWidth: textTarget.strokeWidth || 0,
        backgroundColor: (textTarget.backgroundColor as string) || 'transparent',
      });
    } else {
      setSelectedTextContent('');
    }
  }, []);

  // Update text formatting on active canvas object
  const updateActiveText = (updates: Partial<TextPropsState>) => {
    setTextProps(prev => ({ ...prev, ...updates }));

    const canvas = getActiveCanvas();
    if (!canvas) return;

    let active = canvas.getActiveObject() || lastSelectedObjectRef.current;
    if (active && (active as any).associatedText) {
      active = (active as any).associatedText;
    }

    if (active && (active.type === 'i-text' || active.type === 'textbox' || active.type === 'text')) {
      const text = active as fabric.IText;

      if (updates.fontFamily !== undefined) text.set('fontFamily', updates.fontFamily);
      if (updates.fontSize !== undefined) text.set('fontSize', updates.fontSize);
      if (updates.fill !== undefined) text.set('fill', updates.fill);
      if (updates.isBold !== undefined) text.set('fontWeight', updates.isBold ? 'bold' : 'normal');
      if (updates.isItalic !== undefined) text.set('fontStyle', updates.isItalic ? 'italic' : 'normal');
      if (updates.isUnderline !== undefined) text.set('underline', updates.isUnderline);
      if (updates.textAlign !== undefined) text.set('textAlign', updates.textAlign);
      if (updates.stroke !== undefined) text.set('stroke', updates.stroke);
      if (updates.strokeWidth !== undefined) text.set('strokeWidth', updates.strokeWidth);
      if (updates.backgroundColor !== undefined) text.set('backgroundColor', updates.backgroundColor);
      (text as any).set('paintFirst', 'stroke');

      canvas.requestRenderAll();
      bumpRevision();
    }
  };

  // Live real-time text content updater from sidebar textarea
  const handleUpdateTextContent = (newText: string) => {
    setSelectedTextContent(newText);
    const canvas = getActiveCanvas();
    if (!canvas) return;

    let target = canvas.getActiveObject() || lastSelectedObjectRef.current;
    if (target && (target as any).associatedText) {
      target = (target as any).associatedText;
    }

    if (target && (target.type === 'textbox' || target.type === 'i-text' || target.type === 'text')) {
      (target as any).set('text', newText);
      (target as any).customName = 'Testo: ' + newText.slice(0, 16);
      canvas.requestRenderAll();
      bumpRevision();
    }
  };

  // Scene title updater
  const handleUpdatePanelTitle = (id: string, newTitle: string) => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, title: newTitle } : p));
  };

  // Add Free Comic Text
  const handleAddCustomText = (presetContent?: string, presetOverrides?: Partial<TextPropsState>) => {
    const canvas = getActiveCanvas();
    if (!canvas) return;

    if (isDrawingMode) {
      setIsDrawingMode(false);
      canvas.isDrawingMode = false;
    }

    const current = { ...textProps, ...presetOverrides };
    if (presetOverrides) {
      setTextProps(current);
    }

    const content = presetContent || selectedTextContent || 'Scrivi qui la tua battuta...';

    const text = new fabric.Textbox(content, {
      left: 200,
      top: 150,
      width: 250,
      fontFamily: current.fontFamily,
      fontSize: current.fontSize,
      fontWeight: current.isBold ? 'bold' : 'normal',
      fontStyle: current.isItalic ? 'italic' : 'normal',
      underline: current.isUnderline,
      fill: current.fill || '#111827',
      textAlign: current.textAlign,
      stroke: current.strokeWidth > 0 ? current.stroke : '',
      strokeWidth: current.strokeWidth,
      paintFirst: 'stroke',
      backgroundColor: current.backgroundColor !== 'transparent' ? current.backgroundColor : '',
      cornerStyle: 'circle',
      cornerColor: '#2563eb',
      borderColor: '#2563eb',
      cornerSize: 10,
      transparentCorners: false,
      editable: true,
    });

    (text as any).customName = 'Testo: ' + (text.text?.slice(0, 16) || 'Fumetto');
    (text as any).assetCategory = 'text';

    canvas.add(text);
    canvas.bringObjectToFront(text);
    canvas.setActiveObject(text);
    lastSelectedObjectRef.current = text;
    setSelectedTextContent(content);
    canvas.requestRenderAll();
    bumpRevision();
  };

  // Freehand Drawing (Inking) Tool with explicit Fabric 6 PencilBrush instantiation
  const toggleDrawingMode = (enable?: boolean) => {
    const canvas = getActiveCanvas();
    if (!canvas) return;

    const nextMode = enable !== undefined ? enable : !isDrawingMode;
    setIsDrawingMode(nextMode);

    if (nextMode) {
      // Must explicitly instantiate PencilBrush in Fabric 6
      if (!canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      }
      canvas.freeDrawingBrush.color = isEraser ? '#ffffff' : inkColor;
      canvas.freeDrawingBrush.width = isEraser ? 24 : inkWidth;
      canvas.isDrawingMode = true;
      canvas.discardActiveObject();
      lastSelectedObjectRef.current = null;
      canvas.requestRenderAll();
    } else {
      canvas.isDrawingMode = false;
    }
  };

  const handleSetInkColor = (color: string) => {
    setInkColor(color);
    setIsEraser(false);
    const canvas = getActiveCanvas();
    if (canvas) {
      if (!canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      }
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = inkWidth;
      canvas.isDrawingMode = true;
      setIsDrawingMode(true);
    }
  };

  const handleSetInkWidth = (width: number) => {
    setInkWidth(width);
    const canvas = getActiveCanvas();
    if (canvas && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = isEraser ? 24 : width;
    }
  };

  const handleToggleEraser = () => {
    const nextEraser = !isEraser;
    setIsEraser(nextEraser);
    const canvas = getActiveCanvas();
    if (canvas) {
      if (!canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      }
      canvas.freeDrawingBrush.color = nextEraser ? '#ffffff' : inkColor;
      canvas.freeDrawingBrush.width = nextEraser ? 24 : inkWidth;
      canvas.isDrawingMode = true;
      setIsDrawingMode(true);
    }
  };

  // Undo Last Freehand Drawn Stroke
  const handleUndoDrawing = () => {
    const canvas = getActiveCanvas();
    if (!canvas) return;
    const paths = canvas.getObjects().filter(o => o.type === 'path');
    if (paths.length > 0) {
      const lastPath = paths[paths.length - 1];
      canvas.remove(lastPath);
      canvas.requestRenderAll();
    }
  };

  // Clear all hand-drawn lines without touching characters or text
  const handleClearDrawings = () => {
    const canvas = getActiveCanvas();
    if (!canvas) return;
    const paths = canvas.getObjects().filter(o => o.type === 'path');
    paths.forEach(p => canvas.remove(p));
    canvas.requestRenderAll();
  };

  const addPanel = () => {
    const newId = `panel-${Date.now()}`;
    const newNumber = panels.length + 1;
    const newPanel = { id: newId, title: `Scena ${newNumber}` };
    setPanels(prev => [...prev, newPanel]);
    setActivePanelId(newId);
  };

  const removePanel = (id: string) => {
    if (panels.length <= 1) {
      return;
    }
    setPanels(prev => {
      const next = prev.filter(p => p.id !== id);
      if (activePanelId === id) {
        setActivePanelId(next[0].id);
      }
      return next;
    });
  };

  // Add Asset to Active Canvas without losing existing elements
  const handleAddAsset = async (asset: Asset) => {
    const canvas = getActiveCanvas();
    if (!canvas) return;

    if (isDrawingMode) {
      setIsDrawingMode(false);
      canvas.isDrawingMode = false;
    }

    try {
      if (asset.category === 'background') {
        const bgImg = await fabric.FabricImage.fromURL(asset.url);
        const scaleX = canvas.width! / bgImg.width!;
        const scaleY = canvas.height! / bgImg.height!;
        const scale = Math.max(scaleX, scaleY);

        bgImg.set({
          scaleX: scale,
          scaleY: scale,
          left: 0,
          top: 0,
          originX: 'left',
          originY: 'top',
          selectable: false,
          evented: false,
        });

        // Remove any legacy background object from canvas objects
        const legacyBgs = canvas.getObjects().filter(o => (o as any).name === 'background');
        legacyBgs.forEach(b => canvas.remove(b));

        canvas.backgroundImage = bgImg;
        canvas.requestRenderAll();
        bumpRevision();
      } else if (asset.category === 'character') {
        const transparentDataUrl = await removeWhiteBackground(asset.url);
        const charImg = await fabric.FabricImage.fromURL(transparentDataUrl);

        const targetHeight = 350;
        const scale = targetHeight / charImg.height!;
        charImg.set({
          scaleX: scale,
          scaleY: scale,
          left: 120 + Math.random() * 60,
          top: 90,
          cornerStyle: 'circle',
          cornerColor: '#2563eb',
          borderColor: '#2563eb',
          cornerSize: 10,
          transparentCorners: false,
        });
        (charImg as any).customName = asset.name;
        (charImg as any).assetCategory = 'character';

        canvas.add(charImg);
        canvas.bringObjectToFront(charImg);
        canvas.setActiveObject(charImg);
        lastSelectedObjectRef.current = charImg;
        canvas.requestRenderAll();
        bumpRevision();
      } else if (asset.category === 'effect') {
        const transparentDataUrl = await removeWhiteBackground(asset.url);
        const stickerImg = await fabric.FabricImage.fromURL(transparentDataUrl);

        const targetWidth = 220;
        const scale = targetWidth / stickerImg.width!;
        stickerImg.set({
          scaleX: scale,
          scaleY: scale,
          left: 280,
          top: 130,
          angle: -8 + Math.random() * 16,
          cornerStyle: 'circle',
          cornerColor: '#dc2626',
          borderColor: '#dc2626',
          cornerSize: 10,
          transparentCorners: false,
        });
        (stickerImg as any).customName = asset.name;
        (stickerImg as any).assetCategory = 'effect';

        canvas.add(stickerImg);
        canvas.bringObjectToFront(stickerImg);
        canvas.setActiveObject(stickerImg);
        lastSelectedObjectRef.current = stickerImg;
        canvas.requestRenderAll();
        bumpRevision();
      } else if (asset.category === 'bubble') {
        const bubbleImg = await fabric.FabricImage.fromURL(asset.url);
        const isCaption = asset.id === 'b-caption';
        const isShout = asset.id === 'b-shout';
        const isThought = asset.id === 'b-thought';
        const isWhisper = asset.id === 'b-whisper';
        const targetWidth = isCaption ? 300 : (isShout ? 290 : 260);
        const scale = targetWidth / bubbleImg.width!;

        bubbleImg.set({
          scaleX: scale,
          scaleY: scale,
          left: isCaption ? 30 : 220,
          top: isCaption ? 25 : 50,
          cornerStyle: 'circle',
          cornerColor: '#d97706',
          borderColor: '#d97706',
          cornerSize: 9,
          transparentCorners: false,
        });
        (bubbleImg as any).customName = asset.name;
        (bubbleImg as any).assetCategory = 'bubble';

        canvas.add(bubbleImg);
        canvas.bringObjectToFront(bubbleImg);

        const defaultText = isCaption 
          ? 'SCENA: MOMENTO DELLA GIORNATA' 
          : isShout
            ? 'AAAAAAHH!!'
            : isThought
              ? 'Hmm, cosa dovrei fare adesso?...'
              : 'Scrivi qui la tua battuta...';
          
        const textColor = isShout ? '#dc2626' : (isThought ? '#1e3a8a' : (isWhisper ? '#4b5563' : '#111827'));
        const textFont = isCaption || isShout ? 'Bangers' : (isThought ? 'Patrick Hand' : 'Comic Neue');
        const textSize = isCaption ? 16 : (isShout ? 24 : (isThought ? 20 : 18));

        const textbox = new fabric.Textbox(defaultText, {
          left: isCaption ? 45 : (isShout ? 245 : 240),
          top: isCaption ? 40 : (isShout ? 80 : 75),
          width: isCaption ? 270 : (isShout ? 240 : 200),
          fontFamily: textFont,
          fontWeight: 'bold',
          fontStyle: isThought ? 'italic' : 'normal',
          fontSize: textSize,
          fill: textColor,
          stroke: '',
          strokeWidth: 0,
          paintFirst: 'stroke',
          backgroundColor: 'transparent',
          textAlign: 'center',
          editable: true,
          cornerStyle: 'circle',
          cornerColor: '#2563eb',
          borderColor: '#2563eb',
          cornerSize: 8,
          transparentCorners: false,
        });
        (textbox as any).customName = 'Testo ' + asset.name;
        (textbox as any).assetCategory = 'text';

        // Link bubble image and textbox bidirectionally
        (bubbleImg as any).associatedText = textbox;
        (textbox as any).associatedBubble = bubbleImg;

        canvas.add(textbox);
        canvas.bringObjectToFront(textbox);
        canvas.setActiveObject(textbox);
        lastSelectedObjectRef.current = textbox;
        setSelectedTextContent(defaultText);
        canvas.requestRenderAll();
        bumpRevision();
      }
    } catch (err) {
      console.error("Errore aggiunta elemento:", err);
    }
  };

  // Upload Custom Image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      const canvas = getActiveCanvas();
      if (!canvas || !dataUrl) return;

      const img = await fabric.FabricImage.fromURL(dataUrl);
      const scale = Math.min(300 / img.width!, 300 / img.height!);
      img.set({
        scaleX: scale,
        scaleY: scale,
        left: 200,
        top: 120,
        cornerStyle: 'circle',
        cornerColor: '#2563eb',
      });
      (img as any).customName = file.name.slice(0, 16) || 'Foto Caricata';
      (img as any).assetCategory = 'character';
      canvas.add(img);
      canvas.bringObjectToFront(img);
      canvas.setActiveObject(img);
      lastSelectedObjectRef.current = img;
      canvas.requestRenderAll();
      bumpRevision();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Get current active or last selected object safely
  const getTargetObject = () => {
    const canvas = getActiveCanvas();
    if (!canvas) return null;
    let target = canvas.getActiveObject();
    if (!target && lastSelectedObjectRef.current) {
      const allObjects = canvas.getObjects();
      if (allObjects.includes(lastSelectedObjectRef.current)) {
        target = lastSelectedObjectRef.current;
      }
    }
    return target;
  };

  // Selected Object Actions - Works reliably without losing selection
  const handleFlipHorizontal = () => {
    const canvas = getActiveCanvas();
    const target = getTargetObject();
    if (canvas && target) {
      target.set('flipX', !target.flipX);
      canvas.requestRenderAll();
      bumpRevision();
    }
  };


  const handleDuplicate = async () => {
    const canvas = getActiveCanvas();
    const target = getTargetObject();
    if (canvas && target) {
      const cloned = await target.clone();
      cloned.set({
        left: (target.left || 0) + 25,
        top: (target.top || 0) + 25,
      });
      (cloned as any).customName = (target as any).customName ? (target as any).customName + ' (Copia)' : 'Elemento duplicato';
      (cloned as any).assetCategory = (target as any).assetCategory || 'character';
      canvas.add(cloned);
      canvas.bringObjectToFront(cloned);
      canvas.setActiveObject(cloned);
      lastSelectedObjectRef.current = cloned;
      canvas.requestRenderAll();
      bumpRevision();
    }
  };

  const handleDeleteSelected = () => {
    const canvas = getActiveCanvas();
    const target = getTargetObject();
    if (canvas && target) {
      canvas.remove(target);
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      setSelectedObjectType(null);
      lastSelectedObjectRef.current = null;
      bumpRevision();
    }
  };

  // Keyboard shortcut: Freccia Su/Giù/Sinistra/Destra, Alt+Freccia per livelli, Canc/Backspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const canvas = getActiveCanvas();
      if (!canvas) return;
      const active = canvas.getActiveObject() || lastSelectedObjectRef.current;
      if (!active) return;

      // If user is currently editing text inside a textbox, do not intercept keyboard
      if ((active as any).isEditing) return;

      const step = e.shiftKey ? 20 : 5;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        canvas.remove(active);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        setSelectedObjectType(null);
        lastSelectedObjectRef.current = null;
        bumpRevision();
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        if (e.altKey || e.ctrlKey || e.metaKey) {
          canvas.bringObjectForward(active);
          bumpRevision();
        } else {
          active.set('top', (active.top || 0) - step);
          active.setCoords();
        }
        canvas.requestRenderAll();
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        if (e.altKey || e.ctrlKey || e.metaKey) {
          canvas.sendObjectBackwards(active);
          bumpRevision();
        } else {
          active.set('top', (active.top || 0) + step);
          active.setCoords();
        }
        canvas.requestRenderAll();
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        active.set('left', (active.left || 0) - step);
        active.setCoords();
        canvas.requestRenderAll();
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        active.set('left', (active.left || 0) + step);
        active.setCoords();
        canvas.requestRenderAll();
        e.preventDefault();
      } else if (e.key === 'PageUp') {
        canvas.bringObjectToFront(active);
        canvas.requestRenderAll();
        bumpRevision();
        e.preventDefault();
      } else if (e.key === 'PageDown') {
        canvas.sendObjectToBack(active);
        canvas.requestRenderAll();
        bumpRevision();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [getActiveCanvas, bumpRevision]);

  // Clean active panel directly without broken window.confirm
  const handleClearActivePanel = () => {
    const canvas = getActiveCanvas();
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundImage = undefined;
    canvas.backgroundColor = '#ffffff';
    canvas.requestRenderAll();
    setSelectedObjectType(null);
    lastSelectedObjectRef.current = null;
    bumpRevision();
  };

  // Export full comic strip as high-resolution PNG - AWAITS ALL IMAGES WITH PROMISE.ALL TO NEVER BE WHITE!
  const handleExportFullComic = async () => {
    setIsExporting(true);
    try {
      const panelCanvases = panels.map(p => canvasInstances.current.get(p.id)).filter(Boolean) as fabric.Canvas[];
      if (panelCanvases.length === 0) {
        setIsExporting(false);
        return;
      }

      const singleWidth = 800;
      const singleHeight = 500;
      const headerHeight = 110;
      const padding = 24;
      const totalHeight = headerHeight + panelCanvases.length * (singleHeight + padding) + padding;

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = singleWidth + padding * 2;
      exportCanvas.height = totalHeight;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) {
        setIsExporting(false);
        return;
      }

      // Page background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      // Comic Page Header
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 42px Bangers, cursive';
      ctx.textAlign = 'center';
      ctx.fillText('COMIX STUDIO PRO - STRISCIA NARRATIVA', exportCanvas.width / 2, 60);

      ctx.fillStyle = '#6b7280';
      ctx.font = 'bold 15px "Comic Neue", cursive';
      ctx.fillText('EDIZIONE ORIGINALE DA COLLEZIONE', exportCanvas.width / 2, 90);

      // Render all panels with proper Promise awaiting so nothing is blank!
      await Promise.all(
        panelCanvases.map((canvas, idx) => {
          return new Promise<void>((resolve) => {
            const dataUrl = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 1 });
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              const yPos = headerHeight + idx * (singleHeight + padding);
              ctx.strokeStyle = '#111827';
              ctx.lineWidth = 6;
              ctx.strokeRect(padding - 3, yPos - 3, singleWidth + 6, singleHeight + 6);
              ctx.drawImage(img, padding, yPos, singleWidth, singleHeight);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = dataUrl;
          });
        })
      );

      const downloadLink = document.createElement('a');
      downloadLink.download = `striscia-fumetto-${Date.now()}.png`;
      downloadLink.href = exportCanvas.toDataURL('image/png');
      downloadLink.click();
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      setIsExporting(false);
    } catch (e) {
      console.error("Export error:", e);
      setIsExporting(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#f4f4ee] text-zinc-900 flex flex-col overflow-hidden select-none">
      {/* 3-ZONE COMPACT TOP BAR */}
      <header className="h-14 bg-white border-b border-zinc-200 px-6 lg:px-8 flex items-center justify-between gap-6 z-50 shrink-0 shadow-xs">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 bg-zinc-950 text-white rounded-lg flex items-center justify-center font-comic text-xl tracking-wider shadow-sm">
            C!
          </div>
          <span className="font-comic text-xl tracking-wider text-zinc-950 uppercase">
            COMIX STUDIO PRO
          </span>
        </div>

        {/* Zone 2: View Mode Switch & Navigation */}
        <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('focus')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'focus' 
                ? 'bg-white text-zinc-950 shadow-xs' 
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <Maximize2 size={13} /> Tavola Singola (No Scroll)
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'all' 
                ? 'bg-white text-zinc-950 shadow-xs' 
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <Grid size={13} /> Striscia Completa
          </button>
        </div>

        {/* Zone 3: Primary CTA */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowHelpModal(true)}
            className="text-zinc-500 hover:text-zinc-900 p-1.5 transition-colors cursor-pointer"
            title="Guida Rapida"
          >
            <HelpCircle size={18} />
          </button>
          <button
            onClick={handleExportFullComic}
            disabled={isExporting}
            className="h-9 px-4 bg-zinc-950 text-white text-xs font-bold tracking-wider hover:bg-zinc-800 transition-all rounded-lg flex items-center gap-2 shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download size={14} /> {isExporting ? 'Generazione PNG...' : 'Esporta Fumetto PNG'}
          </button>
        </div>
      </header>

      {/* WORKSPACE AREA */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* LEFT STUDIO DRAWER */}
        <aside className="w-80 lg:w-88 bg-white border-r border-zinc-200 flex flex-col shrink-0 z-20 shadow-xs h-full">
          {/* CATEGORY TABS */}
          <div className="p-2 border-b border-zinc-100 bg-zinc-50 flex items-center gap-1 overflow-x-auto shrink-0">
            <button
              onClick={() => setActiveTab('text')}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
                activeTab === 'text'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200'
              }`}
            >
              ✍️ Testo
            </button>
            <button
              onClick={() => setActiveTab('bubbles')}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
                activeTab === 'bubbles'
                  ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              💬 Baloon
            </button>
            <button
              onClick={() => setActiveTab('characters')}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
                activeTab === 'characters'
                  ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              👥 Personaggi
            </button>
            <button
              onClick={() => setActiveTab('backgrounds')}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
                activeTab === 'backgrounds'
                  ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              🌆 Sfondi
            </button>
            <button
              onClick={() => setActiveTab('stickers')}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
                activeTab === 'stickers'
                  ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              💥 Effetti
            </button>
            <button
              onClick={() => setActiveTab('symbols')}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
                activeTab === 'symbols'
                  ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              💢 Simboli
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              📁 Carica
            </button>
          </div>

          {/* TAB CONTENT (SCROLLABLE INSIDE DRAWER) */}
          <div className="flex-1 overflow-y-auto p-3.5 custom-scrollbar">
            {activeTab === 'text' && (
              <div className="flex flex-col gap-4">
                {/* LIVE DEDICATED TEXT EDITOR */}
                <div className="p-3 bg-blue-50/90 border-2 border-blue-200 rounded-xl shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <Type size={14} className="text-blue-600" />
                      {selectedObjectType === 'textbox' || selectedObjectType === 'i-text' || (lastSelectedObjectRef.current as any)?.associatedText
                        ? 'Modifica Battuta Selezionata:'
                        : 'Scrivi Testo per la Tavola:'}
                    </span>
                    {(selectedObjectType === 'textbox' || selectedObjectType === 'i-text' || (lastSelectedObjectRef.current as any)?.associatedText) && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded-full">
                        ● Modifica Live
                      </span>
                    )}
                  </div>

                  <textarea
                    value={selectedTextContent}
                    onChange={(e) => handleUpdateTextContent(e.target.value)}
                    placeholder="Digita qui il dialogo, grido o pensiero..."
                    rows={3}
                    className="w-full p-2.5 bg-white border border-blue-300 rounded-lg text-xs font-semibold text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none leading-relaxed shadow-inner"
                  />

                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-blue-200/70">
                    <span className="text-[10px] text-zinc-500">
                      {selectedObjectType === 'textbox' || selectedObjectType === 'i-text' || (lastSelectedObjectRef.current as any)?.associatedText
                        ? 'Si aggiorna mentre scrivi'
                        : 'Scrivi e inserisci'}
                    </span>
                    <button
                      onClick={() => handleAddCustomText(selectedTextContent || 'Nuova Battuta')}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <Plus size={12} /> Inserisci Nuovo
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-yellow-500" />
                    Stili Rapidi da Fumetto
                  </h4>
                  <p className="text-[11px] text-zinc-500 mb-2.5">
                    Clicca su uno stile per inserirlo direttamente nella tavola attiva:
                  </p>

                  <div className="flex flex-col gap-1.5">
                    {[
                      {
                        title: '💬 DIALOGO / BATTUTA',
                        preset: { fontFamily: 'Comic Neue', fontSize: 20, fill: '#111827', stroke: '', strokeWidth: 0, isBold: true, isItalic: false, backgroundColor: '#ffffff', textAlign: 'center' as const },
                        sample: 'Cosa sta succedendo?!'
                      },
                      {
                        title: '⚡ GRIDO MANGA',
                        preset: { fontFamily: 'Anton', fontSize: 34, fill: '#dc2626', stroke: '#111827', strokeWidth: 1.5, isBold: true, isItalic: false, backgroundColor: '#ffffff', textAlign: 'center' as const },
                        sample: 'ASPETTAMI!!'
                      },
                      {
                        title: '💭 PENSIERO INTERNO',
                        preset: { fontFamily: 'Patrick Hand', fontSize: 22, fill: '#1e3a8a', stroke: '', strokeWidth: 0, isBold: true, isItalic: true, backgroundColor: '#ffffff', textAlign: 'center' as const },
                        sample: 'Devo riuscire a parlarle...'
                      },
                      {
                        title: '💥 ONOMATOPEA AZIONE',
                        preset: { fontFamily: 'Bangers', fontSize: 36, fill: '#facc15', stroke: '#111827', strokeWidth: 2, isBold: true, isItalic: false, backgroundColor: 'transparent', textAlign: 'center' as const },
                        sample: 'DOKI DOKI!!'
                      },
                      {
                        title: '📜 DIDASCALIA DELLA SCENA',
                        preset: { fontFamily: 'Bangers', fontSize: 18, fill: '#111827', stroke: '', strokeWidth: 0, isBold: false, isItalic: false, backgroundColor: '#fff9b0', textAlign: 'center' as const },
                        sample: 'PIÙ TARDI, DOPO LA SCUOLA...'
                      },
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAddCustomText(preset.sample, preset.preset)}
                        className="p-2.5 bg-zinc-50 hover:bg-white border border-zinc-200 hover:border-blue-600 rounded-xl text-left transition-all hover:shadow-xs group flex flex-col gap-0.5 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-zinc-800">{preset.title}</span>
                          <span className="text-[10px] text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                            + Aggiungi
                          </span>
                        </div>
                        <div 
                          className="py-0.5 px-2 rounded inline-block text-center text-sm shadow-xs border border-zinc-200"
                          style={{
                            fontFamily: preset.preset.fontFamily,
                            fontWeight: preset.preset.isBold ? 'bold' : 'normal',
                            fontStyle: preset.preset.isItalic ? 'italic' : 'normal',
                            color: preset.preset.fill,
                            backgroundColor: preset.preset.backgroundColor !== 'transparent' ? preset.preset.backgroundColor : '#ffffff',
                            WebkitTextStroke: preset.preset.strokeWidth > 0 ? `${preset.preset.strokeWidth}px ${preset.preset.stroke}` : 'none',
                          }}
                        >
                          {preset.sample}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleAddCustomText()}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus size={15} /> Aggiungi Nuovo Testo
                </button>
              </div>
            )}

            {activeTab === 'characters' && (
              <div className="grid grid-cols-2 gap-2.5">
                {CHARACTERS.map((char) => (
                  <div
                    key={char.id}
                    onClick={() => handleAddAsset(char)}
                    className="group cursor-pointer p-2 bg-zinc-50 hover:bg-white border border-zinc-200 hover:border-zinc-900 rounded-xl transition-all flex flex-col items-center gap-1.5 hover:shadow-xs"
                  >
                    <div className="w-full aspect-[3/4] bg-white rounded-lg overflow-hidden border border-zinc-100 flex items-center justify-center p-1">
                      <img 
                        src={char.url} 
                        alt={char.name} 
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <span className="text-[11px] font-bold text-zinc-800 text-center leading-tight">
                      {char.name}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'backgrounds' && (
              <div className="flex flex-col gap-2.5">
                {BACKGROUNDS.map((bg) => (
                  <div
                    key={bg.id}
                    onClick={() => handleAddAsset(bg)}
                    className="group cursor-pointer p-1.5 bg-zinc-50 hover:bg-white border border-zinc-200 hover:border-zinc-900 rounded-xl transition-all flex flex-col gap-1.5 hover:shadow-xs"
                  >
                    <div className="w-full aspect-[16/10] bg-zinc-900 rounded-lg overflow-hidden relative">
                      <img 
                        src={bg.url} 
                        alt={bg.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="px-2.5 py-1 bg-white text-zinc-950 font-bold text-[11px] rounded shadow-xs">
                          Applica Sfondo
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-zinc-800 px-1">{bg.name}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'bubbles' && (
              <div className="flex flex-col gap-3">
                {/* LIVE DEDICATED TEXT EDITOR FOR BALLOONS */}
                <div className="p-3 bg-blue-50/90 border-2 border-blue-200 rounded-xl shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <Type size={14} className="text-blue-600" />
                      {selectedObjectType === 'textbox' || selectedObjectType === 'i-text' || (lastSelectedObjectRef.current as any)?.associatedText
                        ? 'Modifica Testo del Baloon:'
                        : 'Battuta per il Baloon:'}
                    </span>
                    {(selectedObjectType === 'textbox' || selectedObjectType === 'i-text' || (lastSelectedObjectRef.current as any)?.associatedText) && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded-full">
                        ● Modifica Live
                      </span>
                    )}
                  </div>

                  <textarea
                    value={selectedTextContent}
                    onChange={(e) => handleUpdateTextContent(e.target.value)}
                    placeholder="Digita qui il dialogo, grido o pensiero..."
                    rows={2}
                    className="w-full p-2.5 bg-white border border-blue-300 rounded-lg text-xs font-semibold text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none leading-relaxed shadow-inner"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    {selectedObjectType === 'textbox' || selectedObjectType === 'i-text' || (lastSelectedObjectRef.current as any)?.associatedText
                      ? 'Aggiorna in tempo reale la battuta selezionata'
                      : 'Clicca su un baloon sotto per inserirlo con la tua battuta'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {BUBBLES.map((bubble) => (
                    <div
                      key={bubble.id}
                      onClick={() => handleAddAsset(bubble)}
                      className="group cursor-pointer p-2.5 bg-zinc-50 hover:bg-white border border-zinc-200 hover:border-zinc-900 rounded-xl transition-all flex flex-col items-center gap-1.5 hover:shadow-xs"
                    >
                      <div className="w-full h-18 bg-white rounded-lg flex items-center justify-center p-1 border border-zinc-100">
                        <img 
                          src={bubble.url} 
                          alt={bubble.name} 
                          className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform"
                        />
                      </div>
                      <span className="text-[11px] font-bold text-zinc-800 text-center">{bubble.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'stickers' && (
              <div className="grid grid-cols-2 gap-2.5">
                {STICKERS.map((stk) => (
                  <div
                    key={stk.id}
                    onClick={() => handleAddAsset(stk)}
                    className="group cursor-pointer p-2 bg-zinc-50 hover:bg-white border border-zinc-200 hover:border-zinc-900 rounded-xl transition-all flex flex-col items-center gap-1.5 hover:shadow-xs"
                  >
                    <div className="w-full aspect-square bg-white rounded-lg overflow-hidden flex items-center justify-center p-1.5 border border-zinc-100">
                      <img 
                        src={stk.url} 
                        alt={stk.name} 
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                      />
                    </div>
                    <span className="text-xs font-bold text-zinc-900">{stk.name}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'symbols' && (
              <div className="grid grid-cols-3 gap-2">
                {COMIC_SYMBOLS.map((sym) => (
                  <div
                    key={sym.id}
                    onClick={() => handleAddAsset(sym)}
                    className="group cursor-pointer p-2 bg-zinc-50 hover:bg-white border border-zinc-200 hover:border-zinc-900 rounded-xl transition-all flex flex-col items-center gap-1 hover:shadow-xs"
                  >
                    <div className="w-full aspect-square bg-white rounded-lg overflow-hidden flex items-center justify-center p-1 border border-zinc-100">
                      <img 
                        src={sym.url} 
                        alt={sym.name} 
                        className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-800 text-center leading-none">
                      {sym.name}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'upload' && (
              <label className="border-2 border-dashed border-zinc-300 hover:border-zinc-900 hover:bg-zinc-50 transition-all rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer text-center">
                <Upload size={28} className="text-zinc-400" />
                <span className="text-xs font-bold text-zinc-800">Carica immagine</span>
                <span className="text-[10px] text-zinc-400">PNG, JPG fino a 10MB</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </aside>

        {/* CENTER STAGE */}
        <main className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#ebebe5] relative">
          {/* COMPACT TOP TOOLBAR (WITH PREVENT-DEFAULT ON MOUSEDOWN TO NEVER LOSE SELECTION) */}
          <div className="h-12 bg-white border-b border-zinc-200 px-4 flex items-center justify-between gap-2 shrink-0 shadow-xs z-30">
            {/* LEFT: TEXT STYLING TOOLS */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider flex items-center gap-1 shrink-0">
                <Type size={13} /> Testo:
              </span>

              {/* FONT SELECTOR */}
              <select
                value={textProps.fontFamily}
                onChange={(e) => updateActiveText({ fontFamily: e.target.value })}
                className="bg-zinc-50 border border-zinc-300 rounded px-1.5 py-1 text-xs font-bold text-zinc-800 focus:outline-blue-500 cursor-pointer shrink-0"
              >
                {COMIC_FONTS.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>

              {/* SIZE +/- */}
              <div className="flex items-center gap-0.5 bg-zinc-100 rounded p-0.5 shrink-0">
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => updateActiveText({ fontSize: Math.max(12, textProps.fontSize - 2) })}
                  className="w-5 h-5 rounded bg-white hover:bg-zinc-200 font-bold text-[11px] flex items-center justify-center cursor-pointer shadow-xs"
                  title="Riduci font"
                >
                  -
                </button>
                <span className="text-xs font-bold px-1.5 text-zinc-800">{textProps.fontSize}</span>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => updateActiveText({ fontSize: Math.min(72, textProps.fontSize + 2) })}
                  className="w-5 h-5 rounded bg-white hover:bg-zinc-200 font-bold text-[11px] flex items-center justify-center cursor-pointer shadow-xs"
                  title="Aumenta font"
                >
                  +
                </button>
              </div>

              {/* BOLD / ITALIC */}
              <div className="flex items-center gap-0.5 bg-zinc-100 rounded p-0.5 shrink-0">
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => updateActiveText({ isBold: !textProps.isBold })}
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-colors cursor-pointer ${
                    textProps.isBold ? 'bg-zinc-950 text-white' : 'text-zinc-600 hover:bg-white'
                  }`}
                  title="Grassetto"
                >
                  <Bold size={12} />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => updateActiveText({ isItalic: !textProps.isItalic })}
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-colors cursor-pointer ${
                    textProps.isItalic ? 'bg-zinc-950 text-white' : 'text-zinc-600 hover:bg-white'
                  }`}
                  title="Corsivo"
                >
                  <Italic size={12} />
                </button>
              </div>

              {/* COLOR SWATCHES */}
              <div className="flex items-center gap-1 pl-1 border-l border-zinc-200 shrink-0">
                {COMIC_COLORS.slice(0, 5).map(c => (
                  <button
                    key={c.hex}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => updateActiveText({ fill: c.hex })}
                    title={`Colore ${c.name}`}
                    className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                      textProps.fill === c.hex ? 'scale-125 border-zinc-950 ring-2 ring-blue-500' : 'border-zinc-300'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>

              {/* OUTLINE TOGGLE */}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => updateActiveText({ 
                  strokeWidth: textProps.strokeWidth > 0 ? 0 : 3,
                  stroke: textProps.fill === '#111827' ? '#ffffff' : '#111827'
                })}
                className={`px-2 py-0.5 text-[11px] font-bold rounded border transition-colors cursor-pointer shrink-0 ${
                  textProps.strokeWidth > 0 
                    ? 'bg-yellow-400 text-zinc-950 border-yellow-500 shadow-xs' 
                    : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200'
                }`}
                title="Bordo ad alto contrasto per non far perdere la scritta nello sfondo"
              >
                Contorno {textProps.strokeWidth > 0 ? '✓' : ''}
              </button>

              {/* WHITE BG TOGGLE */}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => updateActiveText({ 
                  backgroundColor: textProps.backgroundColor === '#ffffff' ? 'transparent' : '#ffffff'
                })}
                className={`px-2 py-0.5 text-[11px] font-bold rounded border transition-colors cursor-pointer shrink-0 ${
                  textProps.backgroundColor === '#ffffff' 
                    ? 'bg-zinc-900 text-white border-zinc-950 shadow-xs' 
                    : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200'
                }`}
                title="Sfondo bianco per rendere il testo sempre leggibile"
              >
                Fondo Bianco {textProps.backgroundColor === '#ffffff' ? '✓' : ''}
              </button>
            </div>

            {/* RIGHT: INKING PEN & OBJECT ACTIONS (ALL PROTECTED AGAINST FOCUS LOSS) */}
            <div className="flex items-center gap-1 shrink-0 pl-1 border-l border-zinc-200">
              {/* PEN TOOL */}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggleDrawingMode()}
                className={`px-2 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  isDrawingMode 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                }`}
                title="Disegna a mano libera sulla vignetta"
              >
                <PenTool size={13} />
                <span>{isDrawingMode ? 'Penna ON' : 'Disegna'}</span>
              </button>

              {isDrawingMode && (
                <div className="flex items-center gap-1 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                  <span className="text-[10px] font-bold text-blue-900">Tratto:</span>
                  {[2, 5, 10].map(w => (
                    <button
                      key={w}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSetInkWidth(w)}
                      className={`w-4.5 h-4.5 text-[10px] font-bold rounded cursor-pointer ${
                        inkWidth === w && !isEraser ? 'bg-blue-600 text-white' : 'bg-white text-zinc-700'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleToggleEraser}
                    className={`p-1 rounded cursor-pointer ${isEraser ? 'bg-red-600 text-white' : 'bg-white text-zinc-700'}`}
                    title="Gomma"
                  >
                    <Eraser size={11} />
                  </button>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleUndoDrawing}
                    className="p-1 rounded bg-white hover:bg-zinc-200 text-zinc-700 cursor-pointer"
                    title="Annulla ultimo tratto"
                  >
                    <Undo2 size={11} />
                  </button>
                </div>
              )}

              {/* QUICK ADD TEXT */}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleAddCustomText()}
                className="h-7 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Aggiungi testo / battuta ad alto contrasto"
              >
                <Type size={13} />
                <span>+ Testo</span>
              </button>

              <div className="h-5 w-px bg-zinc-200 mx-0.5 shrink-0" />

              {/* OBJECT ACTIONS: SPECCHIA, DUPLICA, ELIMINA */}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleFlipHorizontal}
                title="Specchia elemento orizzontalmente"
                className="h-7 px-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <FlipHorizontal size={13} />
                <span>Specchia</span>
              </button>

              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleDuplicate}
                title="Duplica elemento selezionato"
                className="h-7 px-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Copy size={13} />
                <span>Duplica</span>
              </button>

              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleDeleteSelected}
                title="Elimina elemento selezionato (oppure premi tasto Canc/Backspace)"
                className="h-7 px-2.5 bg-red-50 hover:bg-red-600 hover:text-white text-red-700 border border-red-200 hover:border-red-600 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Elimina</span>
              </button>
            </div>
          </div>

          {/* MAIN STAGE VIEW */}
          {viewMode === 'focus' ? (
            /* FOCUS MODE: SINGLE CANVAS SCALED TO FIT VIEWPORT WITH ZERO SCROLLING */
            <div className="flex-1 flex flex-col items-center justify-center p-3 min-h-0 overflow-hidden relative">

              {panels.map((panel, index) => {
                const isCurrentActive = panel.id === activePanelId;
                return (
                  <div
                    key={panel.id}
                    style={{
                      position: isCurrentActive ? 'relative' : 'absolute',
                      left: isCurrentActive ? 0 : -99999,
                      top: 0,
                      opacity: isCurrentActive ? 1 : 0,
                      pointerEvents: isCurrentActive ? 'auto' : 'none',
                    }}
                    className="flex flex-col items-center justify-center max-h-full max-w-full"
                  >
                    <ComicPanelCard
                      panelId={panel.id}
                      title={panel.title}
                      index={index}
                      isActive={isCurrentActive}
                      onSelect={() => setActivePanelId(panel.id)}
                      onRemove={() => removePanel(panel.id)}
                      onClear={handleClearActivePanel}
                      onUpdateTitle={(newTitle) => handleUpdatePanelTitle(panel.id, newTitle)}
                      registerCanvas={registerCanvas}
                      unregisterCanvas={unregisterCanvas}
                      onSelectionUpdate={handleSelectionUpdate}
                      onCanvasModified={bumpRevision}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            /* ALL PANELS MODE: SEQUENTIAL FULL STRIP SCROLLING VIEW */
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col items-center gap-8">
              {panels.map((panel, index) => (
                <div key={panel.id} className="w-full max-w-3xl">
                  <ComicPanelCard
                    panelId={panel.id}
                    title={panel.title}
                    index={index}
                    isActive={panel.id === activePanelId}
                    onSelect={() => setActivePanelId(panel.id)}
                    onRemove={() => removePanel(panel.id)}
                    onClear={() => {
                      const c = canvasInstances.current.get(panel.id);
                      if (c) {
                        c.clear();
                        c.backgroundImage = undefined;
                        c.backgroundColor = '#ffffff';
                        c.requestRenderAll();
                        bumpRevision();
                      }
                    }}
                    onUpdateTitle={(newTitle) => handleUpdatePanelTitle(panel.id, newTitle)}
                    registerCanvas={registerCanvas}
                    unregisterCanvas={unregisterCanvas}
                    onSelectionUpdate={handleSelectionUpdate}
                    onCanvasModified={bumpRevision}
                  />
                </div>
              ))}
            </div>
          )}

          {/* BOTTOM FILMSTRIP / CAROUSEL */}
          <div className="h-20 bg-white border-t border-zinc-200 px-6 flex items-center justify-between gap-4 shrink-0 shadow-xs z-30">
            <div className="flex items-center gap-2.5 overflow-x-auto py-1">
              <span className="text-[11px] font-black text-zinc-400 uppercase tracking-wider shrink-0">
                Tavole ({panels.length}):
              </span>

              {panels.map((panel, idx) => (
                <button
                  key={panel.id}
                  onClick={() => setActivePanelId(panel.id)}
                  className={`px-3 py-1.5 rounded-xl border-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                    panel.id === activePanelId
                      ? 'bg-blue-50 border-blue-600 text-blue-950 font-black shadow-xs ring-2 ring-blue-100'
                      : 'bg-zinc-50 border-zinc-200 hover:border-zinc-400 text-zinc-700 font-bold'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="text-xs">{panel.title}</span>
                </button>
              ))}

              <button
                onClick={addPanel}
                className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-900 hover:text-white rounded-xl border border-dashed border-zinc-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Plus size={14} /> Nuova Tavola
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* CLEAR CURRENT PANEL BUTTON (DIRECT ACTION, NO BROKEN PROMPT) */}
              <button
                onClick={handleClearActivePanel}
                className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Svuota completamente questa vignetta"
              >
                <RotateCcw size={13} /> Pulisci Tavola
              </button>

              <button
                onClick={() => {
                  const canvas = getActiveCanvas();
                  if (canvas) {
                    const dataUrl = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
                    const link = document.createElement('a');
                    link.download = `tavola-${activePanelId}-${Date.now()}.png`;
                    link.href = dataUrl;
                    link.click();
                    confetti({ particleCount: 60, spread: 50 });
                  }
                }}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Download size={13} /> Scarica Singola PNG
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* QUICK HELP MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="font-comic text-2xl tracking-wide uppercase">Comix Studio Pro - Guida Rapida</h3>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="py-4 flex flex-col gap-3 text-sm text-zinc-600">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                <p><strong>Gestione Elementi:</strong> Seleziona qualsiasi personaggio o testo per specchiarlo, duplicarlo o eliminarlo (oppure premi il tasto <strong>Canc/Backspace</strong> sulla tastiera).</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                <p><strong>Pulisci Tavola:</strong> Clicca su <strong>Pulisci Tavola</strong> in basso a destra per azzerare istantaneamente la vignetta attiva senza blocchi.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                <p><strong>Esportazione PNG garantita:</strong> Il fumetto scaricato contiene tutte le immagini e i testi completi ad alta risoluzione (non esce mai più bianco).</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">4</span>
                <p><strong>Disegno a mano libera con Annulla:</strong> In modalità "Disegna" puoi inchiostrare liberamente e annullare l'ultimo tratto con la freccia di annulla.</p>
              </div>
            </div>
            <div className="pt-3 border-t border-zinc-100 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2 bg-zinc-950 text-white rounded-lg font-bold text-xs hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Ho Capito!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ROCK-SOLID COMIC PANEL CARD
function ComicPanelCard({
  panelId,
  title,
  index,
  isActive,
  onSelect,
  onRemove,
  onClear,
  onUpdateTitle,
  registerCanvas,
  unregisterCanvas,
  onSelectionUpdate,
  onCanvasModified,
}: {
  key?: React.Key;
  panelId: string;
  title: string;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onClear: () => void;
  onUpdateTitle: (title: string) => void;
  registerCanvas: (id: string, canvas: fabric.Canvas) => void;
  unregisterCanvas: (id: string) => void;
  onSelectionUpdate: (active: fabric.FabricObject | null) => void;
  onCanvasModified?: () => void;
}) {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const canvasInstanceRef = useRef<fabric.Canvas | null>(null);

  useEffect(() => {
    if (!canvasElementRef.current || canvasInstanceRef.current) return;

    const canvas = new fabric.Canvas(canvasElementRef.current, {
      width: 800,
      height: 500,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
    });

    // Explicitly initialize free drawing brush for Fabric 6
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.color = '#111827';
    canvas.freeDrawingBrush.width = 5;

    canvasInstanceRef.current = canvas;
    registerCanvas(panelId, canvas);

    canvas.on('selection:created', (e) => {
      onSelectionUpdate(e.selected?.[0] || null);
      onCanvasModified?.();
    });
    canvas.on('selection:updated', (e) => {
      onSelectionUpdate(e.selected?.[0] || null);
      onCanvasModified?.();
    });
    canvas.on('selection:cleared', () => {
      onSelectionUpdate(null);
      onCanvasModified?.();
    });
    canvas.on('object:added', () => {
      onCanvasModified?.();
    });
    canvas.on('object:removed', () => {
      onCanvasModified?.();
    });
    canvas.on('object:modified', () => {
      onCanvasModified?.();
    });

    // Enable double-click to immediately edit text on canvas or associated text of a balloon
    canvas.on('mouse:dblclick', (e) => {
      const target = e.target;
      if (!target) return;
      if (target.type === 'textbox' || target.type === 'i-text') {
        (target as any).enterEditing();
        (target as any).selectAll();
        canvas.requestRenderAll();
      } else if ((target as any).associatedText) {
        const textObj = (target as any).associatedText;
        canvas.setActiveObject(textObj);
        (textObj as any).enterEditing();
        (textObj as any).selectAll();
        canvas.requestRenderAll();
      }
    });

    // Sync live sidebar editor when typing directly on canvas
    canvas.on('text:changed', (e) => {
      onSelectionUpdate(e.target || null);
      onCanvasModified?.();
    });

    populateInitialScene(canvas, index);

    return () => {
      unregisterCanvas(panelId);
      canvas.dispose();
      canvasInstanceRef.current = null;
    };
  }, []);

  const populateInitialScene = async (canvas: fabric.Canvas, panelIndex: number) => {
    try {
      if (panelIndex === 0) {
        const bgImg = await fabric.FabricImage.fromURL('/assets/images/manga_bg_classroom_1794185192737.jpg');
        const scaleX = 800 / bgImg.width!;
        const scaleY = 500 / bgImg.height!;
        const scale = Math.max(scaleX, scaleY);
        bgImg.set({
          scaleX: scale,
          scaleY: scale,
          left: 0,
          top: 0,
          originX: 'left',
          originY: 'top',
          selectable: false,
          evented: false,
        });
        canvas.backgroundImage = bgImg;

        const charDataUrl = await removeWhiteBackground('/assets/images/anime_boy_school_color_1794186454623.jpg');
        const charImg = await fabric.FabricImage.fromURL(charDataUrl);
        charImg.scaleToHeight(380);
        charImg.set({
          left: 120,
          top: 90,
          cornerStyle: 'circle',
          cornerColor: '#2563eb',
        });
        (charImg as any).customName = 'Studente Ragazzo (A Colori)';
        (charImg as any).assetCategory = 'character';
        canvas.add(charImg);

        const catDataUrl = await removeWhiteBackground('/assets/images/anime_chibi_cat_color_1794186482140.jpg');
        const catImg = await fabric.FabricImage.fromURL(catDataUrl);
        catImg.scaleToHeight(130);
        catImg.set({
          left: 45,
          top: 350,
          cornerStyle: 'circle',
          cornerColor: '#f59e0b',
        });
        (catImg as any).customName = 'Gatto Mascotte Chibi';
        (catImg as any).assetCategory = 'character';
        canvas.add(catImg);

        const captionBox = await fabric.FabricImage.fromURL(BUBBLES.find(b => b.id === 'b-caption')!.url);
        captionBox.scaleToWidth(280);
        captionBox.set({ left: 30, top: 25, selectable: false });
        (captionBox as any).customName = 'Didascalia';
        (captionBox as any).assetCategory = 'bubble';
        canvas.add(captionBox);

        const captionText = new fabric.IText('CAPITOLO 1: IN CLASSE', {
          left: 45,
          top: 45,
          fontFamily: 'Bangers',
          fontSize: 16,
          fill: '#000000',
        });
        (captionText as any).customName = 'Testo Didascalia';
        (captionText as any).assetCategory = 'text';
        canvas.add(captionText);

        const bubble = await fabric.FabricImage.fromURL(BUBBLES.find(b => b.id === 'b-talk')!.url);
        bubble.scaleToWidth(290);
        bubble.set({ left: 350, top: 70 });
        (bubble as any).customName = 'Balloon Dialogo';
        (bubble as any).assetCategory = 'bubble';
        canvas.add(bubble);

        const bubbleText = new fabric.Textbox('Oggi sembra una giornata tranquilla...\nO almeno spero!', {
          left: 375,
          top: 95,
          width: 240,
          fontFamily: 'Comic Neue',
          fontWeight: 'bold',
          fontSize: 17,
          fill: '#000000',
          textAlign: 'center',
        });
        (bubbleText as any).customName = 'Testo Battuta';
        (bubbleText as any).assetCategory = 'text';
        (bubble as any).associatedText = bubbleText;
        (bubbleText as any).associatedBubble = bubble;
        canvas.add(bubbleText);

        canvas.requestRenderAll();
        onCanvasModified?.();
      } else if (panelIndex === 1) {
        const bgImg = await fabric.FabricImage.fromURL('/assets/images/manga_bg_school_rooftop_1794185211550.jpg');
        const scaleX = 800 / bgImg.width!;
        const scaleY = 500 / bgImg.height!;
        const scale = Math.max(scaleX, scaleY);
        bgImg.set({
          scaleX: scale,
          scaleY: scale,
          left: 0,
          top: 0,
          originX: 'left',
          originY: 'top',
          selectable: false,
          evented: false,
        });
        canvas.backgroundImage = bgImg;

        const girlDataUrl = await removeWhiteBackground('/assets/images/anime_girl_school_color_1794186454357.jpg');
        const girlImg = await fabric.FabricImage.fromURL(girlDataUrl);
        girlImg.scaleToHeight(380);
        girlImg.set({
          left: 80,
          top: 90,
          cornerStyle: 'circle',
          cornerColor: '#2563eb',
        });
        (girlImg as any).customName = 'Studentessa Ragazza (A Colori)';
        (girlImg as any).assetCategory = 'character';
        canvas.add(girlImg);

        const boyDataUrl = await removeWhiteBackground('/assets/images/anime_boy_casual_color_1794186469608.jpg');
        const boyImg = await fabric.FabricImage.fromURL(boyDataUrl);
        boyImg.scaleToHeight(370);
        boyImg.set({
          left: 460,
          top: 100,
          flipX: true,
          cornerStyle: 'circle',
          cornerColor: '#10b981',
        });
        (boyImg as any).customName = 'Ragazzo Casual';
        (boyImg as any).assetCategory = 'character';
        canvas.add(boyImg);

        const captionBox = await fabric.FabricImage.fromURL(BUBBLES.find(b => b.id === 'b-caption')!.url);
        captionBox.scaleToWidth(260);
        captionBox.set({ left: 30, top: 25, selectable: false });
        (captionBox as any).customName = 'Didascalia';
        (captionBox as any).assetCategory = 'bubble';
        canvas.add(captionBox);

        const captionText = new fabric.IText('PAUSA PRANZO: SUL TETTO', {
          left: 45,
          top: 45,
          fontFamily: 'Bangers',
          fontSize: 16,
          fill: '#000000',
        });
        (captionText as any).customName = 'Testo Didascalia';
        (captionText as any).assetCategory = 'text';
        canvas.add(captionText);

        const bubble = await fabric.FabricImage.fromURL(BUBBLES.find(b => b.id === 'b-talk')!.url);
        bubble.scaleToWidth(270);
        bubble.set({ left: 230, top: 50 });
        (bubble as any).customName = 'Balloon Dialogo';
        (bubble as any).assetCategory = 'bubble';
        canvas.add(bubble);

        const bubbleText = new fabric.Textbox('Ehi! Vieni qui all\'aria aperta,\nè una splendida giornata!', {
          left: 250,
          top: 75,
          width: 230,
          fontFamily: 'Comic Neue',
          fontWeight: 'bold',
          fontSize: 16,
          fill: '#000000',
          textAlign: 'center',
        });
        (bubbleText as any).customName = 'Testo Battuta';
        (bubbleText as any).assetCategory = 'text';
        (bubble as any).associatedText = bubbleText;
        (bubbleText as any).associatedBubble = bubble;
        canvas.add(bubbleText);

        canvas.requestRenderAll();
        onCanvasModified?.();
      }
    } catch (e) {
      console.error('Error preloading scene:', e);
    }
  };

  return (
    <div 
      onClick={onSelect}
      className="flex flex-col bg-white rounded-xl overflow-hidden border-4 border-zinc-950 shadow-2xl transition-all"
      style={{ width: '800px', maxWidth: '90vw' }}
    >
      {/* CARD HEADER */}
      <div className="h-9 bg-zinc-950 text-white px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 flex-1 max-w-[460px]" onClick={(e) => e.stopPropagation()}>
          <span className="font-comic text-xs tracking-wider text-yellow-400 uppercase shrink-0">
            TAVOLA #{index + 1}:
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => onUpdateTitle(e.target.value)}
            placeholder="Scrivi qui il titolo della scena..."
            className="bg-zinc-900 hover:bg-zinc-800 focus:bg-zinc-800 text-white text-xs font-semibold px-2 py-0.5 rounded border border-zinc-700 focus:border-yellow-400 outline-none w-full transition-colors"
            title="Clicca per modificare il titolo della scena"
          />
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClear}
            title="Svuota vignetta"
            className="text-zinc-400 hover:text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw size={12} /> Pulisci
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={onRemove}
            title="Elimina vignetta"
            className="text-zinc-400 hover:text-red-400 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
          >
            <Trash2 size={12} /> Elimina
          </button>
        </div>
      </div>

      {/* CANVAS WRAPPER */}
      <div className="relative w-[800px] h-[500px] bg-white overflow-hidden flex items-center justify-center">
        <canvas ref={canvasElementRef} width={800} height={500} className="block" />
      </div>
    </div>
  );
}
