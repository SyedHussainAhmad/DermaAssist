import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react'
import axios from 'axios'
import styles from './ResultPage.module.css'

const URGENCY_DISEASES = ['melanoma', 'basal_cell_carcinoma']

export default function ResultPage() {
  const nav = useNavigate()
  const [result, setResult] = useState(null)
  const [error,  setError]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const imageB64  = sessionStorage.getItem('derma_image_b64')
    const answersRaw = sessionStorage.getItem('derma_answers')
    if (!imageB64 || !answersRaw) { nav('/scan'); return }

    const runPrediction = async () => {
      try {
        // Convert base64 to Blob
        const res  = await fetch(imageB64)
        const blob = await res.blob()
        const answers = JSON.parse(answersRaw)

        const formData = new FormData()
        formData.append('image', blob, 'skin.jpg')
        formData.append('answers', JSON.stringify(answers))

        const response = await axios.post('/api/predict', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30000,
        })
        setResult(response.data)
      } catch (err) {
        const msg = err.response?.data?.detail || err.message || 'Prediction failed'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }

    runPrediction()
  }, [nav])

  const isUrgent = result && URGENCY_DISEASES.includes(result.disease)

  /* ── Sort probabilities ── */
  const sortedProbs = result
    ? Object.entries(result.probabilities).sort((a, b) => b[1] - a[1])
    : []

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo}>Derma<em>Assist</em></span>
        <button className={styles.homeBtn} onClick={() => nav('/')}>
          <Home size={16} /> Home
        </button>
      </header>

      <main className={styles.main}>
        {/* ── Loading ── */}
        {loading && (
          <motion.div
            className={styles.loadingCard}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <div className={styles.spinner} />
            <h2>Analysing your skin image…</h2>
            <p>Our ResNet18 multimodal model is processing your image and questionnaire responses.</p>
            <div className={styles.loadingSteps}>
              <Step label="Processing image" done />
              <Step label="Encoding clinical features" done />
              <Step label="Running multimodal inference" active />
              <Step label="Generating precautions" />
            </div>
          </motion.div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <motion.div
            className={styles.errorCard}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          >
            <AlertTriangle size={40} className={styles.errorIcon} />
            <h2>Analysis Failed</h2>
            <p>{error}</p>
            <p className={styles.demoNote}>
              If the model is not yet trained, place <code>derma_assist_model.pth</code> in{' '}
              <code>backend/app/models/</code> and restart the API.
            </p>
            <div className={styles.errorActions}>
              <button className={styles.retryBtn} onClick={() => { setLoading(true); setError(null); window.location.reload() }}>
                <RefreshCw size={16} /> Try Again
              </button>
              <button className={styles.homeBtn2} onClick={() => nav('/')}>
                <Home size={16} /> Home
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Results ── */}
        {!loading && result && (
          <motion.div
            className={styles.resultsWrapper}
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {result.demoMode && (
              <div className={styles.demoBanner}>
                ⚠️ <strong>Demo mode</strong> — Model weights not found. Showing illustrative results.
                Train the model using the Colab notebook and place <code>derma_assist_model.pth</code> in <code>backend/app/models/</code>.
              </div>
            )}

            {/* ── Disease Card ── */}
            <div className={`${styles.diseaseCard} ${isUrgent ? styles.urgentCard : ''}`}>
              {isUrgent && (
                <div className={styles.urgentBanner}>
                  <AlertTriangle size={18} /> Urgent — Please consult a dermatologist immediately
                </div>
              )}
              <div className={styles.diseaseTop}>
                <div>
                  <p className={styles.diagnosisLabel}>Predicted Diagnosis</p>
                  <h1 className={styles.diseaseName}>{result.displayName}</h1>
                  <p className={styles.diseaseDesc}>{result.description}</p>
                </div>
                <div className={styles.confidenceRing}>
                  <svg viewBox="0 0 80 80" className={styles.ringsvg}>
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#eee" strokeWidth="7" />
                    <circle
                      cx="40" cy="40" r="34"
                      fill="none"
                      stroke={isUrgent ? '#C0392B' : 'var(--sage)'}
                      strokeWidth="7"
                      strokeDasharray={`${(result.confidence / 100) * 213.6} 213.6`}
                      strokeLinecap="round"
                      transform="rotate(-90 40 40)"
                    />
                  </svg>
                  <div className={styles.ringText}>
                    <span className={styles.ringNum}>{result.confidence.toFixed(0)}</span>
                    <span className={styles.ringPct}>%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Precautions ── */}
            <div className={styles.precautionsCard}>
              <div className={styles.secHeader}>
                <CheckCircle size={20} className={styles.secIcon} />
                <h2>Precautionary Measures</h2>
              </div>
              <ul className={styles.precautionsList}>
                {result.precautions.map((p, i) => (
                  <motion.li
                    key={i}
                    className={`${styles.precautionItem} ${p.startsWith('⚠️') ? styles.urgentItem : ''}`}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <span className={styles.precNum}>{String(i + 1).padStart(2, '0')}</span>
                    <span>{p}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* ── Probability Bar Chart ── */}
            <div className={styles.probCard}>
              <button
                className={styles.probToggle}
                onClick={() => setExpanded(e => !e)}
              >
                <h2>Disease Probability Distribution</h2>
                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {expanded && (
                <motion.div
                  className={styles.probBars}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  {sortedProbs.map(([name, prob], i) => (
                    <div key={name} className={styles.probRow}>
                      <span className={styles.probLabel}>{name}</span>
                      <div className={styles.probBarTrack}>
                        <motion.div
                          className={`${styles.probBarFill} ${i === 0 ? styles.probBarTop : ''}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(prob, 0.5)}%` }}
                          transition={{ delay: i * 0.06, duration: 0.5 }}
                        />
                      </div>
                      <span className={styles.probPct}>{prob.toFixed(1)}%</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* ── Disclaimer ── */}
            <div className={styles.disclaimer}>
              <AlertTriangle size={15} />
              <p>
                DermaAssist is an AI screening tool and <strong>not a substitute for professional medical diagnosis</strong>.
                Always consult a qualified dermatologist or physician for evaluation and treatment.
              </p>
            </div>

            {/* ── Actions ── */}
            <div className={styles.actions}>
              <button className={styles.newBtn} onClick={() => { sessionStorage.clear(); nav('/scan') }}>
                <RefreshCw size={16} /> New Analysis
              </button>
              <button className={styles.homeBtn2} onClick={() => nav('/')}>
                <Home size={16} /> Home
              </button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}

function Step({ label, done, active }) {
  return (
    <div className={`${styles.loadStep} ${done ? styles.stepDone : active ? styles.stepActive2 : ''}`}>
      <div className={styles.stepDot} />
      <span>{label}</span>
    </div>
  )
}
