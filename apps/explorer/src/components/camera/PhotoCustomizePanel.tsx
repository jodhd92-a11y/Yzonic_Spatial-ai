'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Share2,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  Crop,
  Stethoscope,
  Ruler,
  PenSquare,
  ClipboardList,
  Circle as CircleIcon,
  MoveUpRight,
  Type as TypeIcon,
  EyeOff,
  Undo2,
  Trash2,
  Info,
  MessageSquare,
  Wand2,
  ShieldCheck,
  ShieldAlert,
  Keyboard,
  Columns2,
  FileText,
  Send,
  History,
  Tag,
  Plus,
  Loader2,
  CheckCircle2,
  FileJson,
  Lock,
  Unlock,
  Mic,
  MicOff,
  Command,
  Zap,
  BadgeCheck,
  AlertTriangle,
  Aperture,
  Gauge,
  ZoomOut,
  MoreVertical,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { Magnetic } from '@/components/ui/Magnetic'

// ---------------------------------------------------------------------------
// Minimal Web Speech API typing — lib.dom doesn't ship SpeechRecognition
// types, and this app only needs continuous dictation into a text field.
// ---------------------------------------------------------------------------
interface SpeechRecognitionResultLike {
  [index: number]: { transcript: string }
}
interface SpeechRecognitionEventLike {
  resultIndex: number
  results: { [index: number]: SpeechRecognitionResultLike; length: number }
}
interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike
function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export interface PhotoAdjustments {
  brightness: number // 0-200, 100 = neutral
  contrast: number
  saturation: number
  warmth: number // -100 (cool) .. 100 (warm) — mapped to sepia+hue-rotate
  vignette: number // 0-100
}

const DEFAULT_ADJUSTMENTS: PhotoAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 0,
  vignette: 0,
}

interface FilterPreset {
  id: string
  label: string
  category: 'general' | 'clinical'
  adjustments: Partial<PhotoAdjustments>
}

// Preset lineup is clinical/biotech-only — this lens is a documentation
// tool for wound care, gross specimens, dermatology, surgical fields, and
// microscopy, where flat, tone-accurate, high-fidelity contrast matters
// far more than mood. Consumer-style mood filters (vivid/warm/cool/mono)
// were removed on purpose: an over-saturated or hue-shifted photo can
// mislead whoever reviews it later, and this app has no general-purpose
// use case to justify keeping them.
const PRESETS: FilterPreset[] = [
  { id: 'natural', label: 'Natural', category: 'general', adjustments: {} },
  {
    id: 'clinical',
    label: 'Diagnostic Clarity',
    category: 'clinical',
    adjustments: { contrast: 122, saturation: 96, brightness: 106 },
  },
  {
    id: 'wound',
    label: 'Wound / Tissue',
    category: 'clinical',
    adjustments: { contrast: 128, saturation: 118, brightness: 100, warmth: 6 },
  },
  {
    id: 'dermatology',
    label: 'Dermatology',
    category: 'clinical',
    adjustments: { contrast: 108, saturation: 112, brightness: 102, warmth: -4 },
  },
  {
    id: 'specimen',
    label: 'Specimen / Macro',
    category: 'clinical',
    adjustments: { contrast: 120, saturation: 100, brightness: 108 },
  },
  {
    id: 'microscopy',
    label: 'Microscopy',
    category: 'clinical',
    adjustments: { contrast: 116, saturation: 130, brightness: 104 },
  },
  {
    id: 'radiographic',
    label: 'Grayscale (Radiographic)',
    category: 'clinical',
    adjustments: { saturation: 0, contrast: 142, brightness: 100 },
  },
  {
    id: 'legibility',
    label: 'Label / Screen Legibility',
    category: 'clinical',
    adjustments: { contrast: 134, saturation: 88, brightness: 108 },
  },
  {
    id: 'blot',
    label: 'Gel / Blot Contrast',
    category: 'clinical',
    adjustments: { saturation: 6, contrast: 150, brightness: 96 },
  },
]

const ADJUST_ROWS: { key: keyof PhotoAdjustments; label: string; min: number; max: number }[] = [
  { key: 'brightness', label: 'Brightness', min: 40, max: 160 },
  { key: 'contrast', label: 'Contrast', min: 40, max: 160 },
  { key: 'saturation', label: 'Saturation', min: 0, max: 200 },
  { key: 'warmth', label: 'Warmth', min: -100, max: 100 },
  { key: 'vignette', label: 'Vignette', min: 0, max: 100 },
]

const ASPECTS = [
  { id: 'full', label: 'Full' },
  { id: 'square', label: '1:1' },
  { id: 'portrait', label: '3:4' },
  { id: 'wide', label: '16:9' },
]

const MODALITIES = [
  'Wound / tissue',
  'Dermoscopy / lesion',
  'Vitals / monitor display',
  'Medication / label',
  'Patient ID / wristband',
  'Surgical field',
  'PPE / sterile field',
  'Gross specimen',
  'Microscopy slide',
  'Gel / blot',
  'Culture / plate',
  'Lab report / requisition',
  'Radiograph / light-box',
  'Other',
] as const

// Groups the fixed modality list into the two professional contexts this
// app serves — bedside/OR documentation vs bench/lab research — so the
// Case tab can show only the specialized fields that context actually
// needs instead of one long undifferentiated form.
const LAB_MODALITIES = new Set<(typeof MODALITIES)[number]>([
  'Gross specimen',
  'Microscopy slide',
  'Gel / blot',
  'Culture / plate',
  'Lab report / requisition',
])
const INSTRUMENT_MODALITIES = new Set<(typeof MODALITIES)[number]>([
  'Microscopy slide',
  'Gel / blot',
  'Culture / plate',
])

// Role of the professional capturing/reviewing the image — drives who's
// accountable on the record, distinct from the free-text name/initials
// field. Scoped entirely to hospital and biotech-lab roles.
const ROLES = [
  'Attending physician',
  'Surgeon',
  'Resident / fellow',
  'Medical student',
  'Nurse / clinical staff',
  'Principal investigator',
  'Research scientist',
  'Lab technician',
  'Graduate / PhD student',
  'Other',
] as const

const SPECIMEN_TYPES = ['Tissue', 'Blood / serum / plasma', 'Cell culture', 'Fixed slide', 'Swab', 'Fluid / aspirate', 'Other'] as const
const STORAGE_CONDITIONS = ['Room temperature', 'Refrigerated (4°C)', 'Frozen (-20°C)', 'Ultra-frozen (-80°C)', 'Fixed (formalin)', 'Frozen section (OCT)'] as const
const BIOSAFETY_LEVELS = ['BSL-1', 'BSL-2', 'BSL-3', 'BSL-4', 'N/A'] as const

// Measurement unit for calibration + all on-image readouts. mm/cm cover
// gross specimens and wounds; µm covers microscopy fields of view — a
// single "mm-only" ruler (the old behavior) is unusable at microscope
// magnifications.
type MeasureUnit = 'mm' | 'cm' | 'µm'
const UNIT_TO_MM: Record<MeasureUnit, number> = { mm: 1, cm: 10, 'µm': 0.001 }

// Activity-bar tabs — shared between the icon rail and the side-panel
// section header so the two always agree on label/icon.
const PANEL_TABS = [
  { id: 'styles', label: 'Styles', icon: Sparkles },
  { id: 'adjust', label: 'Adjust', icon: SlidersHorizontal },
  { id: 'markup', label: 'Markup', icon: PenSquare },
  { id: 'ai', label: 'AI Assist', icon: Wand2 },
  { id: 'case', label: 'Case', icon: ClipboardList },
  { id: 'export', label: 'Export', icon: Send },
] as const

function cssFilterFor(a: PhotoAdjustments): string {
  const hue = a.warmth < 0 ? a.warmth * 1.2 : 0
  const sepia = a.warmth > 0 ? a.warmth * 0.006 : 0
  return [
    `brightness(${a.brightness}%)`,
    `contrast(${a.contrast}%)`,
    `saturate(${a.saturation}%)`,
    sepia ? `sepia(${sepia})` : '',
    hue ? `hue-rotate(${hue}deg)` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

// ---------------------------------------------------------------------------
// Markup / annotation
//
// Everything is stored in coordinates *normalized to the photo's natural
// pixel size* (0..naturalWidth / 0..naturalHeight), not the on-screen
// rendered size. That's what lets the same shape list drive both the live
// on-screen SVG overlay (scaled to whatever size the preview happens to be
// rendered at) and the baked-in export canvas (drawn at full resolution)
// without any unit conversion bugs between the two.
// ---------------------------------------------------------------------------

type MarkupTool = 'roi' | 'arrow' | 'measure' | 'text' | 'redact'

interface MarkupShape {
  id: string
  tool: MarkupTool
  x1: number
  y1: number
  x2: number
  y2: number
  text?: string
}

export interface CaseInfo {
  caseId: string
  bodySite: string
  modality: (typeof MODALITIES)[number]
  capturedBy: string
  notes: string
  /** Optional specialized fields — populated only where relevant to the
   * chosen modality, but always present on the object so downstream
   * consumers (report, sidecar JSON, EHR/LIMS push) get a stable shape. */
  role?: (typeof ROLES)[number]
  institution?: string
  department?: string
  protocolId?: string
  specimenType?: (typeof SPECIMEN_TYPES)[number]
  storageCondition?: (typeof STORAGE_CONDITIONS)[number]
  biosafetyLevel?: (typeof BIOSAFETY_LEVELS)[number]
  instrument?: string
  magnification?: string
  stain?: string
}

const EMPTY_CASE: CaseInfo = {
  caseId: '',
  bodySite: '',
  modality: 'Wound / tissue',
  capturedBy: '',
  notes: '',
  role: undefined,
  institution: '',
  department: '',
  protocolId: '',
  specimenType: undefined,
  storageCondition: undefined,
  biosafetyLevel: undefined,
  instrument: '',
  magnification: '',
  stain: '',
}

// A calibration is two points marked against a reference object of known
// real-world size (a ruler, a coin, an adhesive scale sticker already in
// frame) plus the length that reference actually spans. Everything else —
// the live scale bar, the on-canvas ruler grid, and every "measure" shape's
// distance readout — derives from this one ratio. Without it the tool is
// explicit about showing pixel distances rather than pretending it knows
// millimetres, since a wrong silent guess is worse than an honest "px".
interface Calibration {
  x1: number
  y1: number
  x2: number
  y2: number
  mm: number
}

const TOOL_META: { id: MarkupTool; label: string; icon: typeof CircleIcon; key: string }[] = [
  { id: 'roi', label: 'Mark ROI', icon: CircleIcon, key: '1' },
  { id: 'arrow', label: 'Point to', icon: MoveUpRight, key: '2' },
  { id: 'measure', label: 'Measure', icon: Ruler, key: '3' },
  { id: 'text', label: 'Label', icon: TypeIcon, key: '4' },
  { id: 'redact', label: 'Redact (de-ID)', icon: EyeOff, key: '5' },
]

// Severity / laterality vocabulary kept intentionally small and generic
// (not a coding standard) — free-text ICD-10 / SNOMED CT tags below are
// where any real code assignment belongs. This is a structuring aid for
// the record, not a substitute for a clinician's coded diagnosis.
type Severity = 'mild' | 'moderate' | 'severe'
type Laterality = 'n/a' | 'left' | 'right' | 'bilateral'

interface Finding {
  id: string
  label: string
  severity: Severity
  laterality: Laterality
}

// Quick-add chips shown per modality on the AI Assist / Findings tab, so
// the person taps instead of typing for the most common structured
// findings for whatever they're documenting.
const QUICK_FINDINGS: Record<string, string[]> = {
  'Wound / tissue': ['Erythema', 'Induration', 'Purulent drainage', 'Granulation tissue', 'Necrotic tissue', 'Dehiscence'],
  'Dermoscopy / lesion': ['Asymmetry', 'Irregular border', 'Color variegation', 'Diameter >6mm', 'Evolving lesion'],
  'Surgical field': ['Hemostasis achieved', 'Foreign body', 'Adhesions', 'Anatomic variant'],
  'Gross specimen': ['Margin involvement', 'Necrosis', 'Hemorrhage', 'Calcification'],
  'Microscopy slide': ['Atypical cells', 'Mitotic figures', 'Inflammatory infiltrate', 'Fibrosis'],
  'Gel / blot': ['Band shift', 'Non-specific binding', 'Loading discrepancy'],
  'Culture / plate': ['Contamination', 'Confluent growth', 'Hemolysis', 'Zone of inhibition'],
}
const DEFAULT_QUICK_FINDINGS = ['Follow-up required', 'Within normal limits', 'Correlate clinically']

// Illustrative-only AI pre-read copy, keyed by modality. This is a UI
// demonstration of an "accept/dismiss" review workflow — NOT a real model
// call and NOT a diagnostic output. It must always render behind the
// disclaimer banner and every suggestion requires an explicit clinician
// accept before it becomes part of the record.
const AI_SUGGESTIONS: Record<string, { label: string; severity: Severity; confidence: number }[]> = {
  'Wound / tissue': [
    { label: 'Peri-wound erythema', severity: 'moderate', confidence: 0.78 },
    { label: 'Granulation tissue present', severity: 'mild', confidence: 0.71 },
  ],
  'Dermoscopy / lesion': [
    { label: 'Border irregularity flagged', severity: 'moderate', confidence: 0.66 },
    { label: 'Pigment network asymmetry', severity: 'mild', confidence: 0.58 },
  ],
  'Gel / blot': [{ label: 'Band intensity variance across lanes', severity: 'mild', confidence: 0.64 }],
  'Microscopy slide': [{ label: 'Cellular atypia region flagged', severity: 'moderate', confidence: 0.69 }],
}

// ---------------------------------------------------------------------------
// Image Quality Control (QC) — a lightweight, entirely client-side heuristic
// that flags the two most common reasons a clinical/lab capture gets
// rejected on review: it's too dark/blown-out, or it's soft/out-of-focus.
// This is NOT a diagnostic quality gate — it's a fast pre-flight check so a
// bad capture gets retaken at the bedside/bench instead of surfacing as a
// support ticket after the record is already filed.
// ---------------------------------------------------------------------------
export interface QcResult {
  exposureScore: number // 0-100
  sharpnessScore: number // 0-100
  overall: number // 0-100
  verdict: 'good' | 'warn' | 'poor'
  notes: string[]
}

function analyzeImageQuality(img: HTMLImageElement): QcResult {
  const notes: string[] = []
  const canvas = document.createElement('canvas')
  // Downsample for speed — QC doesn't need full resolution.
  const scale = Math.min(1, 240 / Math.max(img.naturalWidth, img.naturalHeight, 1))
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { exposureScore: 70, sharpnessScore: 70, overall: 70, verdict: 'good', notes: [] }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)

  // Luma histogram → exposure score (penalize clipped shadows/highlights).
  let sum = 0
  const gray = new Float32Array(width * height)
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
    gray[p] = l
    sum += l
  }
  const mean = sum / gray.length
  let clipped = 0
  for (let p = 0; p < gray.length; p++) if (gray[p] < 12 || gray[p] > 245) clipped++
  const clipRatio = clipped / gray.length
  const exposurePenalty = Math.abs(mean - 128) / 128
  const exposureScore = Math.max(0, Math.round(100 - exposurePenalty * 70 - clipRatio * 200))
  if (mean < 70) notes.push('Frame reads dark — consider more light or exposure compensation.')
  if (mean > 190) notes.push('Frame reads bright/blown-out — highlights may be clipped.')

  // Simple Laplacian-variance proxy for sharpness (edge energy).
  let edgeEnergy = 0
  let count = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      const lap =
        4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width]
      edgeEnergy += lap * lap
      count++
    }
  }
  const variance = count ? edgeEnergy / count : 0
  const sharpnessScore = Math.max(0, Math.min(100, Math.round((variance / 900) * 100)))
  if (sharpnessScore < 35) notes.push('Low edge detail detected — frame may be soft or motion-blurred.')

  const overall = Math.round(exposureScore * 0.45 + sharpnessScore * 0.55)
  const verdict: QcResult['verdict'] = overall >= 75 ? 'good' : overall >= 50 ? 'warn' : 'poor'
  return { exposureScore, sharpnessScore, overall, verdict, notes }
}

function nowStamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const TOUR_STORAGE_KEY = 'clinical-lens.customize-tour-seen.v1'

export function PhotoCustomizePanel({
  photo,
  title,
  onClose,
  onChat,
}: {
  photo: string
  title: string
  onClose: () => void
  /** "Chat about this" — hands the case info gathered here (case ID, body
   * site, modality, notes) straight into the chat handoff, so the chat
   * opens already knowing the clinical context instead of starting blank. */
  onChat?: (caseInfo: CaseInfo) => void
}) {
  const [presetId, setPresetId] = useState('natural')
  const [adjustments, setAdjustments] = useState<PhotoAdjustments>(DEFAULT_ADJUSTMENTS)
  const [aspect, setAspect] = useState('full')
  const [tab, setTab] = useState<'styles' | 'adjust' | 'markup' | 'ai' | 'case' | 'export'>('styles')
  const [tabDirection, setTabDirection] = useState(1)
  const changeTab = useCallback((next: typeof tab) => {
    setTab((cur) => {
      const from = TAB_ORDER.indexOf(cur)
      const to = TAB_ORDER.indexOf(next)
      setTabDirection(to >= from ? 1 : -1)
      return next
    })
  }, [])
  const settings = useAppStore((s) => s.settings)
  const triggerHapticEnabled = settings.hapticFeedback

  const filterCss = useMemo(() => cssFilterFor(adjustments), [adjustments])

  // --- markup state ---------------------------------------------------
  const [activeTool, setActiveTool] = useState<MarkupTool | null>(null)
  const [shapes, setShapes] = useState<MarkupShape[]>([])
  const [draft, setDraft] = useState<MarkupShape | null>(null)
  const [textPrompt, setTextPrompt] = useState<{ x: number; y: number; value: string } | null>(null)
  const [calibrating, setCalibrating] = useState(false)
  const [calibDraft, setCalibDraft] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const [calibration, setCalibration] = useState<Calibration | null>(null)
  const [unit, setUnit] = useState<MeasureUnit>('mm')
  const [showScaleBar, setShowScaleBar] = useState(false)
  const [burnInOnExport, setBurnInOnExport] = useState(true)
  const [caseInfo, setCaseInfo] = useState<CaseInfo>(EMPTY_CASE)
  const [showOriginal, setShowOriginal] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)

  // --- new: structured findings / coding -------------------------------
  const [findings, setFindings] = useState<Finding[]>([])
  const [codeTags, setCodeTags] = useState<string[]>([])
  const [codeDraft, setCodeDraft] = useState('')

  // --- new: compliance & workflow ---------------------------------------
  const [consentConfirmed, setConsentConfirmed] = useState(false)
  const [reviewer, setReviewer] = useState('')
  const [auditLog, setAuditLog] = useState<{ ts: string; action: string }[]>([])
  const [exportFormat, setExportFormat] = useState<'jpeg' | 'png'>('jpeg')
  const [includeSidecar, setIncludeSidecar] = useState(false)
  const [ehrStatus, setEhrStatus] = useState<'idle' | 'queued'>('idle')

  // --- new: AI pre-read (illustrative only, see AI_SUGGESTIONS comment) -
  const [aiRunning, setAiRunning] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<{ label: string; severity: Severity; confidence: number }[] | null>(null)

  // --- new: image quality control (QC) ----------------------------------
  const [qc, setQc] = useState<QcResult | null>(null)

  // --- new: sign-off & record lock ---------------------------------------
  // Locking freezes styles/adjust/markup/case edits so a signed record
  // can't silently drift — mirrors an enterprise chart's "finalize" step.
  // Unlock is always available (this is a documentation tool, not an
  // access-control system) but every lock/unlock is written to the audit
  // trail so the record shows who touched it and when.
  const [locked, setLocked] = useState(false)
  const [signature, setSignature] = useState<{ by: string; role: string; at: string } | null>(null)
  const [signerName, setSignerName] = useState('')

  // --- new: voice dictation for notes (Web Speech API) --------------------
  const [dictating, setDictating] = useState(false)
  const [voiceSupported] = useState(() => getSpeechRecognitionCtor() !== null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  // --- new: command palette (⌘K) -----------------------------------------
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteQuery, setPaletteQuery] = useState('')

  // --- mobile title-bar overflow ------------------------------------------
  // Below `md` there isn't room for QC/lock badges plus five action icons
  // next to Cancel/Reset/Done, so those fold into this single "More" menu
  // instead of disappearing — every action desktop has is still reachable
  // on a phone, just one tap deeper.
  const [moreOpen, setMoreOpen] = useState(false)

  const capturedAtRef = useRef(new Date())

  const logAudit = useCallback((action: string) => {
    setAuditLog((log) => [{ ts: nowStamp(), action }, ...log].slice(0, 20))
  }, [])

  const imgRef = useRef<HTMLImageElement>(null)
  const overlayRef = useRef<SVGSVGElement>(null)
  const [natural, setNatural] = useState({ w: 0, h: 0 })
  const pointerStart = useRef<{ x: number; y: number } | null>(null)

  // --- canvas zoom & pan (scroll/pinch to zoom, drag to pan when zoomed) --
  // Purely a viewing aid — doesn't touch natural-pixel shape coordinates,
  // so markup/measure math above is completely unaffected by it.
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const zoomDragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const MIN_ZOOM = 1
  const MAX_ZOOM = 4

  const handleCanvasWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 4) return
      e.preventDefault()
      setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z - e.deltaY * 0.0022)))
    },
    []
  )
  const resetZoom = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])
  const handleZoomPanStart = (e: React.PointerEvent) => {
    if (zoom <= 1 || activeTool || calibrating) return
    zoomDragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
    setIsPanning(true)
  }
  const handleZoomPanMove = (e: React.PointerEvent) => {
    if (!zoomDragStart.current) return
    const d = zoomDragStart.current
    setPan({ x: d.panX + (e.clientX - d.x), y: d.panY + (e.clientY - d.y) })
  }
  const handleZoomPanEnd = () => {
    zoomDragStart.current = null
    setIsPanning(false)
  }

  const pxPerMm = calibration
    ? Math.hypot((calibration.x2 - calibration.x1), (calibration.y2 - calibration.y1)) / calibration.mm
    : null

  const toNaturalCoords = useCallback(
    (clientX: number, clientY: number) => {
      const svg = overlayRef.current
      if (!svg || !natural.w || !natural.h) return null
      const rect = svg.getBoundingClientRect()
      const nx = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * natural.w
      const ny = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)) * natural.h
      return { x: nx, y: ny }
    },
    [natural]
  )

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (locked) return
    const pt = toNaturalCoords(e.clientX, e.clientY)
    if (!pt) return

    if (calibrating) {
      pointerStart.current = pt
      setCalibDraft({ x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y })
      return
    }
    if (!activeTool) return
    if (activeTool === 'text') {
      setTextPrompt({ x: pt.x, y: pt.y, value: '' })
      return
    }
    pointerStart.current = pt
    setDraft({ id: 'draft', tool: activeTool, x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y })
  }

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointerStart.current) return
    const pt = toNaturalCoords(e.clientX, e.clientY)
    if (!pt) return
    if (calibrating) {
      setCalibDraft((d) => (d ? { ...d, x2: pt.x, y2: pt.y } : d))
      return
    }
    if (!activeTool || activeTool === 'text') return
    setDraft((d) => (d ? { ...d, x2: pt.x, y2: pt.y } : d))
  }

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const pt = toNaturalCoords(e.clientX, e.clientY)
    if (!pt || !pointerStart.current) {
      pointerStart.current = null
      return
    }

    if (calibrating) {
      const start = pointerStart.current
      pointerStart.current = null
      setCalibDraft(null)
      const valStr = window.prompt(
        `Real-world length of that reference line, in ${unit} (e.g. a ruler tick, stage micrometer division, or the width of a known-size sticker):`
      )
      const val = valStr ? Number(valStr) : NaN
      if (val && val > 0) {
        const mm = val * UNIT_TO_MM[unit]
        setCalibration({ x1: start.x, y1: start.y, x2: pt.x, y2: pt.y, mm })
        setShowScaleBar(true)
        logAudit(`Scale calibrated (${(Math.hypot(pt.x - start.x, pt.y - start.y) / mm).toFixed(2)} px/mm, entered as ${val} ${unit})`)
      }
      setCalibrating(false)
      return
    }

    if (activeTool && activeTool !== 'text' && draft) {
      const dist = Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1)
      if (dist > Math.max(6, natural.w * 0.005)) {
        setShapes((s) => [...s, { ...draft, id: `m-${Date.now()}` }])
        if (triggerHapticEnabled && navigator.vibrate) navigator.vibrate(6)
      }
    }
    setDraft(null)
    pointerStart.current = null
  }

  const commitTextPrompt = () => {
    if (textPrompt && textPrompt.value.trim()) {
      setShapes((s) => [
        ...s,
        { id: `m-${Date.now()}`, tool: 'text', x1: textPrompt.x, y1: textPrompt.y, x2: textPrompt.x, y2: textPrompt.y, text: textPrompt.value.trim() },
      ])
    }
    setTextPrompt(null)
  }

  const undoLastShape = () => setShapes((s) => s.slice(0, -1))
  const clearShapes = () => setShapes([])

  const applyPreset = (preset: FilterPreset) => {
    if (locked) return
    setPresetId(preset.id)
    setAdjustments({ ...DEFAULT_ADJUSTMENTS, ...preset.adjustments })
    if (triggerHapticEnabled && typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8)
    logAudit(`Style applied: ${preset.label}`)
  }

  const reset = () => {
    setPresetId('natural')
    setAdjustments(DEFAULT_ADJUSTMENTS)
    setShapes([])
    setCalibration(null)
    setShowScaleBar(false)
    logAudit('All edits reset')
  }

  const addFinding = (label: string) => {
    if (findings.some((f) => f.label === label)) return
    setFindings((f) => [...f, { id: `f-${Date.now()}-${label}`, label, severity: 'moderate', laterality: 'n/a' }])
    if (triggerHapticEnabled && navigator.vibrate) navigator.vibrate(6)
  }
  const removeFinding = (id: string) => setFindings((f) => f.filter((x) => x.id !== id))
  const updateFinding = (id: string, patch: Partial<Finding>) =>
    setFindings((f) => f.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  const addCodeTag = () => {
    const v = codeDraft.trim()
    if (!v || codeTags.includes(v)) return
    setCodeTags((t) => [...t, v])
    setCodeDraft('')
  }

  const runAiPreRead = () => {
    setAiRunning(true)
    setAiSuggestions(null)
    // Simulated latency for the review workflow — this build does not call
    // an inference endpoint. Wire this to your organization's validated
    // clinical-imaging model before treating output as anything but a demo.
    window.setTimeout(() => {
      setAiSuggestions(AI_SUGGESTIONS[caseInfo.modality] ?? [])
      setAiRunning(false)
      logAudit('AI pre-read run (assistive, unreviewed)')
    }, 900)
  }
  const acceptAiSuggestion = (s: { label: string; severity: Severity }) => {
    if (!findings.some((f) => f.label === s.label)) {
      setFindings((f) => [...f, { id: `f-${Date.now()}-${s.label}`, label: s.label, severity: s.severity, laterality: 'n/a' }])
    }
    setAiSuggestions((cur) => (cur ? cur.filter((x) => x.label !== s.label) : cur))
    logAudit(`AI suggestion accepted: ${s.label}`)
  }
  const dismissAiSuggestion = (label: string) =>
    setAiSuggestions((cur) => (cur ? cur.filter((x) => x.label !== label) : cur))

  const aspectClass =
    aspect === 'square' ? 'aspect-square' : aspect === 'portrait' ? 'aspect-[3/4]' : aspect === 'wide' ? 'aspect-video' : 'aspect-auto'

  // Scale bar length picked to be a tidy round number, *in the currently
  // selected unit*, relative to image width — rather than always defaulting
  // to 10mm regardless of unit or how zoomed-in the reference photo is
  // (a 10mm bar is useless at microscope magnifications measured in µm).
  const scaleBarValueMm = useMemo(() => {
    if (!pxPerMm || !natural.w) return 10 * UNIT_TO_MM[unit]
    const candidates = [50, 20, 10, 5, 2, 1].map((n) => n * UNIT_TO_MM[unit])
    const fit = candidates.find((mmVal) => {
      const px = pxPerMm * mmVal
      return px < natural.w * 0.6 && px > natural.w * 0.04
    })
    return fit ?? candidates[candidates.length - 1]
  }, [pxPerMm, natural.w, unit])

  const buildRecord = useCallback(
    () => ({
      title,
      caseInfo,
      findings,
      codeTags,
      adjustments,
      presetId,
      calibration,
      pxPerMm,
      measurementUnit: unit,
      reviewer: reviewer || null,
      consentConfirmed,
      capturedAt: capturedAtRef.current.toISOString(),
      exportedAt: new Date().toISOString(),
      auditLog,
    }),
    [title, caseInfo, findings, codeTags, adjustments, presetId, calibration, pxPerMm, unit, reviewer, consentConfirmed, auditLog]
  )

  const handleDownload = () => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.filter = filterCss
      ctx.drawImage(img, 0, 0)
      ctx.filter = 'none'

      if (burnInOnExport) {
        drawMarkupToCanvas(ctx, shapes, canvas.width, canvas.height)
        if (showScaleBar && pxPerMm) {
          drawScaleBar(ctx, pxPerMm, scaleBarValueMm, unit, canvas.width, canvas.height)
        }
        drawCaseStamp(ctx, caseInfo, findings, canvas.width, canvas.height)
      }

      const mime = exportFormat === 'png' ? 'image/png' : 'image/jpeg'
      const ext = exportFormat === 'png' ? 'png' : 'jpg'
      const idPart = caseInfo.caseId.trim().replace(/\s+/g, '-') || title.replace(/\s+/g, '-').toLowerCase() || 'scan'
      const stamp = Date.now()

      const a = document.createElement('a')
      a.href = canvas.toDataURL(mime, 0.95)
      a.download = `${idPart}-${stamp}.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()

      if (includeSidecar) {
        const blob = new Blob([JSON.stringify(buildRecord(), null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const s = document.createElement('a')
        s.href = url
        s.download = `${idPart}-${stamp}.json`
        document.body.appendChild(s)
        s.click()
        s.remove()
        URL.revokeObjectURL(url)
      }
      logAudit(`Image exported (${exportFormat.toUpperCase()}${includeSidecar ? ' + metadata sidecar' : ''})`)
    }
    img.src = photo
  }

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `Scan: ${title}` })
        logAudit('Shared via system share sheet')
      }
    } catch {
      // Share can be cancelled/unsupported — no-op.
    }
  }

  const handleGenerateReport = () => {
    const win = window.open('', '_blank')
    if (!win) return
    const findingsRows = findings
      .map((f) => `<tr><td>${f.label}</td><td>${f.severity}</td><td>${f.laterality}</td></tr>`)
      .join('')
    win.document.write(`<!doctype html><html><head><title>Case report — ${title}</title>
      <style>
        body{font-family:ui-sans-serif,system-ui,sans-serif;color:#111;padding:32px;max-width:760px;margin:0 auto}
        h1{font-size:18px;margin-bottom:2px} .muted{color:#666;font-size:12px;margin-bottom:20px}
        img{max-width:100%;border-radius:8px;border:1px solid #ddd;margin:16px 0}
        table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
        td,th{border:1px solid #ddd;padding:6px 8px;text-align:left}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;margin:12px 0}
        .grid div span{color:#666}
        .tag{display:inline-block;background:#eef1f6;border-radius:999px;padding:2px 8px;font-size:11px;margin:2px}
      </style></head><body>
      <h1>Clinical documentation report</h1>
      <div class="muted">Generated ${new Date().toLocaleString()} · Not a diagnostic report — for internal case documentation only.</div>
      <img src="${photo}" alt="${title}" />
      <div class="grid">
        <div><span>Case / specimen ID:</span> ${caseInfo.caseId || '—'}</div>
        <div><span>Modality:</span> ${caseInfo.modality}</div>
        <div><span>Body site / source:</span> ${caseInfo.bodySite || '—'}</div>
        <div><span>Captured by:</span> ${caseInfo.capturedBy || '—'} ${caseInfo.role ? `(${caseInfo.role})` : ''}</div>
        <div><span>Institution:</span> ${caseInfo.institution || '—'}</div>
        <div><span>Department / lab:</span> ${caseInfo.department || '—'}</div>
        <div><span>Protocol / IRB / study ID:</span> ${caseInfo.protocolId || '—'}</div>
        <div><span>Reviewer assigned:</span> ${reviewer || '—'}</div>
        <div><span>Consent confirmed:</span> ${consentConfirmed ? 'Yes' : 'Not recorded'}</div>
        ${pxPerMm ? `<div><span>Scale:</span> ${(pxPerMm * UNIT_TO_MM[unit]).toFixed(2)} px/${unit}</div>` : ''}
        ${caseInfo.specimenType ? `<div><span>Specimen type:</span> ${caseInfo.specimenType}</div>` : ''}
        ${caseInfo.storageCondition ? `<div><span>Storage:</span> ${caseInfo.storageCondition}</div>` : ''}
        ${caseInfo.biosafetyLevel ? `<div><span>Biosafety level:</span> ${caseInfo.biosafetyLevel}</div>` : ''}
        ${caseInfo.instrument ? `<div><span>Instrument:</span> ${caseInfo.instrument}</div>` : ''}
        ${caseInfo.magnification ? `<div><span>Magnification:</span> ${caseInfo.magnification}</div>` : ''}
        ${caseInfo.stain ? `<div><span>Stain / prep:</span> ${caseInfo.stain}</div>` : ''}
      </div>
      ${caseInfo.notes ? `<p><b>Notes:</b> ${caseInfo.notes}</p>` : ''}
      ${findings.length ? `<h3>Findings</h3><table><tr><th>Finding</th><th>Severity</th><th>Laterality</th></tr>${findingsRows}</table>` : ''}
      ${codeTags.length ? `<p><b>Tags / codes:</b> ${codeTags.map((t) => `<span class="tag">${t}</span>`).join(' ')}</p>` : ''}
      <script>window.onload = () => setTimeout(() => window.print(), 300)</script>
      </body></html>`)
    win.document.close()
    logAudit('Case report generated (print / PDF)')
  }

  const handleSendToEhr = () => {
    setEhrStatus('queued')
    logAudit('Queued for EHR / LIMS sync (demo — no live integration configured)')
    window.setTimeout(() => setEhrStatus('idle'), 3200)
  }

  // --- sign-off / lock ---------------------------------------------------
  const handleSign = () => {
    const name = signerName.trim() || caseInfo.capturedBy.trim()
    if (!name) return
    const at = new Date().toISOString()
    setSignature({ by: name, role: caseInfo.role ?? 'Reviewer', at })
    setLocked(true)
    logAudit(`Record signed and locked by ${name}${caseInfo.role ? ` (${caseInfo.role})` : ''}`)
  }
  const handleUnlock = () => {
    setLocked(false)
    logAudit(`Record unlocked${signature ? ` (previously signed by ${signature.by})` : ''}`)
  }

  // --- voice dictation (Web Speech API) ------------------------------------
  const toggleDictation = () => {
    if (locked) return
    const SR = getSpeechRecognitionCtor()
    if (!SR) return
    if (dictating) {
      recognitionRef.current?.stop()
      setDictating(false)
      return
    }
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = false
    rec.lang = 'en-US'
    rec.onresult = (ev) => {
      let transcript = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) transcript += ev.results[i][0].transcript
      if (transcript.trim()) {
        setCaseInfo((c) => ({ ...c, notes: (c.notes ? c.notes + ' ' : '') + transcript.trim() }))
      }
    }
    rec.onend = () => setDictating(false)
    rec.onerror = () => setDictating(false)
    recognitionRef.current = rec
    rec.start()
    setDictating(true)
    logAudit('Voice dictation started (notes field)')
  }

  // --- command palette (⌘K) -----------------------------------------------
  const paletteActions = useMemo(
    () => [
      { id: 'tab-styles', label: 'Go to Styles', run: () => changeTab('styles') },
      { id: 'tab-adjust', label: 'Go to Adjust', run: () => changeTab('adjust') },
      { id: 'tab-markup', label: 'Go to Markup', run: () => changeTab('markup') },
      { id: 'tab-ai', label: 'Go to AI Assist', run: () => changeTab('ai') },
      { id: 'tab-case', label: 'Go to Case', run: () => changeTab('case') },
      { id: 'tab-export', label: 'Go to Export', run: () => changeTab('export') },
      { id: 'reset', label: 'Reset all edits', run: reset },
      { id: 'compare', label: 'Toggle compare original', run: () => setShowOriginal((v) => !v) },
      { id: 'run-ai', label: 'Run AI pre-read', run: runAiPreRead },
      { id: 'sign', label: locked ? 'Unlock record' : 'Sign & lock record', run: () => (locked ? handleUnlock() : handleSign()) },
      { id: 'download', label: 'Download / export', run: handleDownload },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locked, signerName, caseInfo, reset]
  )
  const filteredPaletteActions = paletteActions.filter((a) => a.label.toLowerCase().includes(paletteQuery.toLowerCase()))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // --- keyboard shortcuts (desktop-efficiency, enterprise pattern) ------
  // NOTE: Escape only cancels the active tool or dismisses the shortcuts
  // popover — it deliberately does NOT close the whole panel. The panel
  // must only close via the explicit Cancel/Done buttons in the title bar,
  // never as a side-effect of a keypress or a stray gesture elsewhere in
  // the UI (selects, sliders, drags on the markup canvas, etc.).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === '?') {
        setShowShortcuts((v) => !v)
        return
      }
      if (e.key === 'Escape') {
        if (showShortcuts) setShowShortcuts(false)
        else if (activeTool) setActiveTool(null)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undoLastShape()
        return
      }
      const meta = TOOL_META.find((t) => t.key === e.key)
      if (meta) {
        changeTab('markup')
        setCalibrating(false)
        setActiveTool((cur) => (cur === meta.id ? null : meta.id))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, showShortcuts])

  const handleDone = () => {
    handleDownload()
    onClose()
  }

  // --- first-visit tour --------------------------------------------------
  const [tourStep, setTourStep] = useState<number | null>(null)
  const [tourRect, setTourRect] = useState<DOMRect | null>(null)
  const segmentRef = useRef<HTMLDivElement>(null)
  const canvasWrapRef = useRef<HTMLDivElement>(null)
  const doneBtnRef = useRef<HTMLButtonElement>(null)
  const aiTabRef = useRef<HTMLButtonElement>(null)

  // Refs live in their own array, kept completely separate from
  // `tourContent` below. `tourContent` is what gets read during render (for
  // the tooltip copy) — keeping it ref-free means nothing rendered ever
  // touches a ref, so there's no risk of reading a stale/uncommitted
  // `.current` mid-render. The refs themselves are only ever dereferenced
  // inside the measurement effect further down, which is exactly where
  // ref reads belong.
  const tourStepRefs = useMemo(() => [segmentRef, canvasWrapRef, aiTabRef, doneBtnRef], [])

  const tourContent = useMemo(
    () => [
      {
        title: 'Everything, one swipe away',
        body: 'Styles, adjustments, markup tools, AI assist, case details, and export all live here — tap any section to switch.',
      },
      {
        title: 'Draw right on the photo',
        body: 'Pick a markup tool and drag directly on the image to mark a region, measure, label, or redact identifying details.',
      },
      {
        title: 'AI-assisted, always reviewed',
        body: 'Get suggested findings for this modality — nothing is added to the record until you explicitly accept it.',
      },
      {
        title: 'Nothing closes on its own',
        body: '"Done" saves and closes. "Cancel" discards and closes. Those are the only two ways this editor exits — never automatically.',
      },
    ],
    []
  )

  useEffect(() => {
    let seen = false
    try {
      seen = window.localStorage.getItem(TOUR_STORAGE_KEY) === '1'
    } catch {
      // Storage may be unavailable (private mode) — just skip the tour.
      seen = true
    }
    if (seen) return
    const t = window.setTimeout(() => setTourStep(0), 700)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    if (tourStep === null) return
    const ref = tourStepRefs[tourStep]
    const measure = () => setTourRect(ref?.current?.getBoundingClientRect() ?? null)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [tourStep, tourStepRefs])

  const endTour = useCallback(() => {
    setTourStep(null)
    try {
      window.localStorage.setItem(TOUR_STORAGE_KEY, '1')
    } catch {
      // ignore
    }
  }, [])

  const redactionCount = shapes.filter((s) => s.tool === 'redact').length
  const hasUnsavedWork =
    presetId !== 'natural' || shapes.length > 0 || findings.length > 0 || caseInfo.caseId.length > 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[70] flex flex-col"
      style={{ background: 'color-mix(in oklab, var(--sp-bg-0) 94%, transparent)', backdropFilter: 'blur(36px) saturate(1.3)' }}
    >
      {/* Title bar — enterprise glass command bar. Explicit Cancel/Done are
          still the only ways to close the editor; everything else here is
          status (QC, lock/signature) or quick access (palette, shortcuts). */}
      <div
        className="flex items-center justify-between gap-3 mx-3 mt-3 mb-2 px-3.5 py-2.5 rounded-[18px] glass-panel shrink-0"
        style={{ marginTop: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onClose}
            aria-label="Cancel"
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 glass-btn"
            style={{ color: 'var(--sp-text-dim)' }}
          >
            <X size={14} />
          </button>
          <div className="w-px h-6 shrink-0" style={{ background: 'var(--lg-border)' }} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Aperture size={13} className="shrink-0" style={{ color: 'var(--sp-primary)' }} />
              <p className="text-[13.5px] font-bold tracking-tight truncate" style={{ color: 'var(--sp-text)' }}>
                Clinical &amp; Biotech Imaging Studio
              </p>
            </div>
            <p className="text-[10.5px] truncate" style={{ color: 'var(--sp-text-faint)' }}>
              {title} · {caseInfo.modality}
              {hasUnsavedWork ? ' · Edited' : ''}
              {redactionCount > 0 ? ` · ${redactionCount} de-identified` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* QC badge — live capture-quality readout. Full row, desktop only. */}
          {qc && (
            <div
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full glass-btn text-[10.5px] font-semibold"
              style={{
                color: qc.verdict === 'good' ? 'var(--qc-good)' : qc.verdict === 'warn' ? 'var(--qc-warn)' : 'var(--qc-bad)',
              }}
              title={qc.notes.join(' ') || 'Capture quality looks good'}
            >
              <span
                className="w-1.5 h-1.5 rounded-full qc-dot"
                style={{ background: qc.verdict === 'good' ? 'var(--qc-good)' : qc.verdict === 'warn' ? 'var(--qc-warn)' : 'var(--qc-bad)' }}
              />
              {qc.verdict === 'poor' ? <AlertTriangle size={11} /> : <Gauge size={11} />}
              QC {qc.overall}
            </div>
          )}

          {/* Lock / signature badge — full row, desktop only. */}
          {locked ? (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10.5px] font-semibold" style={{ background: 'rgba(var(--sig-rgb),0.14)', border: '1px solid rgba(var(--sig-rgb),0.4)', color: 'var(--sig-color)' }}>
              <Lock size={11} className="sig-pulse rounded-full" /> Signed &amp; locked
            </div>
          ) : null}

          <button
            onClick={() => setPaletteOpen(true)}
            aria-label="Command palette"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full glass-btn text-[10.5px] font-semibold"
            style={{ color: 'var(--sp-text-dim)' }}
          >
            <Command size={12} /> K
          </button>
          {onChat && (
            <button
              onClick={() => onChat(caseInfo)}
              aria-label="Chat about this"
              className="hidden md:flex w-8 h-8 rounded-full items-center justify-center glass-btn"
              style={{ color: 'var(--sp-text-dim)' }}
            >
              <MessageSquare size={14} />
            </button>
          )}
          <button
            onClick={handleShare}
            aria-label="Share"
            className="hidden md:flex w-8 h-8 rounded-full items-center justify-center glass-btn"
            style={{ color: 'var(--sp-text-dim)' }}
          >
            <Share2 size={14} />
          </button>
          <button
            onClick={() => setShowShortcuts((v) => !v)}
            aria-label="Help"
            className="hidden md:flex w-8 h-8 rounded-full items-center justify-center glass-btn"
            style={{ color: 'var(--sp-text-dim)' }}
          >
            <Keyboard size={14} />
          </button>

          {/* Mobile/tablet: everything above folds into one "More" menu
              instead of vanishing — same actions and status badges as the
              desktop row, just one tap away so nothing is lost on a
              phone-sized screen. */}
          <div className="relative md:hidden">
            <button
              onClick={() => setMoreOpen((v) => !v)}
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              className={[
                'w-8 h-8 rounded-full flex items-center justify-center glass-btn transition-colors',
                moreOpen ? 'text-[var(--sp-text)]' : '',
              ].join(' ')}
              style={{ color: moreOpen ? undefined : 'var(--sp-text-dim)' }}
            >
              <MoreVertical size={15} />
              {(qc || locked) && !moreOpen && (
                <span
                  className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                  style={{
                    background: locked
                      ? 'var(--sig-color)'
                      : qc?.verdict === 'good' ? 'var(--qc-good)' : qc?.verdict === 'warn' ? 'var(--qc-warn)' : 'var(--qc-bad)',
                  }}
                />
              )}
            </button>

            <AnimatePresence>
              {moreOpen && (
                <>
                  {/* Bottom sheet — thumb-reachable, safe-area aware, and
                      roomy instead of a 224px list pinned near the screen
                      edge. Every motion on this sheet — enter, exit, tap
                      feedback, and the drag-to-dismiss release — is a
                      single-pass tween/spring tuned to critical damping
                      (no overshoot), so nothing ever wobbles or settles
                      in more than one pass on a large `backdrop-blur`
                      surface. */}
                  <motion.div
                    className="fixed inset-0 z-40 bg-black/55"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    onClick={() => setMoreOpen(false)}
                  />
                  <motion.div
                    role="menu"
                    drag="y"
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: 0, bottom: 0.45 }}
                    dragTransition={{ bounceStiffness: 700, bounceDamping: 50 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.y > 90 || info.velocity.y > 500) setMoreOpen(false)
                    }}
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                    className="fixed inset-x-0 bottom-0 z-50 rounded-t-[20px] overflow-hidden touch-none border-t"
                    style={{
                      paddingBottom: 'var(--sp-safe-bottom)',
                      background: 'color-mix(in oklab, var(--sp-bg-1) 92%, transparent)',
                      backdropFilter: 'blur(28px) saturate(1.4)',
                      borderColor: 'var(--lg-border)',
                      boxShadow: '0 -12px 40px rgba(0,0,0,0.35)',
                    }}
                  >
                    {/* Grab handle doubles as the drag target above. */}
                    <div className="flex justify-center pt-2.5 pb-1.5">
                      <span className="w-8 h-[3px] rounded-full" style={{ background: 'var(--sp-text-faint)', opacity: 0.4 }} />
                    </div>

                    <div className="flex items-center justify-between px-4 pt-1 pb-3">
                      <span className="text-[13px] font-semibold tracking-tight" style={{ color: 'var(--sp-text)' }}>More actions</span>
                      {(qc || locked) && (
                        <div className="flex items-center gap-1.5">
                          {qc && (
                            <span
                              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                              style={{
                                background: qc.verdict === 'good' ? 'rgba(52,211,153,0.12)' : qc.verdict === 'warn' ? 'rgba(245,166,35,0.12)' : 'rgba(240,85,76,0.12)',
                                color: qc.verdict === 'good' ? 'var(--qc-good)' : qc.verdict === 'warn' ? 'var(--qc-warn)' : 'var(--qc-bad)',
                              }}
                            >
                              {qc.verdict === 'poor' ? <AlertTriangle size={12} /> : <Gauge size={12} />}
                              QC {qc.overall}
                            </span>
                          )}
                          {locked && (
                            <span
                              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                              style={{ background: 'rgba(var(--sig-rgb),0.14)', color: 'var(--sig-color)' }}
                            >
                              <Lock size={12} className="sig-pulse rounded-full" /> Locked
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Icon-grid, iOS-share-sheet style — a tap target is a
                        whole tile (icon + label), not a thin text row, so
                        it reads and hits better one-handed. Tap feedback is
                        a quick, critically-damped press (no overshoot). */}
                    <div className={`grid gap-2 px-4 pb-2 ${onChat ? 'grid-cols-4' : 'grid-cols-3'}`}>
                      {[
                        { icon: Command, label: 'Palette', onClick: () => { setMoreOpen(false); setPaletteOpen(true) } },
                        ...(onChat ? [{ icon: MessageSquare, label: 'Chat', onClick: () => { setMoreOpen(false); onChat(caseInfo) } }] : []),
                        { icon: Share2, label: 'Share', onClick: () => { setMoreOpen(false); handleShare() } },
                        { icon: Keyboard, label: 'Shortcuts', onClick: () => { setMoreOpen(false); setShowShortcuts(true) } },
                      ].map(({ icon: ActionIcon, label, onClick }) => (
                        <motion.button
                          key={label}
                          whileTap={{ scale: 0.96 }}
                          transition={{ duration: 0.12, ease: 'easeOut' }}
                          onClick={onClick}
                          className="flex flex-col items-center gap-1.5 py-3 rounded-[14px] transition-colors active:bg-white/[0.06]"
                        >
                          <span
                            className="w-11 h-11 rounded-[13px] flex items-center justify-center"
                            style={{ background: 'var(--sp-surface)', border: '1px solid var(--sp-border)' }}
                          >
                            <ActionIcon size={17} style={{ color: 'var(--sp-text)' }} />
                          </span>
                          <span className="text-[10.5px] font-medium" style={{ color: 'var(--sp-text-dim)' }}>{label}</span>
                        </motion.button>
                      ))}
                    </div>

                    <div className="px-4 pb-2 pt-2" style={{ borderTop: '1px solid var(--lg-border)' }}>
                      <button
                        onClick={() => setMoreOpen(false)}
                        className="w-full flex items-center justify-center py-3 mt-1 rounded-[12px] text-[13.5px] font-semibold transition-colors active:bg-white/[0.06]"
                        style={{ color: 'var(--sp-text-dim)', background: 'var(--sp-surface)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={reset}
            disabled={locked}
            aria-label="Reset edits"
            className="w-8 h-8 rounded-full flex items-center justify-center glass-btn disabled:opacity-30"
            style={{ color: 'var(--sp-text-dim)' }}
          >
            <RotateCcw size={13} />
          </button>
          <Magnetic strength={9} className="ml-1">
            <motion.button
              ref={doneBtnRef}
              onClick={handleDone}
              whileHover={{ scale: 1.045 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 420, damping: 20 }}
              className="px-4 py-1.5 rounded-full text-[13px] font-semibold glass-btn-primary"
            >
              Done
            </motion.button>
          </Magnetic>
        </div>
      </div>

      {/* Command palette (⌘K) — enterprise quick-action launcher */}
      <AnimatePresence>
        {paletteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-start justify-center pt-[14vh] px-4"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setPaletteOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-[18px] glass-panel-strong overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--lg-border)' }}>
                <Command size={14} style={{ color: 'var(--sp-text-faint)' }} />
                <input
                  autoFocus
                  value={paletteQuery}
                  onChange={(e) => setPaletteQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setPaletteOpen(false)}
                  placeholder="Jump to a section or run an action…"
                  className="flex-1 bg-transparent outline-none text-[13.5px]"
                  style={{ color: 'var(--sp-text)' }}
                />
                <kbd className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: 'var(--sp-surface)', color: 'var(--sp-text-faint)' }}>Esc</kbd>
              </div>
              <div className="max-h-72 overflow-y-auto p-1.5 no-scrollbar">
                {filteredPaletteActions.length === 0 && (
                  <p className="text-[12px] text-center py-6" style={{ color: 'var(--sp-text-faint)' }}>No matching actions</p>
                )}
                {filteredPaletteActions.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      a.run()
                      setPaletteOpen(false)
                      setPaletteQuery('')
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12.5px] font-medium text-left transition-colors"
                    style={{ color: 'var(--sp-text)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--sp-surface-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Zap size={12} style={{ color: 'var(--sp-primary)' }} />
                    {a.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shortcuts cheat-sheet */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="absolute right-4 top-14 z-20 w-64 rounded-2xl border p-3.5 text-[11.5px] shadow-2xl"
            style={{ background: 'var(--sp-bg-1)', borderColor: 'var(--sp-border)', color: 'var(--sp-text-dim)' }}
          >
            <p className="text-[12px] font-semibold mb-2" style={{ color: 'var(--sp-text)' }}>
              Shortcuts
            </p>
            <ul className="space-y-1.5">
              {TOOL_META.map((t) => (
                <li key={t.id} className="flex items-center justify-between">
                  <span>{t.label}</span>
                  <kbd className="px-1.5 py-0.5 rounded-md border" style={{ borderColor: 'var(--sp-border)' }}>{t.key}</kbd>
                </li>
              ))}
              <li className="flex items-center justify-between">
                <span>Undo markup</span>
                <kbd className="px-1.5 py-0.5 rounded-md border" style={{ borderColor: 'var(--sp-border)' }}>⌘/Ctrl Z</kbd>
              </li>
              <li className="flex items-center justify-between">
                <span>Cancel active tool</span>
                <kbd className="px-1.5 py-0.5 rounded-md border" style={{ borderColor: 'var(--sp-border)' }}>Esc</kbd>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity rail — enterprise glass segmented control, the one and
          only way to switch sections. */}
      <div ref={segmentRef} className="px-3 pb-2.5 shrink-0">
        <div
          className="flex items-center gap-1 p-1.5 rounded-[16px] overflow-x-auto no-scrollbar glass-rail"
        >
          {PANEL_TABS.map((t) => (
            <button
              key={t.id}
              ref={t.id === 'ai' ? aiTabRef : undefined}
              onClick={() => changeTab(t.id)}
              className="relative flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] text-[12.5px] font-semibold shrink-0 transition-colors"
              style={{ color: tab === t.id ? '#fff' : 'var(--sp-text-dim)' }}
            >
              {tab === t.id && (
                <motion.span
                  layoutId="segment-pill"
                  transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                  className="absolute inset-0 rounded-[12px] -z-10"
                  style={{ background: 'linear-gradient(180deg, rgba(var(--sp-primary-rgb),0.95), rgba(var(--sp-accent-rgb),0.95))', boxShadow: '0 6px 18px rgba(var(--sp-primary-rgb),0.35)' }}
                />
              )}
              <t.icon size={13} /> {t.label}
            </button>
          ))}
          <div className="flex-1" />
          {locked ? (
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-[12px] text-[10.5px] font-semibold shrink-0" style={{ color: 'var(--sig-color)' }}>
              <Lock size={11} /> Locked
            </div>
          ) : qc ? (
            <div
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-[12px] text-[10.5px] font-semibold shrink-0"
              style={{ color: qc.verdict === 'good' ? 'var(--qc-good)' : qc.verdict === 'warn' ? 'var(--qc-warn)' : 'var(--qc-bad)' }}
            >
              <Gauge size={11} /> QC {qc.overall}
            </div>
          ) : null}
        </div>
      </div>

      {/* Body: canvas up top (or left on wide screens), the active
          section's controls below/beside it as a rounded card — Apple
          Photos' editing-sheet layout rather than a desktop IDE.

          On mobile the canvas column is capped at max-h-[40vh] (shrink-0,
          not flex-1) and the section card is flex-1 min-h-0 — the inverse
          of the old flex-1/shrink-0 split. That matters because the
          section card's own scroll region only activates once its parent
          has a *bounded* height to scroll within; with shrink-0 (no
          bound) it just grew to fit all its content and got silently
          clipped by this row's overflow-hidden, which is what made a
          long tab like Case look like its fields were overlapping near
          the bottom. Desktop is unaffected: lg:flex-none lg:w-[400px]
          lg:h-full restores the fixed-width, full-height column. */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden px-3 gap-3 pb-3">
        <div className="shrink-0 max-h-[40vh] lg:max-h-none lg:flex-1 lg:min-h-0 flex flex-col gap-3">
          <div
            ref={canvasWrapRef}
            onWheel={handleCanvasWheel}
            onPointerDown={handleZoomPanStart}
            onPointerMove={handleZoomPanMove}
            onPointerUp={handleZoomPanEnd}
            onPointerLeave={handleZoomPanEnd}
            onDoubleClick={resetZoom}
            className="flex-1 min-h-0 flex items-center justify-center overflow-hidden rounded-[24px] glass-panel relative"
            style={{ cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
          >
            {/* Zoom readout + quick reset — only appears once zoomed in,
                so the default view stays uncluttered. */}
            <AnimatePresence>
              {zoom > 1 && (
                <motion.button
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  onClick={resetZoom}
                  className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full glass-btn text-[10.5px] font-semibold"
                  style={{ color: 'var(--sp-text-dim)' }}
                >
                  <ZoomOut size={11} /> {Math.round(zoom * 100)}% · Reset
                </motion.button>
              )}
            </AnimatePresence>
            <div
              className={`relative max-h-full max-w-full overflow-hidden rounded-[28px] shadow-[0_24px_60px_rgba(0,0,0,0.35)] ${aspectClass}`}
            >
              <motion.div
                className="relative inline-block"
                animate={{ x: pan.x, y: pan.y, scale: zoom }}
                transition={isPanning ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
                style={{ transformOrigin: 'center center' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={photo}
                  alt={title}
                  style={{ filter: showOriginal ? 'none' : filterCss }}
                  className="max-h-[34vh] lg:max-h-[62vh] w-auto h-auto object-contain block"
                  onLoad={(e) => {
                    const t = e.currentTarget
                    setNatural({ w: t.naturalWidth, h: t.naturalHeight })
                    resetZoom()
                    try {
                      setQc(analyzeImageQuality(t))
                    } catch {
                      // QC is best-effort — never block the editor on it.
                    }
                  }}
                />
                {!showOriginal && adjustments.vignette > 0 && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      boxShadow: `inset 0 0 ${adjustments.vignette * 1.6}px ${adjustments.vignette * 0.9}px rgba(0,0,0,${Math.min(0.75, adjustments.vignette / 110)})`,
                    }}
                  />
                )}

                {/* Markup overlay — coordinates are natural-pixel based, so the
                    viewBox matches naturalWidth/Height and the SVG just scales
                    with CSS to whatever the image renders at. */}
                {natural.w > 0 && (
                  <svg
                    ref={overlayRef}
                    viewBox={`0 0 ${natural.w} ${natural.h}`}
                    className={[
                      'absolute inset-0 w-full h-full touch-none',
                      activeTool || calibrating ? 'cursor-crosshair' : 'pointer-events-none',
                    ].join(' ')}
                    onPointerDown={activeTool || calibrating ? handlePointerDown : undefined}
                    onPointerMove={activeTool || calibrating ? handlePointerMove : undefined}
                    onPointerUp={activeTool || calibrating ? handlePointerUp : undefined}
                  >
                    {[...shapes, ...(draft ? [draft] : [])].map((s) => (
                      <ShapeRender key={s.id} shape={s} pxPerMm={pxPerMm} unit={unit} strokeWidth={Math.max(2, natural.w * 0.003)} />
                    ))}
                    {(calibration || calibDraft) && (
                      <line
                        x1={(calibDraft ?? calibration)!.x1}
                        y1={(calibDraft ?? calibration)!.y1}
                        x2={(calibDraft ?? calibration)!.x2}
                        y2={(calibDraft ?? calibration)!.y2}
                        stroke="#facc15"
                        strokeDasharray={`${natural.w * 0.006} ${natural.w * 0.004}`}
                        strokeWidth={Math.max(1.5, natural.w * 0.002)}
                      />
                    )}
                    {showScaleBar && pxPerMm && (
                      <ScaleBarSvg pxPerMm={pxPerMm} valueMm={scaleBarValueMm} unit={unit} natural={natural} />
                    )}
                  </svg>
                )}

                {/* Inline text-label input, positioned at the tapped point */}
                {textPrompt && natural.w > 0 && (
                  <div
                    className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${(textPrompt.x / natural.w) * 100}%`, top: `${(textPrompt.y / natural.h) * 100}%` }}
                  >
                    <input
                      autoFocus
                      value={textPrompt.value}
                      onChange={(e) => setTextPrompt((p) => (p ? { ...p, value: e.target.value } : p))}
                      onKeyDown={(e) => e.key === 'Enter' && commitTextPrompt()}
                      onBlur={commitTextPrompt}
                      placeholder="Label…"
                      className="px-2 py-1 rounded-md bg-black/90 border border-[var(--sp-primary)] text-white text-[12px] w-32 outline-none"
                    />
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          {/* Canvas toolbar: aspect + original/edited compare, resolution readout */}
          <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
            {ASPECTS.map((a) => (
              <motion.button
                key={a.id}
                whileHover={{ scale: 1.06, y: -1 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                onClick={() => setAspect(a.id)}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[12px] font-medium glass-btn"
                style={
                  aspect === a.id
                    ? { background: 'linear-gradient(180deg, rgba(var(--sp-primary-rgb),0.95), rgba(var(--sp-accent-rgb),0.95))', borderColor: 'transparent', color: '#fff' }
                    : { color: 'var(--sp-text-dim)' }
                }
              >
                <Crop size={11} /> {a.label}
              </motion.button>
            ))}
            <div className="w-px h-4 mx-1" style={{ background: 'var(--sp-border)' }} />
            <motion.button
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              onClick={() => setShowOriginal((v) => !v)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold glass-btn"
              style={
                showOriginal
                  ? { background: 'linear-gradient(180deg, rgba(var(--sp-primary-rgb),0.95), rgba(var(--sp-accent-rgb),0.95))', borderColor: 'transparent', color: '#fff' }
                  : { color: 'var(--sp-text-dim)' }
              }
            >
              <Columns2 size={12} /> {showOriginal ? 'Viewing Original' : 'Compare Original'}
            </motion.button>
            {natural.w > 0 && (
              <span className="text-[11px] font-mono ml-1" style={{ color: 'var(--sp-text-faint)' }}>
                {natural.w}×{natural.h}px
              </span>
            )}
            {zoom === 1 && natural.w > 0 && (
              <span className="hidden lg:flex items-center gap-1 text-[10.5px] ml-1" style={{ color: 'var(--sp-text-faint)' }}>
                <ZoomOut size={10} className="rotate-180" /> Scroll to zoom
              </span>
            )}
          </div>
        </div>

        {/* Section card — enterprise glass panel holding grouped content
            for whichever segment is active. */}
        <div
          className="flex-1 min-h-0 lg:flex-none lg:w-[400px] lg:h-full flex flex-col rounded-[24px] overflow-hidden glass-panel"
        >
          <div className={`flex-1 min-h-0 overflow-y-auto px-4 py-4 no-scrollbar ${locked && tab !== 'export' ? 'opacity-60 pointer-events-none' : ''}`}>
            {locked && tab !== 'export' && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl text-[11px] font-medium" style={{ background: 'rgba(var(--sig-rgb),0.12)', border: '1px solid rgba(var(--sig-rgb),0.3)', color: 'var(--sig-color)' }}>
                <Lock size={12} /> Record is signed &amp; locked — unlock from Export to edit.
              </div>
            )}
            <AnimatePresence mode="wait" custom={tabDirection}>
              <TabPane key={tab} direction={tabDirection}>
                {tab === 'styles' && (
                  <div className="flex flex-col gap-3">
                    <PresetRail
                      heading="Clinical"
                      presets={PRESETS.filter((p) => p.category === 'clinical')}
                      presetId={presetId}
                      photo={photo}
                      onSelect={applyPreset}
                />
                <PresetRail
                  heading="Standard"
                  presets={PRESETS.filter((p) => p.category === 'general')}
                  presetId={presetId}
                  photo={photo}
                  onSelect={applyPreset}
                />
              </div>
            )}

            {tab === 'adjust' && (
              <div className="flex flex-col gap-3">
                {ADJUST_ROWS.map((row) => (
                  <div key={row.key} className="flex items-center gap-3">
                    <span className="w-[74px] shrink-0 text-[11.5px] font-medium" style={{ color: 'var(--sp-text-dim)' }}>
                      {row.label}
                    </span>
                    <input
                      type="range"
                      min={row.min}
                      max={row.max}
                      value={adjustments[row.key]}
                      onChange={(e) => setAdjustments((a) => ({ ...a, [row.key]: Number(e.target.value) }))}
                      className="flex-1 accent-[var(--sp-primary)]"
                    />
                    <span className="w-9 shrink-0 text-right text-[10.5px] font-mono tabular-nums" style={{ color: 'var(--sp-text-faint)' }}>
                      {adjustments[row.key]}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {tab === 'markup' && (
              <div className="flex flex-col gap-3">
                {/* Two-row grid (not a horizontal scroller) — every tool is
                    visible at a glance instead of hidden off-screen behind
                    a swipe, which was easy to miss on first use. 4 columns
                    puts the 5 tools + Undo + Clear across exactly two rows. */}
                <div className="grid grid-cols-4 gap-2">
                  {TOOL_META.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setCalibrating(false)
                        setActiveTool((cur) => (cur === t.id ? null : t.id))
                      }}
                      className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-[11.5px] font-semibold border transition-colors truncate"
                      style={
                        activeTool === t.id
                          ? { background: 'var(--sp-primary)', borderColor: 'var(--sp-primary)', color: '#fff' }
                          : { background: 'var(--sp-surface)', borderColor: 'var(--sp-border)', color: 'var(--sp-text-dim)' }
                      }
                    >
                      <t.icon size={13} className="shrink-0" />
                      <span className="truncate">{t.label}</span>
                    </button>
                  ))}
                  <button
                    onClick={undoLastShape}
                    disabled={shapes.length === 0}
                    className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-[11.5px] font-semibold border disabled:opacity-30"
                    style={{ background: 'var(--sp-surface)', borderColor: 'var(--sp-border)', color: 'var(--sp-text-dim)' }}
                  >
                    <Undo2 size={13} className="shrink-0" /> Undo
                  </button>
                  <button
                    onClick={clearShapes}
                    disabled={shapes.length === 0}
                    className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-[11.5px] font-semibold border disabled:opacity-30"
                    style={{ background: 'var(--sp-surface)', borderColor: 'var(--sp-border)', color: 'var(--sp-text-dim)' }}
                  >
                    <Trash2 size={13} className="shrink-0" /> Clear
                  </button>
                </div>
                {activeTool === 'measure' && !pxPerMm && (
                  <p className="text-[10.5px] leading-snug" style={{ color: 'var(--sp-warning)' }}>
                    No scale set yet — measurements will show in pixels. Set a scale reference in the Case tab for {unit} readouts.
                  </p>
                )}
                {activeTool === 'redact' && (
                  <p className="text-[10.5px] leading-snug" style={{ color: 'var(--sp-text-faint)' }}>
                    Draws an opaque bar over the selected area — for hiding faces, ID bands, or other identifying
                    details before sharing or filing a photo for teaching or research use.
                  </p>
                )}
                <p className="text-[10.4px] leading-snug flex items-start gap-1.5" style={{ color: 'var(--sp-text-faint)' }}>
                  <Info size={11} className="mt-0.5 shrink-0" />
                  Markup and de-identification are documentation aids, not a certified anonymization or diagnostic
                  tool — follow your institution&apos;s policy for what a fully de-identified image requires.
                </p>
              </div>
            )}

            {tab === 'ai' && (
              <div className="flex flex-col gap-3">
                <div
                  className="rounded-[var(--sp-radius-md)] border px-3 py-2.5 flex items-start gap-2"
                  style={{ background: 'color-mix(in oklab, var(--sp-warning) 10%, transparent)', borderColor: 'var(--sp-warning)' }}
                >
                  <ShieldAlert size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--sp-warning)' }} />
                  <p className="text-[10.8px] leading-snug" style={{ color: 'var(--sp-text-dim)' }}>
                    Assistive only, not a diagnostic device. Suggestions are illustrative and unreviewed until a
                    qualified clinician explicitly accepts each one below.
                  </p>
                </div>

                <button
                  onClick={runAiPreRead}
                  disabled={aiRunning}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12.5px] font-semibold border transition-colors disabled:opacity-60"
                  style={{ background: 'var(--sp-surface)', borderColor: 'var(--sp-border)', color: 'var(--sp-text)' }}
                >
                  {aiRunning ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} style={{ color: 'var(--sp-primary)' }} />}
                  {aiRunning ? 'Running pre-read…' : 'Run AI pre-read for this modality'}
                </button>

                {aiSuggestions && aiSuggestions.length === 0 && (
                  <p className="text-[11px] text-center py-2" style={{ color: 'var(--sp-text-faint)' }}>
                    No flagged suggestions for this modality.
                  </p>
                )}
                {aiSuggestions && aiSuggestions.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {aiSuggestions.map((s) => (
                      <div
                        key={s.label}
                        className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2"
                        style={{ borderColor: 'var(--sp-border)', background: 'var(--sp-surface)' }}
                      >
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium truncate" style={{ color: 'var(--sp-text)' }}>{s.label}</p>
                          <p className="text-[10.5px]" style={{ color: 'var(--sp-text-faint)' }}>
                            {Math.round(s.confidence * 100)}% confidence · {s.severity}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => acceptAiSuggestion(s)}
                            aria-label="Accept suggestion"
                            className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ background: 'color-mix(in oklab, var(--sp-success) 18%, transparent)', color: 'var(--sp-success)' }}
                          >
                            <CheckCircle2 size={15} />
                          </button>
                          <button
                            onClick={() => dismissAiSuggestion(s.label)}
                            aria-label="Dismiss suggestion"
                            className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ background: 'var(--sp-surface-hover)', color: 'var(--sp-text-faint)' }}
                          >
                            <X size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <FindingsEditor findings={findings} onAdd={addFinding} onRemove={removeFinding} onUpdate={updateFinding} quick={QUICK_FINDINGS[caseInfo.modality] ?? DEFAULT_QUICK_FINDINGS} />
              </div>
            )}

            {tab === 'case' && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2.5">
                  <LabeledInput
                    label="Case / specimen ID"
                    value={caseInfo.caseId}
                    onChange={(v) => setCaseInfo((c) => ({ ...c, caseId: v }))}
                    placeholder="e.g. de-identified accession #"
                  />
                  <LabeledInput
                    label="Body site / source"
                    value={caseInfo.bodySite}
                    onChange={(v) => setCaseInfo((c) => ({ ...c, bodySite: v }))}
                    placeholder="e.g. left lower leg"
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-[10.5px] font-medium" style={{ color: 'var(--sp-text-faint)' }}>Modality</span>
                    <select
                      value={caseInfo.modality}
                      onChange={(e) => setCaseInfo((c) => ({ ...c, modality: e.target.value as CaseInfo['modality'] }))}
                      className="px-2.5 py-2 rounded-lg border text-[12px] outline-none"
                      style={{ background: 'var(--sp-surface)', borderColor: 'var(--sp-border)', color: 'var(--sp-text)' }}
                    >
                      {MODALITIES.map((m) => (
                        <option key={m} value={m} style={{ background: 'var(--sp-bg-1)' }}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <LabeledInput
                    label="Captured by (name / initials)"
                    value={caseInfo.capturedBy}
                    onChange={(v) => setCaseInfo((c) => ({ ...c, capturedBy: v }))}
                    placeholder="initials"
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-[10.5px] font-medium" style={{ color: 'var(--sp-text-faint)' }}>Role</span>
                    <select
                      value={caseInfo.role ?? ''}
                      onChange={(e) => setCaseInfo((c) => ({ ...c, role: (e.target.value || undefined) as CaseInfo['role'] }))}
                      className="px-2.5 py-2 rounded-lg border text-[12px] outline-none"
                      style={{ background: 'var(--sp-surface)', borderColor: 'var(--sp-border)', color: 'var(--sp-text)' }}
                    >
                      <option value="" style={{ background: 'var(--sp-bg-1)' }}>Select role…</option>
                      {ROLES.map((r) => (
                        <option key={r} value={r} style={{ background: 'var(--sp-bg-1)' }}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="flex flex-col gap-1">
                  <span className="flex items-center justify-between text-[10.5px] font-medium" style={{ color: 'var(--sp-text-faint)' }}>
                    Notes
                    {voiceSupported && (
                      <button
                        type="button"
                        onClick={toggleDictation}
                        disabled={locked}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${dictating ? 'sig-pulse' : ''}`}
                        style={
                          dictating
                            ? { background: 'rgba(var(--sp-danger-rgb),0.16)', color: 'var(--sp-danger)' }
                            : { background: 'var(--sp-surface)', color: 'var(--sp-text-faint)' }
                        }
                      >
                        {dictating ? <MicOff size={10} /> : <Mic size={10} />}
                        {dictating ? 'Stop' : 'Dictate'}
                      </button>
                    )}
                  </span>
                  <input
                    value={caseInfo.notes}
                    onChange={(e) => setCaseInfo((c) => ({ ...c, notes: e.target.value }))}
                    placeholder="Optional context for the record"
                    className="px-2.5 py-2 rounded-lg border text-[12px] outline-none"
                    style={{ background: 'var(--sp-surface)', borderColor: 'var(--sp-border)', color: 'var(--sp-text)' }}
                  />
                </label>

                <SectionHeading icon={ClipboardList} label="Institution & protocol" />
                <div className="grid grid-cols-2 gap-2.5">
                  <LabeledInput
                    label="Institution"
                    value={caseInfo.institution ?? ''}
                    onChange={(v) => setCaseInfo((c) => ({ ...c, institution: v }))}
                    placeholder="Hospital / university / lab"
                  />
                  <LabeledInput
                    label="Department / ward / PI group"
                    value={caseInfo.department ?? ''}
                    onChange={(v) => setCaseInfo((c) => ({ ...c, department: v }))}
                    placeholder="e.g. Dermatology, Micro Lab 3"
                  />
                </div>
                <LabeledInput
                  label="Protocol / IRB / study ID"
                  value={caseInfo.protocolId ?? ''}
                  onChange={(v) => setCaseInfo((c) => ({ ...c, protocolId: v }))}
                  placeholder="For research use — IRB or study accession"
                />

                {(LAB_MODALITIES.has(caseInfo.modality) || caseInfo.modality === 'Other') && (
                  <>
                    <SectionHeading icon={ShieldAlert} label="Specimen & biosafety" />
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10.5px] font-medium" style={{ color: 'var(--sp-text-faint)' }}>Specimen type</span>
                        <select
                          value={caseInfo.specimenType ?? ''}
                          onChange={(e) => setCaseInfo((c) => ({ ...c, specimenType: (e.target.value || undefined) as CaseInfo['specimenType'] }))}
                          className="px-2.5 py-2 rounded-lg border text-[12px] outline-none"
                          style={{ background: 'var(--sp-surface)', borderColor: 'var(--sp-border)', color: 'var(--sp-text)' }}
                        >
                          <option value="" style={{ background: 'var(--sp-bg-1)' }}>Select…</option>
                          {SPECIMEN_TYPES.map((s) => (
                            <option key={s} value={s} style={{ background: 'var(--sp-bg-1)' }}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10.5px] font-medium" style={{ color: 'var(--sp-text-faint)' }}>Storage condition</span>
                        <select
                          value={caseInfo.storageCondition ?? ''}
                          onChange={(e) => setCaseInfo((c) => ({ ...c, storageCondition: (e.target.value || undefined) as CaseInfo['storageCondition'] }))}
                          className="px-2.5 py-2 rounded-lg border text-[12px] outline-none"
                          style={{ background: 'var(--sp-surface)', borderColor: 'var(--sp-border)', color: 'var(--sp-text)' }}
                        >
                          <option value="" style={{ background: 'var(--sp-bg-1)' }}>Select…</option>
                          {STORAGE_CONDITIONS.map((s) => (
                            <option key={s} value={s} style={{ background: 'var(--sp-bg-1)' }}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10.5px] font-medium" style={{ color: 'var(--sp-text-faint)' }}>Biosafety level</span>
                      <div className="flex gap-1.5">
                        {BIOSAFETY_LEVELS.map((b) => (
                          <button
                            key={b}
                            onClick={() => setCaseInfo((c) => ({ ...c, biosafetyLevel: b }))}
                            className="flex-1 py-1.5 rounded-lg text-[10.5px] font-semibold border"
                            style={
                              caseInfo.biosafetyLevel === b
                                ? { background: 'var(--sp-danger)', borderColor: 'var(--sp-danger)', color: '#fff' }
                                : { background: 'var(--sp-surface)', borderColor: 'var(--sp-border)', color: 'var(--sp-text-dim)' }
                            }
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {(INSTRUMENT_MODALITIES.has(caseInfo.modality) || caseInfo.modality === 'Other') && (
                  <>
                    <SectionHeading icon={SlidersHorizontal} label="Instrument & acquisition" />
                    <div className="grid grid-cols-2 gap-2.5">
                      <LabeledInput
                        label="Instrument / scope model"
                        value={caseInfo.instrument ?? ''}
                        onChange={(v) => setCaseInfo((c) => ({ ...c, instrument: v }))}
                        placeholder="e.g. Olympus BX53"
                      />
                      <LabeledInput
                        label="Magnification / objective"
                        value={caseInfo.magnification ?? ''}
                        onChange={(v) => setCaseInfo((c) => ({ ...c, magnification: v }))}
                        placeholder="e.g. 40x oil"
                      />
                    </div>
                    <LabeledInput
                      label="Stain / prep method"
                      value={caseInfo.stain ?? ''}
                      onChange={(v) => setCaseInfo((c) => ({ ...c, stain: v }))}
                      placeholder="e.g. H&E, Gram stain, DAPI"
                    />
                  </>
                )}

                <SectionHeading icon={Tag} label="Coding tags" />
                <div className="flex flex-wrap gap-1.5">
                  {codeTags.map((t) => (
                    <span
                      key={t}
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-[10.5px] font-medium"
                      style={{ background: 'var(--sp-surface)', border: '1px solid var(--sp-border)', color: 'var(--sp-text-dim)' }}
                    >
                      {t}
                      <button onClick={() => setCodeTags((c) => c.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={codeDraft}
                    onChange={(e) => setCodeDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCodeTag()}
                    placeholder="Free-text ICD-10 / SNOMED CT tag…"
                    className="flex-1 px-2.5 py-2 rounded-lg border text-[12px] outline-none"
                    style={{ background: 'var(--sp-surface)', borderColor: 'var(--sp-border)', color: 'var(--sp-text)' }}
                  />
                  <button
                    onClick={addCodeTag}
                    className="px-3 rounded-lg border flex items-center justify-center"
                    style={{ background: 'var(--sp-surface)', borderColor: 'var(--sp-border)', color: 'var(--sp-text)' }}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <SectionHeading icon={Ruler} label="Measurement scale" />
                <div className="flex items-center gap-1.5">
                  {(['mm', 'cm', 'µm'] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => setUnit(u)}
                      className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold border"
                      style={
                        unit === u
                          ? { background: 'var(--sp-primary)', borderColor: 'var(--sp-primary)', color: '#fff' }
                          : { background: 'var(--sp-surface)', borderColor: 'var(--sp-border)', color: 'var(--sp-text-dim)' }
                      }
                    >
                      {u}
                    </button>
                  ))}
                </div>
                <p className="text-[10.4px] -mt-1.5" style={{ color: 'var(--sp-text-faint)' }}>
                  Use µm for microscopy fields of view, mm for wounds/lesions, cm for larger gross specimens.
                </p>
                <div
                  className="flex items-center justify-between rounded-xl border px-3 py-2.5"
                  style={{ borderColor: 'var(--sp-border)', background: 'var(--sp-surface)' }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Ruler size={14} className="shrink-0" style={{ color: 'var(--sp-primary)' }} />
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--sp-text)' }}>
                        {pxPerMm ? `Scale set — ${(pxPerMm * UNIT_TO_MM[unit]).toFixed(2)} px/${unit}` : 'No scale reference set'}
                      </p>
                      <p className="text-[10.5px] truncate" style={{ color: 'var(--sp-text-faint)' }}>
                        Mark two points against a ruler, stage micrometer, coin, or scale sticker in frame.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTool(null)
                      setCalibrating((v) => !v)
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold border transition-colors"
                    style={
                      calibrating
                        ? { background: 'var(--sp-primary)', borderColor: 'var(--sp-primary)', color: '#fff' }
                        : { background: 'var(--sp-surface-hover)', borderColor: 'var(--sp-border)', color: 'var(--sp-text-dim)' }
                    }
                  >
                    {calibrating ? 'Tap 2 points…' : 'Calibrate'}
                  </button>
                </div>
                <label className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--sp-text-dim)' }}>
                  <input
                    type="checkbox"
                    checked={showScaleBar}
                    disabled={!pxPerMm}
                    onChange={(e) => setShowScaleBar(e.target.checked)}
                    className="accent-[var(--sp-primary)]"
                  />
                  Show scale bar on image {!pxPerMm && <span style={{ color: 'var(--sp-text-faint)' }}>(calibrate first)</span>}
                </label>

                <SectionHeading icon={ShieldCheck} label="Compliance & workflow" />
                <label className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--sp-text-dim)' }}>
                  <input
                    type="checkbox"
                    checked={consentConfirmed}
                    onChange={(e) => {
                      setConsentConfirmed(e.target.checked)
                      logAudit(e.target.checked ? 'Consent confirmed' : 'Consent unconfirmed')
                    }}
                    className="accent-[var(--sp-primary)]"
                  />
                  Patient / subject consent for clinical photography confirmed
                </label>
                <LabeledInput label="Assign for peer review" value={reviewer} onChange={setReviewer} placeholder="Colleague name or role" />

                <SectionHeading icon={History} label="Audit trail" />
                <div className="rounded-xl border max-h-32 overflow-y-auto no-scrollbar" style={{ borderColor: 'var(--sp-border)' }}>
                  {auditLog.length === 0 ? (
                    <p className="text-[11px] px-3 py-2.5" style={{ color: 'var(--sp-text-faint)' }}>
                      No actions logged yet.
                    </p>
                  ) : (
                    auditLog.map((e, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-1.5 text-[10.8px]"
                        style={{ borderTop: i > 0 ? '1px solid var(--sp-border)' : undefined, color: 'var(--sp-text-dim)' }}
                      >
                        <span className="font-mono shrink-0" style={{ color: 'var(--sp-text-faint)' }}>{e.ts}</span>
                        <span className="truncate">{e.action}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {tab === 'export' && (
              <div className="flex flex-col gap-3.5">
                <SectionHeading icon={Send} label="Image export" />
                <div className="flex items-center gap-2">
                  {(['jpeg', 'png'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setExportFormat(f)}
                      className="flex-1 py-2 rounded-lg text-[11.5px] font-semibold border uppercase tracking-wide"
                      style={
                        exportFormat === f
                          ? { background: 'var(--sp-primary)', borderColor: 'var(--sp-primary)', color: '#fff' }
                          : { background: 'var(--sp-surface)', borderColor: 'var(--sp-border)', color: 'var(--sp-text-dim)' }
                      }
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--sp-text-dim)' }}>
                  <input
                    type="checkbox"
                    checked={burnInOnExport}
                    onChange={(e) => setBurnInOnExport(e.target.checked)}
                    className="accent-[var(--sp-primary)]"
                  />
                  Burn markup, scale bar & case stamp into the saved image
                </label>
                <label className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--sp-text-dim)' }}>
                  <input
                    type="checkbox"
                    checked={includeSidecar}
                    onChange={(e) => setIncludeSidecar(e.target.checked)}
                    className="accent-[var(--sp-primary)]"
                  />
                  <span className="flex items-center gap-1"><FileJson size={12} /> Also download a structured metadata sidecar (.json)</span>
                </label>

                <SectionHeading icon={FileText} label="Reporting & handoff" />
                <button
                  onClick={handleGenerateReport}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12.5px] font-semibold border"
                  style={{ background: 'var(--sp-surface)', borderColor: 'var(--sp-border)', color: 'var(--sp-text)' }}
                >
                  <FileText size={14} /> Generate case report (print / PDF)
                </button>
                <button
                  onClick={handleSendToEhr}
                  disabled={ehrStatus === 'queued'}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12.5px] font-semibold border disabled:opacity-70"
                  style={{ background: 'var(--sp-surface)', borderColor: 'var(--sp-border)', color: 'var(--sp-text)' }}
                >
                  {ehrStatus === 'queued' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {ehrStatus === 'queued' ? 'Queued for sync…' : 'Send to EHR / LIMS'}
                </button>
                <p className="text-[10.4px] leading-snug flex items-start gap-1.5" style={{ color: 'var(--sp-text-faint)' }}>
                  <Info size={11} className="mt-0.5 shrink-0" />
                  This demo build has no live EHR/LIMS integration wired up — connect this action to your
                  institution&apos;s endpoint before relying on it clinically.
                </p>

                <SectionHeading icon={BadgeCheck} label="Sign-off & record lock" />
                {!locked ? (
                  <div className="flex flex-col gap-2 rounded-xl border p-3" style={{ borderColor: 'var(--lg-border)', background: 'rgba(var(--sig-rgb),0.06)' }}>
                    <p className="text-[11px] leading-snug" style={{ color: 'var(--sp-text-dim)' }}>
                      Signing finalizes this record: styles, markup, and case fields lock against further
                      edits and the signer is written to the audit trail.
                    </p>
                    <input
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="Signer name (defaults to Captured by)"
                      className="px-2.5 py-2 rounded-lg border text-[12px] outline-none"
                      style={{ background: 'var(--sp-surface)', borderColor: 'var(--sp-border)', color: 'var(--sp-text)' }}
                    />
                    <Magnetic strength={8}>
                      <motion.button
                        onClick={handleSign}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12.5px] font-semibold glass-btn-primary"
                      >
                        <Lock size={13} /> Sign &amp; lock record
                      </motion.button>
                    </Magnetic>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 rounded-xl border p-3" style={{ borderColor: 'rgba(var(--sig-rgb),0.35)', background: 'rgba(var(--sig-rgb),0.1)' }}>
                    <div className="flex items-center gap-2">
                      <BadgeCheck size={16} style={{ color: 'var(--sig-color)' }} />
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold" style={{ color: 'var(--sp-text)' }}>{signature?.by}</p>
                        <p className="text-[10.5px]" style={{ color: 'var(--sp-text-faint)' }}>
                          {signature?.role} · {signature ? new Date(signature.at).toLocaleString() : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleUnlock}
                      className="flex items-center justify-center gap-2 py-2 rounded-xl text-[12px] font-semibold border"
                      style={{ background: 'var(--sp-surface)', borderColor: 'var(--sp-border)', color: 'var(--sp-text)' }}
                    >
                      <Unlock size={13} /> Unlock for edits
                    </button>
                  </div>
                )}

                <SectionHeading icon={History} label="Audit trail" />
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto rounded-xl border p-2.5 no-scrollbar" style={{ borderColor: 'var(--lg-border)', background: 'var(--sp-surface)' }}>
                  {auditLog.length === 0 && (
                    <p className="text-[11px] text-center py-2" style={{ color: 'var(--sp-text-faint)' }}>No activity yet</p>
                  )}
                  {auditLog.map((entry, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px]">
                      <span className="font-mono shrink-0" style={{ color: 'var(--sp-text-faint)' }}>{entry.ts}</span>
                      <span style={{ color: 'var(--sp-text-dim)' }}>{entry.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
              </TabPane>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* First-visit tour — a lightweight coach-mark sequence, spotlighting
          the segmented control, canvas, AI Assist section, and Done button
          in turn. Shown once per device (localStorage-gated) and dismissible
          at any point; never re-appears once completed or skipped. */}
      <AnimatePresence>
        {tourStep !== null && (
          <TourOverlay
            step={tourStep}
            totalSteps={tourContent.length}
            content={tourContent[tourStep]}
            rect={tourRect}
            onNext={() => (tourStep + 1 < tourContent.length ? setTourStep(tourStep + 1) : endTour())}
            onBack={() => tourStep > 0 && setTourStep(tourStep - 1)}
            onSkip={endTour}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function TourOverlay({
  step,
  totalSteps,
  content,
  rect,
  onNext,
  onBack,
  onSkip,
}: {
  step: number
  totalSteps: number
  content: { title: string; body: string }
  rect: DOMRect | null
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}) {
  const pad = 10
  const spotlight = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null

  // Tooltip card sits below the spotlight by default, flipping above it
  // when there isn't room beneath (e.g. a target near the bottom of the
  // viewport), so it always stays fully on-screen.
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 400
  const cardW = Math.min(300, viewportW - 32)
  const spaceBelow = spotlight ? viewportH - (spotlight.top + spotlight.height) : 999
  const placeAbove = spotlight ? spaceBelow < 200 && spotlight.top > 220 : false
  const cardTop = spotlight
    ? placeAbove
      ? Math.max(16, spotlight.top - 150)
      : Math.min(viewportH - 190, spotlight.top + spotlight.height + 16)
    : viewportH / 2 - 90
  const cardLeft = spotlight
    ? Math.min(Math.max(16, spotlight.left + spotlight.width / 2 - cardW / 2), viewportW - cardW - 16)
    : viewportW / 2 - cardW / 2

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90]"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      {/* Dimmed scrim with a spotlight cutout around the current target —
          the box-shadow-spread trick (a huge shadow instead of an actual
          overlay hole) so the highlighted control still reads as "lit". */}
      {spotlight ? (
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="absolute rounded-2xl pointer-events-none"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow: '0 0 0 2000px rgba(0,0,0,0.6)',
            border: '2px solid var(--sp-primary)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/60" />
      )}

      <motion.div
        key={step}
        initial={{ opacity: 0, y: 10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="absolute rounded-2xl p-4 shadow-2xl"
        style={{ top: cardTop, left: cardLeft, width: cardW, background: 'var(--sp-bg-1)', border: '1px solid var(--sp-border)' }}
      >
        <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--sp-text)' }}>
          {content.title}
        </p>
        <p className="text-[12.5px] leading-relaxed mb-3.5" style={{ color: 'var(--sp-text-dim)' }}>
          {content.body}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full transition-colors"
                style={{ background: i === step ? 'var(--sp-primary)' : 'var(--sp-border)' }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onSkip} className="px-2.5 py-1.5 text-[12.5px] font-medium" style={{ color: 'var(--sp-text-faint)' }}>
              Skip
            </button>
            {step > 0 && (
              <button onClick={onBack} className="px-2.5 py-1.5 text-[12.5px] font-medium" style={{ color: 'var(--sp-text-dim)' }}>
                Back
              </button>
            )}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={onNext}
              className="px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold"
              style={{ background: 'var(--sp-primary)', color: '#fff' }}
            >
              {step + 1 < totalSteps ? 'Next' : 'Got it'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
// ---------------------------------------------------------------------------
// TabPane — the per-tab enter/exit choreography for the section card.
// Direction-aware: sliding from the right when moving to a "later" tab,
// from the left when moving "earlier", so switching sections reads as
// physically navigating a strip rather than a plain crossfade.
// ---------------------------------------------------------------------------
const TAB_ORDER = ['styles', 'adjust', 'markup', 'ai', 'case', 'export'] as const

function TabPane({ direction, children }: { direction: number; children: React.ReactNode }) {
  return (
    <motion.div
      custom={direction}
      initial={{ opacity: 0, x: direction >= 0 ? 28 : -28, scale: 0.97, filter: 'blur(6px)' }}
      animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: direction >= 0 ? -28 : 28, scale: 0.97, filter: 'blur(6px)' }}
      transition={{ type: 'spring', stiffness: 340, damping: 32, mass: 0.7, opacity: { duration: 0.16 } }}
    >
      {children}
    </motion.div>
  )
}

function SectionHeading({ icon: Icon, label }: { icon: typeof CircleIcon; label: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1.5 -mb-1" style={{ color: 'var(--sp-text-faint)' }}>
      <Icon size={11} /> {label}
    </p>
  )
}

function FindingsEditor({
  findings,
  onAdd,
  onRemove,
  onUpdate,
  quick,
}: {
  findings: Finding[]
  onAdd: (label: string) => void
  onRemove: (id: string) => void
  onUpdate: (id: string, patch: Partial<Finding>) => void
  quick: string[]
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <SectionHeading icon={ClipboardList} label="Structured findings" />
      <div className="flex flex-wrap gap-1.5">
        {quick.map((q) => (
          <button
            key={q}
            onClick={() => onAdd(q)}
            className="px-2.5 py-1 rounded-full text-[10.5px] font-medium border"
            style={{ background: 'var(--sp-surface)', borderColor: 'var(--sp-border)', color: 'var(--sp-text-dim)' }}
          >
            + {q}
          </button>
        ))}
      </div>
      {findings.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {findings.map((f) => (
            <div key={f.id} className="flex items-center gap-1.5 rounded-lg border px-2 py-1.5" style={{ borderColor: 'var(--sp-border)' }}>
              <span className="flex-1 text-[11.5px] font-medium truncate" style={{ color: 'var(--sp-text)' }}>{f.label}</span>
              <select
                value={f.severity}
                onChange={(e) => onUpdate(f.id, { severity: e.target.value as Severity })}
                className="text-[10.5px] rounded-md border px-1 py-0.5"
                style={{ background: 'var(--sp-surface)', borderColor: 'var(--sp-border)', color: 'var(--sp-text-dim)' }}
              >
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
              <select
                value={f.laterality}
                onChange={(e) => onUpdate(f.id, { laterality: e.target.value as Laterality })}
                className="text-[10.5px] rounded-md border px-1 py-0.5"
                style={{ background: 'var(--sp-surface)', borderColor: 'var(--sp-border)', color: 'var(--sp-text-dim)' }}
              >
                <option value="n/a">N/A</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="bilateral">Bilateral</option>
              </select>
              <button onClick={() => onRemove(f.id)} aria-label={`Remove ${f.label}`} style={{ color: 'var(--sp-text-faint)' }}>
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PresetRail({
  heading,
  presets,
  presetId,
  photo,
  onSelect,
}: {
  heading: string
  presets: FilterPreset[]
  presetId: string
  photo: string
  onSelect: (p: FilterPreset) => void
}) {
  if (presets.length === 0) return null
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--sp-text-faint)' }}>{heading}</p>
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {presets.map((p) => (
          <motion.button
            key={p.id}
            onClick={() => onSelect(p)}
            whileHover={{ scale: 1.08, y: -2 }}
            whileTap={{ scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            className="flex flex-col items-center gap-1.5 shrink-0"
          >
            <span
              className="relative w-14 h-14 rounded-xl overflow-hidden border-2 block"
              style={{
                borderColor: presetId === p.id ? 'var(--sp-primary)' : 'var(--lg-border)',
                boxShadow: presetId === p.id ? '0 0 0 3px rgba(var(--sp-primary-rgb),0.22), 0 6px 16px rgba(var(--sp-primary-rgb),0.3)' : 'none',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt={p.label}
                style={{ filter: cssFilterFor({ ...DEFAULT_ADJUSTMENTS, ...p.adjustments }) }}
                className="w-full h-full object-cover"
              />
              {p.category === 'clinical' && (
                <span className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center">
                  <Stethoscope size={9} className="text-emerald-400" />
                </span>
              )}
              {presetId === p.id && (
                <motion.span
                  layoutId="preset-selected-ring"
                  className="absolute inset-0 rounded-[10px] pointer-events-none"
                  style={{ boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.5)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                />
              )}
            </span>
            <span
              className="text-[10.5px] font-medium whitespace-nowrap"
              style={{ color: presetId === p.id ? 'var(--sp-text)' : 'var(--sp-text-faint)' }}
            >
              {p.label}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10.5px] font-medium" style={{ color: 'var(--sp-text-faint)' }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-2.5 py-2 rounded-lg border text-[12px] outline-none"
        style={{ background: 'var(--sp-surface)', borderColor: 'var(--sp-border)', color: 'var(--sp-text)' }}
      />
    </label>
  )
}

function ShapeRender({
  shape,
  pxPerMm,
  unit,
  strokeWidth,
}: {
  shape: MarkupShape
  pxPerMm: number | null
  unit: MeasureUnit
  strokeWidth: number
}) {
  const { tool, x1, y1, x2, y2, text } = shape
  if (tool === 'roi') {
    const r = Math.hypot(x2 - x1, y2 - y1)
    return <circle cx={x1} cy={y1} r={r} fill="rgba(250,204,21,0.12)" stroke="#facc15" strokeWidth={strokeWidth} />
  }
  if (tool === 'redact') {
    const x = Math.min(x1, x2)
    const y = Math.min(y1, y2)
    return <rect x={x} y={y} width={Math.abs(x2 - x1)} height={Math.abs(y2 - y1)} fill="#000" />
  }
  if (tool === 'text') {
    return (
      <g>
        <circle cx={x1} cy={y1} r={strokeWidth * 2} fill="#facc15" />
        <text x={x1 + strokeWidth * 4} y={y1 + strokeWidth} fontSize={strokeWidth * 8} fill="#fff" stroke="#000" strokeWidth={strokeWidth * 0.6} paintOrder="stroke">
          {text}
        </text>
      </g>
    )
  }
  // arrow + measure share the line rendering; measure adds a distance label
  const dist = Math.hypot(x2 - x1, y2 - y1)
  const label =
    tool === 'measure'
      ? pxPerMm
        ? `${(dist / pxPerMm / UNIT_TO_MM[unit]).toFixed(unit === 'µm' ? 0 : 1)} ${unit}`
        : `${Math.round(dist)} px`
      : null
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const headLen = strokeWidth * 5
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={tool === 'measure' ? '#22d3ee' : '#f97316'} strokeWidth={strokeWidth} />
      {tool === 'arrow' && (
        <polygon
          points={`0,${-headLen / 2} ${headLen},0 0,${headLen / 2}`}
          fill="#f97316"
          transform={`translate(${x2},${y2}) rotate(${(angle * 180) / Math.PI})`}
        />
      )}
      {label && (
        <text
          x={(x1 + x2) / 2}
          y={(y1 + y2) / 2 - strokeWidth * 3}
          fontSize={strokeWidth * 6}
          fill="#22d3ee"
          stroke="#000"
          strokeWidth={strokeWidth * 0.5}
          paintOrder="stroke"
          textAnchor="middle"
        >
          {label}
        </text>
      )}
    </g>
  )
}

function ScaleBarSvg({
  pxPerMm,
  valueMm,
  unit,
  natural,
}: {
  pxPerMm: number
  valueMm: number
  unit: MeasureUnit
  natural: { w: number; h: number }
}) {
  const barPx = pxPerMm * valueMm
  const x = natural.w * 0.04
  const y = natural.h * 0.94
  const stroke = Math.max(2, natural.w * 0.003)
  const label = `${(valueMm / UNIT_TO_MM[unit]).toFixed(unit === 'µm' ? 0 : 1)} ${unit}`
  return (
    <g>
      <line x1={x} y1={y} x2={x + barPx} y2={y} stroke="#fff" strokeWidth={stroke} />
      <line x1={x} y1={y - stroke * 3} x2={x} y2={y + stroke * 3} stroke="#fff" strokeWidth={stroke} />
      <line x1={x + barPx} y1={y - stroke * 3} x2={x + barPx} y2={y + stroke * 3} stroke="#fff" strokeWidth={stroke} />
      <text x={x + barPx / 2} y={y - stroke * 4} fontSize={stroke * 5} fill="#fff" textAnchor="middle" stroke="#000" strokeWidth={stroke * 0.4} paintOrder="stroke">
        {label}
      </text>
    </g>
  )
}

// --- export-time (canvas) drawing helpers -----------------------------
// Mirror the SVG renderers above but onto a 2D canvas context, since the
// download path bakes everything into a flat JPEG/PNG rather than keeping
// the overlay as separate vector layers.

function drawMarkupToCanvas(ctx: CanvasRenderingContext2D, shapes: MarkupShape[], w: number, h: number) {
  const sw = Math.max(2, w * 0.003)
  for (const s of shapes) {
    ctx.lineWidth = sw
    if (s.tool === 'redact') {
      ctx.fillStyle = '#000'
      ctx.fillRect(Math.min(s.x1, s.x2), Math.min(s.y1, s.y2), Math.abs(s.x2 - s.x1), Math.abs(s.y2 - s.y1))
      continue
    }
    if (s.tool === 'roi') {
      const r = Math.hypot(s.x2 - s.x1, s.y2 - s.y1)
      ctx.strokeStyle = '#facc15'
      ctx.fillStyle = 'rgba(250,204,21,0.12)'
      ctx.beginPath()
      ctx.arc(s.x1, s.y1, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      continue
    }
    if (s.tool === 'text') {
      ctx.font = `${sw * 8}px sans-serif`
      ctx.fillStyle = '#facc15'
      ctx.beginPath()
      ctx.arc(s.x1, s.y1, sw * 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.lineWidth = sw * 0.6
      ctx.strokeStyle = '#000'
      ctx.strokeText(s.text ?? '', s.x1 + sw * 4, s.y1 + sw)
      ctx.fillStyle = '#fff'
      ctx.fillText(s.text ?? '', s.x1 + sw * 4, s.y1 + sw)
      continue
    }
    // arrow / measure
    ctx.strokeStyle = s.tool === 'measure' ? '#22d3ee' : '#f97316'
    ctx.beginPath()
    ctx.moveTo(s.x1, s.y1)
    ctx.lineTo(s.x2, s.y2)
    ctx.stroke()
    if (s.tool === 'arrow') {
      const angle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1)
      const headLen = sw * 5
      ctx.fillStyle = '#f97316'
      ctx.beginPath()
      ctx.moveTo(s.x2, s.y2)
      ctx.lineTo(s.x2 - headLen * Math.cos(angle - Math.PI / 6), s.y2 - headLen * Math.sin(angle - Math.PI / 6))
      ctx.lineTo(s.x2 - headLen * Math.cos(angle + Math.PI / 6), s.y2 - headLen * Math.sin(angle + Math.PI / 6))
      ctx.closePath()
      ctx.fill()
    }
  }
}

function drawScaleBar(ctx: CanvasRenderingContext2D, pxPerMm: number, valueMm: number, unit: MeasureUnit, w: number, h: number) {
  const barPx = pxPerMm * valueMm
  const x = w * 0.04
  const y = h * 0.94
  const stroke = Math.max(2, w * 0.003)
  const label = `${(valueMm / UNIT_TO_MM[unit]).toFixed(unit === 'µm' ? 0 : 1)} ${unit}`
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = stroke
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + barPx, y)
  ctx.moveTo(x, y - stroke * 3)
  ctx.lineTo(x, y + stroke * 3)
  ctx.moveTo(x + barPx, y - stroke * 3)
  ctx.lineTo(x + barPx, y + stroke * 3)
  ctx.stroke()
  ctx.font = `${stroke * 5}px sans-serif`
  ctx.textAlign = 'center'
  ctx.lineWidth = stroke * 0.4
  ctx.strokeStyle = '#000'
  ctx.strokeText(label, x + barPx / 2, y - stroke * 4)
  ctx.fillStyle = '#fff'
  ctx.fillText(label, x + barPx / 2, y - stroke * 4)
  ctx.textAlign = 'left'
}

function drawCaseStamp(ctx: CanvasRenderingContext2D, info: CaseInfo, findings: Finding[], w: number, h: number) {
  const hasInfo = info.caseId || info.bodySite || info.capturedBy || info.notes
  if (!hasInfo && !info.modality && findings.length === 0) return
  const pad = Math.max(10, w * 0.012)
  const fontSize = Math.max(11, w * 0.016)
  const lines = [
    [info.caseId && `ID: ${info.caseId}`, info.modality].filter(Boolean).join('  ·  '),
    [info.bodySite && `Site: ${info.bodySite}`, info.capturedBy && `By: ${info.capturedBy}${info.role ? ` (${info.role})` : ''}`].filter(Boolean).join('  ·  '),
    [info.institution && `Inst: ${info.institution}`, info.department && `Dept: ${info.department}`, info.protocolId && `Protocol: ${info.protocolId}`]
      .filter(Boolean)
      .join('  ·  '),
    [info.instrument && `Scope: ${info.instrument}`, info.magnification, info.stain].filter(Boolean).join('  ·  '),
    [info.biosafetyLevel && info.biosafetyLevel !== 'N/A' && `Biosafety: ${info.biosafetyLevel}`, info.specimenType].filter(Boolean).join('  ·  '),
    new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
  ].filter((l) => l && l.length > 0) as string[]
  if (info.notes) lines.push(`Notes: ${info.notes}`)
  if (findings.length) lines.push(`Findings: ${findings.map((f) => `${f.label} (${f.severity})`).join(', ')}`)

  ctx.font = `${fontSize}px monospace`
  const lineHeight = fontSize * 1.35
  const boxW = Math.min(w - pad * 2, Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2)
  const boxH = lineHeight * lines.length + pad

  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(0, h - boxH, boxW, boxH)

  ctx.fillStyle = '#fff'
  lines.forEach((l, i) => {
    ctx.fillText(l, pad, h - boxH + pad + lineHeight * (i + 0.7))
  })
}

export function PhotoCustomizePanelPortal({
  photo,
  title,
  open,
  onClose,
  onChat,
}: {
  photo: string | null
  title: string
  open: boolean
  onClose: () => void
  onChat?: (caseInfo: CaseInfo) => void
}) {
  return (
    <AnimatePresence>
      {open && photo && <PhotoCustomizePanel photo={photo} title={title} onClose={onClose} onChat={onChat} />}
    </AnimatePresence>
  )
}
