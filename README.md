# Lock In — Browser-Native Focus Coach

**Lock In** is a privacy-first focus coach that runs entirely in your browser. It uses your webcam to detect micro-distractions and **bad habits**—like hair touching, eye/nose rubbing, nail biting, and phone pick-ups—and gives gentle, real-time nudges. You get a session timer, smart breaks, a dashboard of focus metrics—**all on-device**—plus an in-app coach powered by **Gemini** with **ElevenLabs** voice.

<p align="center">
  <a href="https://lockin.quest">▶ Try it live</a> ·
  <a href="https://github.com/your-org/your-repo">GitHub Repo</a>
</p>

---

## Table of Contents
- [About the Project](#-about-the-project)
- [Inspiration](#-inspiration)
- [Why These “Bad Habits” Matter](#-why-these-bad-habits-matter)
- [How I Built It](#-how-i-built-it)
  - [Stack](#stack)
  - [Data Flow](#data-flow)
- [In-App Coach — Gemini Chatbot](#-in-app-coach--gemini-chatbot)
- [What I Learned](#-what-i-learned)
- [Challenges & Fixes](#-challenges--fixes)
- [Early Results](#-early-results)
- [What’s Next](#-whats-next)
- [Privacy First](#-privacy-first)
- [Built With](#built-with)
- [Quick Start (Local Dev)](#-quick-start-local-dev)

---

## 🚀 About the Project

**Lock In** is a browser-native, privacy-first **focus coach**. It uses your webcam to detect micro-distractions and **bad habits**—like **hair touching**, **eye/nose rubbing**, **nail biting**, and **phone pick-ups**—and gives gentle, real-time nudges. You get a session timer, smart breaks, and a dashboard of focus metrics—**all on-device**—plus an in-app coach powered by **Gemini + ElevenLabs** voice.

---

## 🌱 Inspiration

I was losing study time to tiny **bad habits** I barely noticed: fixing hair, rubbing eyes, checking my phone “for a second.” App blockers don’t address **physical** habits. I wanted a coach that:

- **runs in the browser** (no installs),
- **respects privacy** (no video leaves the device),
- provides **real-time feedback** that helps unlearn bad habits, not just track them.

---

## 🧨 Why These “Bad Habits” Matter

- **Stress signal:** Face/hand self-touching spikes under cognitive stress—these are measurable self-soothing behaviors.  
- **They’re frequent:** Students touch their faces dozens of times per hour, especially around eyes and nose—prime pathways for irritation and germs.  
- **Eye health risk:** Habitual eye rubbing is linked to corneal issues (e.g., keratoconus) when forceful or prolonged.  
- **Mental health link:** Nail biting (onychophagia) is a recognized **BFRB** (body-focused repetitive behavior) with physical and psychosocial impacts.  
- **Real campus prevalence:** College samples show meaningful rates of nail biting (e.g., ~29% men, 19% women).  

**Takeaway:** These “small” actions are stress markers, hygiene/health risks, and attention drains—perfect targets for timely, on-device nudges.

---

## 🛠️ How I Built It

### Stack
- **Frontend:** React + TypeScript, HTML5 Canvas overlays  
- **CV Models:** MediaPipe-style face & hand landmarks (web-friendly)  
- **Habit Engine:** Lightweight detector with **latching + hysteresis** to avoid flicker  
- **In-App Coach:** Gemini chatbot with **ElevenLabs TTS** voiceover; minimal REST for session logs/aggregates

### Data Flow
1. **Webcam → `getUserMedia`**  
2. Face + hand **landmark models** at ~15–30 FPS  
3. **Habit engine** classifies: hair touch, nail biting, eye/nose rubbing, phone pick-up → updates focus state (`FOCUSED` / `NOT_FOCUSED` / `PAUSED`)  
4. **Overlay UI** draws banners, timers, and micro-nudges  
5. **Metrics** aggregate client-side; optional anonymized sync

---

## 💬 In-App Coach — Gemini Chatbot

To complement real-time nudges, Lock In includes a **Gemini-powered study coach** embedded in the app:

- **Context-aware tips (no video leaves device):** The chatbot receives only anonymized session context—e.g., current focus state, recent habit counts, streak length, and break timers. It never sees raw video or landmarks.  
- **Actionable guidance:** Ask for “2-minute reset routines,” posture/eye-strain relief, or CBT-style reframes for urges like nail biting. The coach responds with **micro-plans (30–120s)** rather than essays.  
- **Gentle accountability:** When repeated habits pop up (e.g., eye rubs), the coach suggests a short intervention (“blink-20s + moisture drops later”) and sets a lightweight intention for the next 10 minutes.  
- **Voice mode:** Responses are spoken via **ElevenLabs** for hands-free study; users can switch between text-only and voice at any time.  
- **Boundaries & privacy:** Prompts are stripped of PII; the model never receives or stores images. Users can disable context sharing or use the coach as a generic study chatbot.

**Under the hood**

- **Prompt schema:**  
  ```json
  { "focus_state": "FOCUSED|NOT_FOCUSED|PAUSED",
    "streak_minutes": 17,
    "habits_last_10m": { "hair_touch": 2, "eye_rub": 0, "nail_bite": 1, "phone_pickup": 0 },
    "next_break_in": "08:30",
    "goals_today": ["Finish notes ch.3", "Quiz Q1–Q10"]
  }
