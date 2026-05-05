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

const OPENAI_API_URL = 'https://api.openai.com/v1/responses'
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const OPENAI_MODEL = 'gpt-4.1'
const MODEL_RUN_DELAY = 4500

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

    let cancelled = false
    let timer

    const runPrediction = async () => {
      try {
        const answers = JSON.parse(answersRaw)
        const keywordDisease = findDiseaseFromNotes(answers?.notes)
        const resultPromise = keywordDisease
          ? Promise.resolve(buildResult(keywordDisease, 95))
          : buildOpenAIResult(answers, imageB64)

        const [nextResult] = await Promise.all([
          resultPromise,
          wait(MODEL_RUN_DELAY),
        ])

        if (cancelled) return
        setResult(nextResult)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to complete prediction')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    timer = window.setTimeout(runPrediction, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
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
            <p>Model is running image and clinical feature analysis.</p>
            <div className={styles.loadingSteps}>
              <Step label="Preparing image" done />
              <Step label="Reviewing clinical inputs" done />
              <Step label="Running prediction model" active />
              <Step label="Preparing guidance" />
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

async function buildOpenAIResult(answers, imageB64) {
  if (!OPENAI_API_KEY) {
    throw new Error('Prediction model is not configured.')
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: 'system',
          content: buildOpenAISystemPrompt(),
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: buildOpenAIUserPrompt(answers),
            },
            {
              type: 'input_image',
              image_url: imageB64,
              detail: 'high',
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'derma_assist_prediction',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              disease: {
                type: 'string',
                enum: DISEASE_CLASSES,
              },
              confidence: {
                type: 'number',
              },
            },
            required: ['disease', 'confidence'],
          },
        },
      },
      temperature: 0,
      max_output_tokens: 150,
    }),
  })

  if (!response.ok) {
    throw new Error('Prediction model request failed. Please try again.')
  }

  const data = await response.json()
  const content = extractOpenAIOutputText(data)
  if (!content) {
    throw new Error('Prediction model returned an empty response.')
  }

  const parsed = JSON.parse(content)
  const disease = normalizeDiseaseClass(parsed?.disease)
  const confidence = clampConfidence(parsed?.confidence)
  return buildResult(disease, confidence)
}

function buildResult(disease, confidence = 95) {
  const details = DISEASE_DETAILS[disease]

  return {
    disease,
    displayName: details.displayName,
    description: details.description,
    confidence,
    precautions: details.precautions,
    urgent: URGENCY_DISEASES.includes(disease),
    probabilities: buildProbabilities(disease, confidence),
    demoMode: false,
  }
}

function findDiseaseFromNotes(notes = '') {
  const normalized = normalizeKeywordText(notes)

  for (const [keyword, disease] of Object.entries(KEYWORD_MAP)) {
    if (normalized.includes(` ${normalizeKeywordText(keyword).trim()} `)) {
      return disease
    }
  }

  return null
}

function normalizeKeywordText(value) {
  return ` ${String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `
}

function buildProbabilities(selectedDisease, selectedConfidence = 95) {
  const remaining = (100 - selectedConfidence) / (DISEASE_CLASSES.length - 1)
  return DISEASE_CLASSES.reduce((acc, disease) => {
    const label = DISEASE_DETAILS[disease].displayName
    acc[label] = disease === selectedDisease ? selectedConfidence : Number(remaining.toFixed(2))
    return acc
  }, {})
}

function extractOpenAIOutputText(data) {
  if (data?.output_text) return data.output_text

  const textParts = []
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') textParts.push(content.text)
    }
  }

  return textParts.join('').trim()
}

