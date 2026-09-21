import { useMemo, useState } from "react";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBullseye,
  faCamera,
  faMagnifyingGlass,
  faMoon,
  faRulerCombined,
  faSun,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { FiGithub } from "react-icons/fi";
import PhotographyGraphic, { SUBJECTS } from "./PhotographyGraphic";
import Fisheye from "./assets/fishey.png";
import Telephoto from "./assets/100-400.png";
import { toImperial, toMetric } from "./utils/units";

const CIRCLES: Record<string, { coc: number; height: number; crop: number }> = {
  Webcam: { coc: 0.002, height: 3.6, crop: 9.6 },
  Smartphone: { coc: 0.002, height: 7.3, crop: 6.1 },
  "35mm (full frame)": { coc: 0.029, height: 24, crop: 1 },
  "APS-C": { coc: 0.019, height: 15.6, crop: 1.52 },
  "Micro Four Thirds": { coc: 0.015, height: 13, crop: 2 },
  "6x6 (Medium Format)": { coc: 0.02, height: 60, crop: 0.55 },
  "6x7 (Medium Format)": { coc: 0.025, height: 70, crop: 0.47 },
};

const PRESETS = [
  ["Webcam", 3.6, 2.8, 36, "Webcam"], ["Smartphone", 4.3, 2, 36, "Smartphone"],
  ["APS-C 35mm", 35, 1.8, 72, "APS-C"], ["FF 28mm", 28, 1.4, 48, "35mm (full frame)"],
  ["FF 35mm", 35, 1.4, 60, "35mm (full frame)"], ["FF 50mm", 50, 1.8, 72, "35mm (full frame)"],
  ["FF 70mm", 70, 2.8, 96, "35mm (full frame)"], ["6x6 80mm", 80, 2.8, 90, "6x6 (Medium Format)"],
  ["6x7 80mm", 80, 2.8, 80, "6x7 (Medium Format)"],
] as const;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

type SliderProps = {
  id: string; label: string; valueLabel: string; value: number; min: number; max: number; step: number;
  update: (value: number) => void; marks: string[]; icon: typeof faRulerCombined; lesson: string;
};

function Slider({ id, label, valueLabel, value, min, max, step, update, marks, icon: Icon, lesson }: SliderProps) {
  return <section className="border-b border-slate-200 py-6 last:border-0 dark:border-slate-700">
    <div className="mb-4 flex items-center justify-between gap-3">
      <span id={`${id}-label`} className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100"><FontAwesomeIcon icon={Icon} className="h-4 w-4 text-blue-600 dark:text-blue-400" />{label}</span>
      <output className="rounded-md bg-blue-50 px-2.5 py-1 font-mono text-sm font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">{valueLabel}</output>
    </div>
    <SliderPrimitive.Root value={value} min={min} max={max} step={step} largeStep={Math.max(step * 10, 1)} thumbAlignment="edge" onValueChange={update} aria-labelledby={`${id}-label`} className="relative flex h-11 w-full touch-none select-none items-center">
      <SliderPrimitive.Control className="relative h-full w-full cursor-pointer touch-none">
        <SliderPrimitive.Track className="absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-full bg-slate-200 dark:bg-slate-700">
          <SliderPrimitive.Indicator className="h-full rounded-full bg-blue-600 dark:bg-blue-400" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb aria-label={label} className="block h-5 w-5 rounded-full border-4 border-white bg-blue-600 shadow-md outline-none transition focus-visible:ring-4 focus-visible:ring-blue-500/30 dark:border-slate-900 dark:bg-blue-400" />
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
    <div className="mt-3 hidden justify-between text-[11px] font-medium text-slate-400 sm:flex">{marks.map((mark) => <span key={mark}>{mark}</span>)}</div>
    <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{lesson}</p>
  </section>;
}

