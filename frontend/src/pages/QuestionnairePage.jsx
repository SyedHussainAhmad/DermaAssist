import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react'
import styles from './QuestionnairePage.module.css'

/* ── Question definitions ────────────────────────────────────────────────── */
const QUESTIONS = [
  {
    id: 'duration',
    label: 'When did this start?',
    hint: 'How long have you had this condition?',
    type: 'select',
    options: [
      { value: 'days',   label: 'A few days ago' },
      { value: 'weeks',  label: '1–4 weeks ago' },
      { value: 'months', label: '1–6 months ago' },
      { value: 'years',  label: 'More than 6 months' },
    ],
  },
  {
    id: 'onset',
    label: 'How did it appear?',
    type: 'radio',
    options: [
      { value: 'sudden',  label: 'Sudden (appeared overnight/quickly)' },
      { value: 'gradual', label: 'Gradual (developed slowly over time)' },
    ],
  },
  {
    id: 'progression',
    label: 'How is it changing?',
    type: 'radio',
    options: [
      { value: 'same',      label: 'Staying the same' },
      { value: 'worse',     label: 'Getting worse' },
      { value: 'spreading', label: 'Spreading to other areas' },
      { value: 'recurring', label: 'Comes and goes (recurring)' },
    ],
  },
  {
    id: 'symptoms',
    label: 'What symptoms do you have?',
    hint: 'Select all that apply',
    type: 'multicheck',
    options: [
      { value: 'itch',       label: '🔥 Itching / Pruritus' },
      { value: 'pain',       label: '😣 Pain or tenderness' },
      { value: 'burning',    label: '🌡️ Burning sensation' },
      { value: 'discharge',  label: '💧 Discharge / Oozing' },
      { value: 'scaling',    label: '🧩 Scaling / Flaking' },
      { value: 'bleeding',   label: '🩸 Bleeding' },
    ],
  },
  {
    id: 'familyHistory',
    label: 'Family history',
    hint: 'Has anyone in your immediate family had a similar skin condition?',
    type: 'radio',
    options: [
      { value: 'true',  label: 'Yes' },
      { value: 'false', label: 'No' },
      { value: 'unknown', label: "I don't know" },
    ],
  },
  {
    id: 'bodyPart',
    label: 'Which body part is affected?',
    type: 'select',
    options: [
      { value: 'face',    label: 'Face' },
      { value: 'scalp',   label: 'Scalp' },
      { value: 'neck',    label: 'Neck' },
      { value: 'chest',   label: 'Chest / Torso (front)' },
      { value: 'back',    label: 'Back' },
      { value: 'arms',    label: 'Arms' },
      { value: 'hands',   label: 'Hands' },
      { value: 'legs',    label: 'Legs' },
      { value: 'feet',    label: 'Feet' },
      { value: 'genital', label: 'Genital / Groin area' },
    ],
  },
  {
    id: 'age',
    label: 'What is your age?',
    type: 'number',
    placeholder: 'Enter your age',
    min: 1, max: 120,
  },
  {
    id: 'gender',
    label: 'What is your gender?',
    type: 'radio',
    options: [
      { value: 'male',   label: 'Male' },
      { value: 'female', label: 'Female' },
      { value: 'other',  label: 'Other / Prefer not to say' },
    ],
  },
  {
    id: 'skinType',
    label: 'What is your skin type?',
    hint: 'Fitzpatrick scale: I = Very fair (burns easily) → VI = Very dark (never burns)',
    type: 'select',
    options: [
      { value: '1', label: 'Type I — Very fair, always burns, never tans' },
      { value: '2', label: 'Type II — Fair, usually burns, sometimes tans' },
      { value: '3', label: 'Type III — Medium, sometimes burns, usually tans' },
      { value: '4', label: 'Type IV — Olive, rarely burns, always tans' },
      { value: '5', label: 'Type V — Brown, very rarely burns' },
      { value: '6', label: 'Type VI — Dark brown/black, never burns' },
    ],
  },
  {
    id: 'itchTiming',
    label: 'When does the itching occur?',
    type: 'radio',
    options: [
      { value: 'never',  label: 'No itching' },
      { value: 'night',  label: 'Worse at night' },
      { value: 'day',    label: 'Worse during the day' },
      { value: 'always', label: 'Constant / All the time' },
    ],
  },
  {
    id: 'itchSeverity',
    label: 'Itch severity (0 = none, 10 = unbearable)',
    type: 'slider',
    min: 0, max: 10,
  },
  {
    id: 'trigger',
    label: 'Any possible trigger?',
    hint: 'New product, food, medication, stress, sun exposure, or lifestyle change?',
    type: 'textarea',
    placeholder: 'e.g., Started new laundry detergent 2 weeks ago…',
  },
  {
    id: 'palpation',
    label: 'How does it feel when touched?',
    hint: 'Select all that apply',
    type: 'multicheck',
    options: [
      { value: 'warm',   label: '🌡️ Warm to the touch' },
      { value: 'tender', label: '😣 Tender / Painful when pressed' },
      { value: 'hard',   label: '🪨 Firm or hard' },
      { value: 'fluid',  label: '💧 Fluid-filled / Soft blister' },
    ],
  },
  {
    id: 'notes',
    label: 'Additional Notes',
    hint: 'Any additional information or comments.',
    type: 'textarea',
    placeholder: 'Any additional notes...',
  },
]

const INITIAL_ANSWERS = QUESTIONS.reduce((acc, q) => {
  if (q.type === 'multicheck') acc[q.id] = []
  else if (q.type === 'slider')  acc[q.id] = 0
  else acc[q.id] = ''
  return acc
}, {})

