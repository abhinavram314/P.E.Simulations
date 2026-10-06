# PowerLab (24EE10026_ABHINAV)

A high-fidelity, interactive power electronics simulator built with React, Vite, and Tailwind CSS. 

This application provides a real-time physics simulation of AC-DC rectifier circuits (both single-phase and three-phase), featuring a custom state-space solver, interactive vector schematics, and an integrated multi-channel oscilloscope.

## 🌟 Key Features

* ⚡ **Real-Time Physics Engine:** Custom state-space solver handling complex power electronics phenomena like commutation overlap ($\mu$), continuous/discontinuous conduction modes (CCM/DCM), and reactive load transients.
* 📊 **Multi-Channel Oscilloscope:** Live visualization of load voltage, load current, source voltage, and thyristor gate pulses. Includes interactive zooming and dynamic scaling.
* 🔌 **Interactive Vector Schematics:** Dynamic SVG-based circuit diagrams that update in real-time. Shows active conduction paths (glowing wires), and allows you to click on individual switches for live telemetry (voltage stress, forward current, conduction status).
* 🎛️ **Parametric Controls:** Fine-tune grid frequency, source inductance ($L_s$), load resistance ($R$), inductance ($L$), and back-EMF battery voltage ($E$), as well as SCR firing angles ($\alpha$).
* 📚 **Mathematical Analysis:** Built-in KaTeX derivation engine explaining the exact piecewise physics equations and Fourier series driving the selected topology.
* 🧭 **Advanced Tools:** Park (d-q) Vector analysis visualization and raw SPICE netlist export for external simulation.

## 📐 Supported Topologies

**Single-Phase:**
* Half-Wave Rectifier
* Full-Bridge (Uncontrolled Diode)
* Full-Bridge (Fully-Controlled SCR)
* Semi-Converter (Symmetrical & Asymmetrical)
* Center-Tap Transformer

**Three-Phase:**
* 3-Pulse Star Rectifier
* 6-Pulse Full-Bridge (Diode & SCR)
* 3-Phase Semi-Converter

**Advanced Converters:**
* 4-Quadrant Dual Converter
* PWM Active Front End (AFE) Boost Rectifier

## 🛠️ Tech Stack

* **Framework:** React 19 + TypeScript
* **Build Tool:** Vite
* **Styling:** Tailwind CSS v4 (Custom Earthy/Coffee "Espresso" Theme)
* **Math Rendering:** KaTeX (`react-katex`)
* **Icons:** Lucide React

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. Clone or download the repository.
2. Navigate to the project directory:
   ```bash
   cd power_electronics-main
   ```
3. Install the dependencies (using legacy peer deps due to React 19 / Vite peer conflicts):
   ```bash
   npm install --legacy-peer-deps
   ```

### Running the Simulator

Start the development server:
```bash
npm run dev
```
Open your browser and navigate to the URL provided in the terminal (usually `http://localhost:3000`).
