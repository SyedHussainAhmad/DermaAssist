import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Scan, Shield, Clock, ChevronRight } from 'lucide-react'
import styles from './LandingPage.module.css'

const features = [
  { icon: Scan,   title: 'AI Vision Analysis',   desc: 'ResNet18 deep learning model analyses skin morphology, colour, and texture.' },
  { icon: Shield, title: 'Clinical Questionnaire', desc: '14-point symptom assessment combined with image for accurate multimodal prediction.' },
  { icon: Clock,  title: 'Instant Results',        desc: 'Get disease identification and actionable precautionary measures in seconds.' },
]

export default function LandingPage() {
  const nav = useNavigate()

  return (
    <div className={styles.page}>
      {/* Background decoration */}
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      <nav className={styles.nav}>
        <span className={styles.logo}>Derma<em>Assist</em></span>
        <span className={styles.badge}>Beta</span>
      </nav>

      <main className={styles.hero}>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className={styles.heroText}
        >
          <p className={styles.eyebrow}>AI-Powered Dermatology</p>
          <h1 className={styles.title}>
            Skin health<br />
            <em>understood</em>
          </h1>
          <p className={styles.subtitle}>
            Upload a photo of your skin concern, answer a few clinical questions,
            and receive an AI-assisted identification with evidence-based precautions.
          </p>

          <div className={styles.disclaimer}>
            ⚕️ <strong>Medical disclaimer:</strong> DermaAssist is a screening aid only.
            Always consult a qualified dermatologist for diagnosis and treatment.
          </div>

          <motion.button
            className={styles.cta}
            onClick={() => nav('/scan')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Start Analysis <ChevronRight size={18} />
          </motion.button>
        </motion.div>

        <motion.div
          className={styles.heroVisual}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className={styles.visualCard}>
            <div className={styles.visualSkin} />
            <div className={styles.visualOverlay}>
              <div className={styles.scanLine} />
              <div className={styles.analysisTag}>Analysing morphology…</div>
            </div>
          </div>
        </motion.div>
      </main>

      <section className={styles.features}>
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            className={styles.featureCard}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.15 }}
          >
            <div className={styles.featureIcon}><f.icon size={22} strokeWidth={1.5} /></div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </motion.div>
        ))}
      </section>

      <footer className={styles.footer}>
        © 2025 DermaAssist &nbsp;·&nbsp; Not a substitute for medical advice
      </footer>
    </div>
  )
}