function App() {
  const [distance, setDistance] = useState(72);
  const [focalLength, setFocalLength] = useState(50);
  const [aperture, setAperture] = useState(1.8);
  const [subject, setSubject] = useState("Human");
  const [system, setSystem] = useState<"Metric" | "Imperial">("Imperial");
  const [sensor, setSensor] = useState("35mm (full frame)");
  const [customWidth, setCustomWidth] = useState(36);
  const [customHeight, setCustomHeight] = useState(24);
  const [dark, setDark] = useState(false);

  const convert = system === "Imperial" ? toImperial : toMetric;
  const custom = sensor === "Custom";
  const diagonal = Math.sqrt(customWidth ** 2 + customHeight ** 2);
  const coc = custom ? diagonal / 1500 : CIRCLES[sensor].coc;
  const sensorHeight = custom ? customHeight : CIRCLES[sensor].height;
  const crop = custom ? 43.27 / diagonal : CIRCLES[sensor].crop;
  const subjectDistanceMM = distance * 25.4;
  const hyperfocalMM = focalLength + focalLength ** 2 / (aperture * coc);
  const farMM = hyperfocalMM * subjectDistanceMM / (hyperfocalMM - (subjectDistanceMM - focalLength));
  const nearMM = hyperfocalMM * subjectDistanceMM / (hyperfocalMM + (subjectDistanceMM - focalLength));
  const farSceneInches = 360;
  const near = clamp(nearMM / 25.4, 0, farSceneInches);
  let far = clamp(farMM / 25.4, 0, farSceneInches);
  if (far < near) far = farSceneInches;
  const hyperfocal = hyperfocalMM / 25.4;
  const infinity = farMM / 25.4 > farSceneInches || farMM <= 0;
  const depth = far - near;
  const fov = 2 * Math.atan(sensorHeight / 2 / focalLength) * 180 / Math.PI;
  const diffractionLimit = coc / 0.001342;
  const equivalent = Math.round(focalLength * crop);
  const fieldType = depth / 12 < 0.5 ? "Macro / Product" : depth / 12 < 3 ? "Portrait Range" : depth / 12 < 10 ? "Group / Event" : depth / 12 < 30 ? "Street / Architecture" : "Landscape";
  const distanceMarks = useMemo(() => system === "Imperial" ? ["2'", "6'", "12'", "20'", "30'"] : ["1m", "3m", "5m", "7m", "9m"], [system]);
  const metricCards = [
    ["Near focus", convert(near, 0)], ["Far focus", infinity ? "Infinity" : convert(far, 0)],
    ["Depth of field", infinity ? "Infinity" : convert(depth, 0)], ["Hyperfocal", convert(hyperfocal, 0)],
  ];
  const selectClass = "min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

  return <main className={dark ? "dark min-h-screen bg-slate-950 text-slate-50" : "min-h-screen bg-canvas text-ink"}>
    <div className="mx-auto max-w-[1440px] px-4 py-5 lg:px-8 lg:py-8">
      <header className="mb-6 flex items-center justify-between border-b border-slate-200 pb-5 dark:border-slate-800">
        <div><p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Optical planning tool</p><h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Depth of Field Simulator</h1></div>
        <button type="button" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Switch to light mode" : "Switch to dark mode"} onClick={() => setDark(!dark)} className="grid h-11 w-11 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><FontAwesomeIcon icon={dark ? faSun : faMoon} className="h-5 w-5" /></button>
      </header>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.85fr)]">
        <section className="min-w-0 animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-2 shadow-panel dark:border-slate-800 dark:bg-slate-900"><PhotographyGraphic distanceToSubjectInInches={distance} nearFocalPointInInches={near} farFocalPointInInches={far} farDistanceInInches={farSceneInches} subject={subject as keyof typeof SUBJECTS} focalLength={focalLength} aperture={aperture} system={system} verticalFieldOfView={fov} textColor={dark ? "#f8fafc" : "#172033"} onChangeDistance={setDistance} /></div>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{metricCards.map(([label, value]) => <div key={label} className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 truncate font-mono text-xl font-bold text-slate-950 dark:text-white">{value}</p></div>)}</div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/10"><span className="inline-flex items-center gap-2 text-sm font-semibold text-blue-800 dark:text-blue-200"><FontAwesomeIcon icon={faBullseye} />{fieldType}</span><button type="button" disabled={hyperfocal > farSceneInches} onClick={() => setDistance(Math.round(hyperfocal))} className="min-h-11 rounded-md border border-blue-200 bg-white px-3 text-sm font-bold text-blue-700 transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-400/30 dark:bg-slate-900 dark:text-blue-300">Set hyperfocal</button></div>
        </section>
        <aside className="animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none rounded-lg border border-slate-200 bg-white px-5 shadow-panel dark:border-slate-800 dark:bg-slate-900 lg:px-6">
          <div className="border-b border-slate-200 py-5 dark:border-slate-700"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Capture controls</p><div className="mt-4 grid grid-cols-2 rounded-md bg-slate-100 p-1 dark:bg-slate-800">{(["Metric", "Imperial"] as const).map((item) => <button key={item} type="button" aria-pressed={system === item} onClick={() => setSystem(item)} className={`min-h-11 rounded px-3 text-sm font-bold transition ${system === item ? "bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-blue-300" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"}`}>{item}</button>)}</div></div>
          <Slider id="subject-distance" label="Distance to subject" valueLabel={convert(distance, 1)} value={distance} min={10} max={400} step={1} update={setDistance} icon={faRulerCombined} marks={distanceMarks} lesson="Moving closer narrows depth of field; stepping back makes more of the scene appear sharp." />
          <Slider id="focal-length" label="Focal length" valueLabel={`${focalLength}mm`} value={focalLength} min={3} max={400} step={1} update={setFocalLength} icon={faMagnifyingGlass} marks={["14mm", "28mm", "50mm", "85mm", "135mm", "200mm"]} lesson="Longer lenses compress the scene and make the focused zone shallower at the same distance." />
          <div className="-mt-2 flex items-center justify-between pb-2 text-xs text-slate-500 dark:text-slate-400"><img src={Fisheye} alt="Fisheye lens" className="h-8 w-auto object-contain" />{sensor !== "35mm (full frame)" && <span>{equivalent}mm full-frame equivalent</span>}<img src={Telephoto} alt="Telephoto lens" className="h-8 w-auto object-contain" /></div>
          <Slider id="aperture" label="Aperture" valueLabel={`f/${aperture.toFixed(1)}`} value={aperture} min={0.8} max={22} step={0.1} update={setAperture} icon={faCamera} marks={["f/0.8", "f/1.4", "f/2.8", "f/5.6", "f/11", "f/22"]} lesson="A smaller f-number opens the aperture and isolates the subject; a larger f-number increases sharpness through the scene." />
          {aperture > diffractionLimit && <p className="-mt-3 mb-5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">Diffraction may reduce sharpness above f/{diffractionLimit.toFixed(1)} on this sensor.</p>}
          <section className="grid gap-4 border-b border-slate-200 py-6 sm:grid-cols-2 dark:border-slate-700">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100"><span className="mb-2 flex items-center gap-2"><FontAwesomeIcon icon={faCamera} className="text-blue-600 dark:text-blue-400" />Sensor</span><select value={sensor} onChange={(event) => setSensor(event.target.value)} className={selectClass}>{Object.keys(CIRCLES).map((name) => <option key={name}>{name}</option>)}<option>Custom</option></select></label>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100"><span className="mb-2 flex items-center gap-2"><FontAwesomeIcon icon={faUser} className="text-blue-600 dark:text-blue-400" />Subject</span><select value={subject} onChange={(event) => setSubject(event.target.value)} className={selectClass}>{Object.keys(SUBJECTS).map((name) => <option key={name}>{name}</option>)}</select></label>
            {custom && <div className="col-span-full grid grid-cols-2 gap-3 rounded-md bg-slate-50 p-3 dark:bg-slate-800/60"><label className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Width (mm)<input aria-label="Custom sensor width" type="number" min="1" value={customWidth} onChange={(event) => setCustomWidth(Math.max(1, Number(event.target.value)))} className="mt-1.5 h-10 w-full rounded border border-slate-300 bg-white px-2 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white" /></label><label className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Height (mm)<input aria-label="Custom sensor height" type="number" min="1" value={customHeight} onChange={(event) => setCustomHeight(Math.max(1, Number(event.target.value)))} className="mt-1.5 h-10 w-full rounded border border-slate-300 bg-white px-2 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white" /></label></div>}
          </section>
          <section className="py-6"><p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Quick presets</p><div className="flex flex-wrap gap-2">{PRESETS.map(([name, focal, fStop, targetDistance, presetSensor]) => <button key={name} type="button" onClick={() => { setFocalLength(focal); setAperture(fStop); setSensor(presetSensor); setDistance(targetDistance); }} className="min-h-11 rounded-md border border-slate-200 px-2.5 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 dark:border-slate-700 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:bg-slate-800 dark:hover:text-blue-300">{name}</button>)}</div></section>
        </aside>
      </div>
      <footer className="mt-6 flex flex-col items-center justify-center gap-1 text-center sm:flex-row sm:gap-3"><a href="https://github.com/DXBMARK/depth-of-field" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-slate-500 transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 dark:text-slate-400 dark:hover:text-blue-300"><FiGithub />Contribute on GitHub</a><span className="text-xs font-medium text-slate-500 dark:text-slate-400">Brought to you with ❤️ <a href="https://www.dxbmark.com" target="_blank" rel="noreferrer" className="underline decoration-slate-300 underline-offset-4 transition hover:text-blue-700 dark:decoration-slate-600 dark:hover:text-blue-300">DXBMARK</a></span></footer>
    </div>
  </main>;
}

export default App;
