import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react'
import styles from './ResultPage.module.css'

const URGENCY_DISEASES = ['melanoma', 'basal_cell_carcinoma']
const DISEASE_CLASSES = [
  'acne',
  'basal_cell_carcinoma',
  'eczema',
  'melanoma',
  'psoriasis',
  'rosacea',
  'urticaria',
  'vitiligo',
]

const KEYWORD_MAP = {
  this: 'acne',
  the: 'eczema',
  that: 'basal_cell_carcinoma',
  it: 'melanoma',
  here: 'psoriasis',
  there: 'rosacea',
  now: 'urticaria',
  then: 'vitiligo',
}

const DISEASE_DETAILS = {
  acne: {
    displayName: 'Acne',
    description: 'Clogged pores leading to pimples, blackheads, or cysts, common in teenagers and adults.',
    precautions: [
      'Wash face twice daily with a gentle, non-comedogenic cleanser',
      'Avoid touching or squeezing pimples to prevent scarring',
      'Use oil-free, non-comedogenic moisturizers and sunscreen',
      'Consult a dermatologist for prescription retinoids or antibiotics if severe',
      'Keep hair clean and away from the face',
      'Consider dietary changes if high-sugar or dairy foods trigger breakouts',
    ],
  },
  basal_cell_carcinoma: {
    displayName: 'Basal Cell Carcinoma',
    description: 'The most common form of skin cancer; usually appears on sun-exposed skin and grows slowly.',
    precautions: [
      'URGENT: seek dermatological evaluation; this can be a form of skin cancer',
      'Do not ignore any new, changing, or bleeding skin lesion',
      'Apply broad-spectrum SPF 30+ sunscreen daily and wear protective clothing',
      'Avoid tanning beds and prolonged sun exposure',
      'Treatment may include surgical excision, Mohs surgery, or radiation',
      'Perform regular monthly skin self-exams',
    ],
  },
  eczema: {
    displayName: 'Eczema (Atopic Dermatitis)',
    description: 'A chronic condition causing dry, red, and extremely itchy skin.',
    precautions: [
      'Moisturize skin frequently with fragrance-free emollients',
      'Identify and avoid triggers such as harsh soaps, dust mites, pet dander, or synthetic fabrics',
      'Use mild, fragrance-free detergents for clothing and bedding',
      'Take short, lukewarm showers because hot water can worsen eczema',
      'Topical corticosteroids may be prescribed for flare-ups',
      'Wear soft, breathable cotton clothing next to the skin',
    ],
  },
  melanoma: {
    displayName: 'Melanoma',
    description: 'A serious form of skin cancer that develops in pigment-producing cells.',
    precautions: [
      'URGENT: consult a dermatologist or oncologist immediately; biopsy may be needed',
      'Melanoma can be dangerous, and early diagnosis is important',
      'Apply SPF 50+ sunscreen to exposed skin every 2 hours outdoors',
      'Avoid UV tanning and artificial tanning beds',
      'Schedule full-body skin checks with a dermatologist',
      'Tell close relatives if melanoma is confirmed because family risk can matter',
    ],
  },
  psoriasis: {
    displayName: 'Psoriasis',
    description: 'An autoimmune disorder where skin cells build up rapidly, creating thick, red, scaly patches.',
    precautions: [
      'Moisturize daily with thick creams or ointments to reduce scaling and itching',
      'Avoid known triggers such as stress, infections, smoking, alcohol, and some medications',
      'Topical corticosteroids and vitamin D analogues are common first-line treatments',
      'Narrowband UVB phototherapy can help widespread psoriasis',
      'Biologic therapies may be available for severe cases',
      'Maintain a healthy weight because obesity can worsen psoriasis severity',
    ],
  },
  rosacea: {
    displayName: 'Rosacea',
    description: 'Chronic facial redness, often with visible blood vessels and small, pus-filled bumps.',
    precautions: [
      'Identify and avoid triggers such as sun, spicy foods, alcohol, heat, and stress',
      'Use gentle, fragrance-free skincare products and avoid scrubbing',
      'Apply broad-spectrum SPF 30+ sunscreen every morning',
      'Topical metronidazole or azelaic acid may help',
      'Laser or IPL therapy can reduce visible blood vessels',
      'Track flares in a diary to identify your specific triggers',
    ],
  },
  urticaria: {
    displayName: 'Urticaria (Hives)',
    description: 'Raised, itchy welts typically triggered by an allergic reaction.',
    precautions: [
      'Identify and avoid possible allergen triggers such as foods, medications, or insect stings',
      'Take non-sedating antihistamines as directed by a clinician or label',
      'Apply cool compresses to relieve itching and reduce swelling',
      'Wear loose, light clothing to minimize skin irritation',
      'URGENT: seek emergency care if hives occur with throat swelling or breathing difficulty',
      'Chronic hives lasting more than 6 weeks may require specialist evaluation',
    ],
  },
  vitiligo: {
    displayName: 'Vitiligo',
    description: 'A condition where the skin loses its pigment, resulting in white patches.',
    precautions: [
      'Apply SPF 30+ sunscreen to depigmented patches because they burn easily',
      'Topical corticosteroids or calcineurin inhibitors may stimulate repigmentation',
      'Narrowband UVB phototherapy is commonly used for treatment',
      'Camouflage makeup, self-tanners, or skin dyes can improve cosmetic appearance',
      'Seek emotional support or counseling if the condition affects confidence or mood',
      'Ask your dermatologist about newer approved options when appropriate',
    ],
  },
}

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

    try {
      const answers = JSON.parse(answersRaw)
      setResult(buildHardcodedResult(answers))
    } catch (err) {
      setError(err.message || 'Unable to read questionnaire answers')
    } finally {
      setLoading(false)
    }
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
            <p>DermaAssist is matching questionnaire keywords to a demo result.</p>
            <div className={styles.loadingSteps}>
              <Step label="Reading questionnaire" done />
              <Step label="Scanning additional notes" done />
              <Step label="Selecting demo result" active />
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
                <strong>Demo mode</strong> - Showing hardcoded results from questionnaire keywords.
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
                    className={`${styles.precautionItem} ${p.toLowerCase().includes('urgent') ? styles.urgentItem : ''}`}
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

function buildHardcodedResult(answers) {
  const disease = findDiseaseFromNotes(answers?.notes)
  const details = DISEASE_DETAILS[disease]

  return {
    disease,
    displayName: details.displayName,
    description: details.description,
    confidence: 95,
    precautions: details.precautions,
    urgent: URGENCY_DISEASES.includes(disease),
    probabilities: buildProbabilities(disease),
    demoMode: true,
  }
}

function findDiseaseFromNotes(notes = '') {
  const normalized = normalizeKeywordText(notes)

  for (const [keyword, disease] of Object.entries(KEYWORD_MAP)) {
    if (normalized.includes(` ${normalizeKeywordText(keyword).trim()} `)) {
      return disease
    }
  }

  return 'eczema'
}

function normalizeKeywordText(value) {
  return ` ${String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `
}

function buildProbabilities(selectedDisease) {
  return DISEASE_CLASSES.reduce((acc, disease) => {
    const label = DISEASE_DETAILS[disease].displayName
    acc[label] = disease === selectedDisease ? 95 : 0.71
    return acc
  }, {})
}

function Step({ label, done, active }) {
  return (
    <div className={`${styles.loadStep} ${done ? styles.stepDone : active ? styles.stepActive2 : ''}`}>
      <div className={styles.stepDot} />
      <span>{label}</span>
    </div>
  )
}
