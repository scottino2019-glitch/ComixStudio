export interface ComicElement {
  id: string;
  type: 'character' | 'background' | 'bubble' | 'text' | 'shape' | 'part';
  url?: string;
  text?: string;
  isLocked?: boolean;
  panelId?: string; // For clipping to specific panels
  properties: {
    left: number;
    top: number;
    scaleX: number;
    scaleY: number;
    angle: number;
    opacity: number;
    fill?: string;
  };
}

export interface CharacterPart {
  id: string;
  type: 'head' | 'face' | 'body' | 'accessory';
  name: string;
  url: string;
  category: string;
}

export interface PanelTemplate {
  id: string;
  name: string;
  layout: 'single' | 'double-v' | 'double-h' | 'triple-v' | 'quad-grid';
  regions: { id: string; x: number; y: number; width: number; height: number }[];
}

export interface Asset {
  id: string;
  name: string;
  category: 'character' | 'background' | 'bubble' | 'effect' | 'head' | 'body' | 'face';
  url: string;
}