/* ── Component ───────────────────────────────────────────────────────────── */
export default function QuestionnairePage() {
  const nav = useNavigate()
  const [answers, setAnswers] = useState(INITIAL_ANSWERS)
  const [current, setCurrent] = useState(0)
  const [errors, setErrors] = useState({})
  const [direction, setDirection] = useState(1)

  // Guard: must have image
  useEffect(() => {
    if (!sessionStorage.getItem('derma_image_b64')) nav('/scan')
  }, [nav])

  const q = QUESTIONS[current]

  const validate = () => {
    const val = answers[q.id]
    if (q.type === 'multicheck') return true   // optional
    if (q.type === 'textarea')   return true   // optional
    if (q.type === 'slider')     return true
    if (!val || val === '') {
      setErrors(e => ({ ...e, [q.id]: 'Please answer this question to continue.' }))
      return false
    }
    return true
  }

  const goNext = () => {
    if (!validate()) return
    setErrors({})
    if (current < QUESTIONS.length - 1) {
      setDirection(1)
      setCurrent(c => c + 1)
    } else {
      // All done → save and go to result
      sessionStorage.setItem('derma_answers', JSON.stringify(answers))
      nav('/result')
    }
  }
  const goPrev = () => {
    setErrors({})
    setDirection(-1)
    setCurrent(c => c - 1)
  }

  const update = (id, value) => {
    setAnswers(a => ({ ...a, [id]: value }))
    setErrors(e => ({ ...e, [id]: undefined }))
  }

  const toggleMulti = (id, value) => {
    setAnswers(a => {
      const arr = a[id] || []
      return { ...a, [id]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] }
    })
  }

  const progress = ((current + 1) / QUESTIONS.length) * 100

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => current === 0 ? nav('/scan') : goPrev()}>
          <ArrowLeft size={18} /> {current === 0 ? 'Back to Image' : 'Previous'}
        </button>
        <div className={styles.steps}>
          <span className={styles.stepDone}>1 · Image</span>
          <span className={styles.stepLine} />
          <span className={styles.stepActive}>2 · Questions</span>
          <span className={styles.stepLine} />
          <span className={styles.stepInactive}>3 · Results</span>
        </div>
        <div style={{ width: 120 }} />
      </header>

      {/* Progress bar */}
      <div className={styles.progressBar}>
        <motion.div
          className={styles.progressFill}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
      <p className={styles.progressLabel}>{current + 1} of {QUESTIONS.length}</p>

      <main className={styles.main}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            variants={{
              enter: d => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit:  d => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={styles.questionCard}
          >
            <p className={styles.qNumber}>Question {current + 1}</p>
            <h2 className={styles.qLabel}>{q.label}</h2>
            {q.hint && <p className={styles.qHint}>{q.hint}</p>}

            {/* ── Render input ── */}
            <div className={styles.inputArea}>
              {q.type === 'select' && (
                <select
                  className={styles.select}
                  value={answers[q.id]}
                  onChange={e => update(q.id, e.target.value)}
                >
                  <option value="">— Select an option —</option>
                  {q.options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )}

              {q.type === 'radio' && (
                <div className={styles.radioGroup}>
                  {q.options.map(o => (
                    <label key={o.value} className={`${styles.radioOption} ${answers[q.id] === o.value ? styles.radioSelected : ''}`}>
                      <input
                        type="radio"
                        name={q.id}
                        value={o.value}
                        checked={answers[q.id] === o.value}
                        onChange={() => update(q.id, o.value)}
                      />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'multicheck' && (
                <div className={styles.checkGroup}>
                  {q.options.map(o => (
                    <label key={o.value} className={`${styles.checkOption} ${(answers[q.id] || []).includes(o.value) ? styles.checkSelected : ''}`}>
                      <input
                        type="checkbox"
                        checked={(answers[q.id] || []).includes(o.value)}
                        onChange={() => toggleMulti(q.id, o.value)}
                      />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'number' && (
                <input
                  type="number"
                  className={styles.textInput}
                  placeholder={q.placeholder}
                  min={q.min} max={q.max}
                  value={answers[q.id]}
                  onChange={e => update(q.id, e.target.value)}
                />
              )}

              {q.type === 'textarea' && (
                <textarea
                  className={styles.textarea}
                  placeholder={q.placeholder}
                  value={answers[q.id]}
                  onChange={e => update(q.id, e.target.value)}
                  rows={4}
                />
              )}

              {q.type === 'slider' && (
                <div className={styles.sliderWrapper}>
                  <div className={styles.sliderLabels}>
                    <span>0 — No itch</span>
                    <span className={styles.sliderValue}>{answers[q.id]}</span>
                    <span>10 — Unbearable</span>
                  </div>
                  <input
                    type="range"
                    min={q.min} max={q.max}
                    value={answers[q.id]}
                    onChange={e => update(q.id, Number(e.target.value))}
                    className={styles.slider}
                  />
                  <div className={styles.sliderTicks}>
                    {[...Array(11)].map((_, i) => (
                      <span key={i}>{i}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {errors[q.id] && (
              <p className={styles.errorMsg}>
                <AlertCircle size={14} /> {errors[q.id]}
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className={styles.navButtons}>
          {current > 0 && (
            <button className={styles.prevBtn} onClick={goPrev}>
              <ArrowLeft size={16} /> Previous
            </button>
          )}
          <button className={styles.nextBtn} onClick={goNext}>
            {current < QUESTIONS.length - 1 ? (
              <><span>Next</span> <ArrowRight size={16} /></>
            ) : (
              <><span>Analyse Now</span> <ArrowRight size={16} /></>
            )}
          </button>
        </div>
      </main>
    </div>
  )
}
