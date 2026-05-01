import React, { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Upload, RotateCcw, ArrowRight, ArrowLeft, X, CheckCircle } from 'lucide-react'
import styles from './ImageCapturePage.module.css'

export default function ImageCapturePage() {
  const nav = useNavigate()
  const [mode, setMode] = useState(null)          // null | 'camera' | 'upload'
  const [capturedImage, setCapturedImage] = useState(null)  // { url, blob }
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(null)

  const videoRef  = useRef(null)
  const streamRef = useRef(null)
  const fileRef   = useRef(null)

  /* ── Camera ─────────────────────────────────────────────────────────────── */
  const startCamera = useCallback(async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraActive(true)
    } catch (err) {
      setCameraError('Camera access denied. Please allow camera permissions or use Upload instead.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }, [])

  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob)
      setCapturedImage({ url, blob })
      stopCamera()
    }, 'image/jpeg', 0.92)
  }, [stopCamera])

  /* ── Upload ─────────────────────────────────────────────────────────────── */
  const handleFileChange = useCallback(e => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setCapturedImage({ url, blob: file })
  }, [])

  const handleDrop = useCallback(e => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setCapturedImage({ url, blob: file })
  }, [])

  /* ── Navigation ──────────────────────────────────────────────────────────── */
  const handleContinue = () => {
    if (!capturedImage) return
    // Store image blob in sessionStorage as base64
    const reader = new FileReader()
    reader.onload = e => {
      sessionStorage.setItem('derma_image_b64', e.target.result)
      nav('/questionnaire')
    }
    reader.readAsDataURL(capturedImage.blob)
  }

  const reset = () => {
    setCapturedImage(null)
    stopCamera()
    setMode(null)
    setCameraError(null)
  }

  /* ── Mode select ─────────────────────────────────────────────────────────── */
  const selectMode = m => {
    setMode(m)
    if (m === 'camera') startCamera()
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.back} onClick={() => nav('/')}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className={styles.steps}>
          <span className={styles.stepActive}>1 · Image</span>
          <span className={styles.stepLine} />
          <span className={styles.stepInactive}>2 · Questions</span>
          <span className={styles.stepLine} />
          <span className={styles.stepInactive}>3 · Results</span>
        </div>
        <div style={{ width: 80 }} />
      </header>

      <main className={styles.main}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={styles.card}
        >
          <h1 className={styles.title}>Capture Your Skin Image</h1>
          <p className={styles.subtitle}>
            Take a clear, well-lit photo of the affected skin area. Ensure the area fills most of the frame.
          </p>

          <AnimatePresence mode="wait">
            {/* ── No mode selected ── */}
            {!mode && !capturedImage && (
              <motion.div
                key="select"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className={styles.modeSelect}
              >
                <button className={styles.modeBtn} onClick={() => selectMode('camera')}>
                  <Camera size={32} strokeWidth={1.5} />
                  <span>Use Camera</span>
                  <p>Take a live photo</p>
                </button>
                <button className={styles.modeBtn} onClick={() => selectMode('upload')}>
                  <Upload size={32} strokeWidth={1.5} />
                  <span>Upload Image</span>
                  <p>Choose from device</p>
                </button>
              </motion.div>
            )}

            {/* ── Camera active ── */}
            {mode === 'camera' && !capturedImage && (
              <motion.div
                key="camera"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className={styles.cameraWrapper}
              >
                {cameraError ? (
                  <div className={styles.cameraError}>
                    <p>{cameraError}</p>
                    <button className={styles.switchBtn} onClick={() => { setCameraError(null); selectMode('upload') }}>
                      Switch to Upload
                    </button>
                  </div>
                ) : (
                  <>
                    <div className={styles.videoContainer}>
                      <video ref={videoRef} autoPlay playsInline muted className={styles.video} />
                      <div className={styles.focusOverlay}>
                        <div className={styles.focusCorner} data-pos="tl" />
                        <div className={styles.focusCorner} data-pos="tr" />
                        <div className={styles.focusCorner} data-pos="bl" />
                        <div className={styles.focusCorner} data-pos="br" />
                      </div>
                    </div>
                    <div className={styles.cameraControls}>
                      <button className={styles.resetBtn} onClick={reset}><X size={18} /></button>
                      <button className={styles.captureBtn} onClick={capturePhoto} disabled={!cameraActive}>
                        <div className={styles.captureInner} />
                      </button>
                      <div style={{ width: 44 }} />
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* ── Upload mode ── */}
            {mode === 'upload' && !capturedImage && (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className={styles.uploadArea}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={40} strokeWidth={1} />
                <p className={styles.uploadTitle}>Drag & drop or click to upload</p>
                <p className={styles.uploadSub}>JPG, PNG, WEBP — max 10 MB</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className={styles.hiddenInput}
                  onChange={handleFileChange}
                />
                <button className={styles.cancelUpload} onClick={e => { e.stopPropagation(); reset() }}>
                  Cancel
                </button>
              </motion.div>
            )}

            {/* ── Preview ── */}
            {capturedImage && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className={styles.previewWrapper}
              >
                <div className={styles.previewImgContainer}>
                  <img src={capturedImage.url} alt="Captured skin" className={styles.previewImg} />
                  <div className={styles.previewBadge}><CheckCircle size={16} /> Image ready</div>
                </div>
                <div className={styles.previewTips}>
                  <p>✅ Good image checklist:</p>
                  <ul>
                    <li>Affected area clearly visible</li>
                    <li>Good lighting (no harsh flash shadows)</li>
                    <li>In focus and not blurry</li>
                    <li>Area fills most of the frame</li>
                  </ul>
                </div>
                <div className={styles.previewActions}>
                  <button className={styles.retakeBtn} onClick={reset}>
                    <RotateCcw size={16} /> Retake
                  </button>
                  <button className={styles.continueBtn} onClick={handleContinue}>
                    Continue <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  )
}
