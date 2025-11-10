# Lock In — Browser-Native Focus Coach

**Lock In** is a privacy-first focus coach that runs entirely in your browser. It uses your webcam to detect micro-distractions and **bad habits**—like hair touching, eye/nose rubbing, nail biting, and phone pick-ups—and gives gentle, real-time nudges. You get a session timer, smart breaks, a dashboard of focus metrics—**all on-device**—plus an in-app coach powered by **Gemini** with **ElevenLabs** voice.

<p align="center">
  <a href="https://lockin.quest">▶ Try it live</a> ·
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

## Gemini Chatbot

To complement real-time nudges, Lock In includes a **Gemini-powered study coach** embedded in the app:
- **Voice mode:** Responses are spoken via **ElevenLabs** for hands-free study; users can switch between text-only and voice at any time.  
- **Boundaries & privacy:** Prompts are stripped of PII; the model never receives or stores images. Users can disable context sharing or use the coach as a generic study chatbot.

# 1) Clone
git clone https://github.com/your-org/your-repo.git<br>
cd your-repo

# 2) Install client
cd client<br>
npm install<br>
npm run dev<br>

# 3) (Optional) API server
cd ../server<br>
python -m venv .venv && source .venv/bin/activate<br>
pip install -r requirements.txt<br>
python app.py