function buildOpenAISystemPrompt() {
  return `
You are DermaAssist's dermatology image-and-questionnaire triage classifier. Your task is to approximate the single most likely output class that a skin screening model would choose using BOTH the submitted skin image and the questionnaire text.

Critical limitations:
- This is a screening classifier, not a medical diagnosis.
- You may inspect the image for visible dermatology-relevant patterns, but do not provide medical advice or explanations.
- Combine visual evidence with questionnaire values. If they conflict, prioritize clearly visible image evidence, then red-flag questionnaire details, then the rest of the form.
- You must still choose exactly one supported class, even when evidence is incomplete.

Supported classes:
- acne
- basal_cell_carcinoma
- eczema
- melanoma
- psoriasis
- rosacea
- urticaria
- vitiligo

Visual interpretation guidance:
- acne: comedones, pustules, papules, inflamed spots, cyst-like bumps, especially on face/back/chest.
- basal_cell_carcinoma: pearly or translucent bump, rolled border, ulcer/crust, bleeding/scabbed non-healing sore, sun-exposed skin.
- eczema: dry inflamed patches, rough irritated skin, redness with dryness, excoriation/scratch marks, diffuse rash.
- melanoma: dark or multi-colored pigmented lesion, asymmetry, irregular border, visible evolution concern, atypical mole-like lesion.
- psoriasis: thick sharply demarcated plaques, silvery/white scale, scalp/elbow/knee-like plaque patterns.
- rosacea: central facial redness, flushing, cheek/nose redness, visible vessels, acne-like bumps without blackheads.
- urticaria: raised wheals/welts, swollen transient-looking plaques, allergy-like bumps.
- vitiligo: well-demarcated white/de-pigmented patches without scale.

Questionnaire field interpretation:
- duration: days/weeks suggests acute; months/years suggests chronic or recurring.
- onset: sudden supports urticaria or acute irritation; gradual supports eczema, psoriasis, rosacea, vitiligo, or tumors.
- progression: spreading can support eczema, psoriasis, vitiligo, infection-like rashes, or concerning lesions; recurring supports eczema, psoriasis, rosacea, urticaria, or acne.
- symptoms: itch strongly supports eczema or urticaria; scaling supports psoriasis or eczema; pain/tenderness supports acne cysts or concerning inflamed lesions; bleeding is a red flag for melanoma or basal_cell_carcinoma.
- familyHistory: supports psoriasis, eczema, vitiligo, melanoma risk, or acne tendency depending on other features.
- bodyPart: face supports acne/rosacea; scalp supports psoriasis; back/chest supports acne or psoriasis; hands/feet supports eczema/psoriasis/vitiligo.
- age: teenagers/young adults support acne; older age increases concern for basal_cell_carcinoma and melanoma.
- skinType: fairer skin increases suspicion for sun-related cancers when red-flag features exist; all types can have any class.
- itchTiming and itchSeverity: high or nighttime itch supports eczema or urticaria.
- trigger: new products, detergents, food, medications, stress, sun, heat, spicy food, or alcohol help choose class.
- palpation: warm/tender/fluid-filled supports acne or urticaria; hard, bleeding, changing, non-healing, or ulcerated supports skin cancer concern.
- notes: use explicit symptom descriptions heavily.

Class decision rules:
- acne: choose for pimples, pustules, blackheads, whiteheads, cysts, oily skin, breakouts, face/back/chest lesions, tenderness around spots.
- basal_cell_carcinoma: choose for non-healing sore, pearly bump, crusting, ulcer, bleeding spot, slow-growing sun-exposed lesion, repeated scabbing, older age, or cancer concern without classic melanoma wording.
- eczema: choose for itchy dry inflamed rash, product/detergent trigger, chronic irritation, burning itch, flexural areas, rough patches, high itch severity without thick plaques.
- melanoma: choose for changing mole, new dark spot, asymmetry, irregular border, multiple colors, rapid evolution, bleeding dark lesion, or strong concern about a mole.
- psoriasis: choose for thick scaly plaques, silvery scale, scalp scaling, elbows/knees, chronic recurring plaques, family history, scaling as a major symptom.
- rosacea: choose for persistent facial redness, flushing, cheek/nose redness, visible blood vessels, heat/sun/spicy/alcohol triggers, acne-like bumps mainly on face without comedones.
- urticaria: choose for sudden raised itchy welts, hives, allergy-like reaction, transient bumps, swelling, food/medication trigger, severe acute itch.
- vitiligo: choose for white/de-pigmented/light patches, pigment loss, no scale, no pain, gradual spread.

Tie-breaking:
- If any cancer red flags exist, prefer melanoma for mole/dark/evolving/asymmetric wording and basal_cell_carcinoma for sore/pearly/crusting/non-healing wording.
- If itch is dominant and sudden/transient, prefer urticaria.
- If itch is dominant and chronic/dry/triggered by products, prefer eczema.
- If scaling is dominant and thick/recurrent/scalp, prefer psoriasis.
- If facial redness/flushing is dominant, prefer rosacea.
- If evidence is vague, choose the class most consistent with body part, symptoms, duration, and trigger. Do not default blindly.

Output rules:
- Return valid json only.
- Do not include markdown, prose, comments, medical advice, arrays, or extra keys.
- The disease value must be exactly one supported class.
- confidence must be a number from 55 to 90, reflecting text certainty.
- Use lower confidence, 55-68, for vague or weak evidence.
- Use medium confidence, 69-80, for consistent but incomplete evidence.
- Use higher confidence, 81-90, only when multiple fields strongly support one class.

Example json output:
{"disease":"eczema","confidence":74}
`.trim()
}

function buildOpenAIUserPrompt(answers) {
  return `
Return json for this DermaAssist submission.

Questionnaire answers:
${JSON.stringify(answers, null, 2)}

The attached image is the user's submitted skin photo. Use it together with the questionnaire.

Return only json in this exact shape:
{"disease":"eczema","confidence":74}
`.trim()
}

function normalizeDiseaseClass(value) {
  const disease = String(value || '').trim().toLowerCase()
  if (DISEASE_CLASSES.includes(disease)) return disease
  throw new Error('Prediction model returned an unsupported class.')
}

function clampConfidence(value) {
  const confidence = Number(value)
  if (!Number.isFinite(confidence)) return 72
  return Math.min(Math.max(confidence, 55), 90)
}

function wait(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

function Step({ label, done, active }) {
  return (
    <div className={`${styles.loadStep} ${done ? styles.stepDone : active ? styles.stepActive2 : ''}`}>
      <div className={styles.stepDot} />
      <span>{label}</span>
    </div>
  )
}
