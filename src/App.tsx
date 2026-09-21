import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowsLeftRight,
  faBullseye,
  faCamera,
  faCircleInfo,
  faGear,
  faLightbulb,
  faMagnifyingGlass,
  faMoon,
  faMountainSun,
  faPeopleGroup,
  faRulerCombined,
  faSun,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { FiGithub } from "react-icons/fi";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import PhotographyGraphic, { SUBJECTS } from "./PhotographyGraphic";
import { toImperial, toMetric } from "./utils/units";

const DEFAULT_DISTANCE_INCHES = 612.1 / 2.54;
const DEFAULT_DISTANCE_MAX_INCHES = 400;
const METRIC_VISUAL_SCENE_MAX_INCHES = 1000 / 2.54;
const IMPERIAL_VISUAL_SCENE_MAX_INCHES = 360;

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
  ["Webcam", 3.6, 2.8, 36, "Webcam"],
  ["Smartphone", 4.3, 2, 36, "Smartphone"],
  ["APS-C 35mm", 35, 1.8, 72, "APS-C"],
  ["FF 28mm", 28, 1.4, 48, "35mm (full frame)"],
  ["FF 35mm", 35, 1.4, 60, "35mm (full frame)"],
  ["FF 50mm", 50, 1.8, 72, "35mm (full frame)"],
  ["FF 70mm", 70, 2.8, 96, "35mm (full frame)"],
  ["6x6 80mm", 80, 2.8, 90, "6x6 (Medium Format)"],
  ["6x7 80mm", 80, 2.8, 80, "6x7 (Medium Format)"],
] as const;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function ApertureIcon({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 3.5 15 9H8.6L12 3.5Z" fill="currentColor" />
      <path d="m20.1 7.2-3.2 5.4-3.2-5.5 6.4.1Z" fill="currentColor" />
      <path d="m20.1 16.8-6.4.1 3.2-5.5 3.2 5.4Z" fill="currentColor" />
      <path d="M12 20.5 8.9 15h6.4L12 20.5Z" fill="currentColor" />
      <path d="m3.9 16.8 3.2-5.4 3.2 5.5-6.4-.1Z" fill="currentColor" />
      <path d="m3.9 7.2 6.4-.1-3.2 5.5-3.2-5.4Z" fill="currentColor" />
    </svg>
  );
}

function SectionIcon({ icon }: { icon: IconDefinition }) {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-signal-soft text-signal">
      <FontAwesomeIcon icon={icon} className="h-[17px] w-[17px]" />
    </span>
  );
}

type ParameterSliderProps = {
  id: string;
  label: string;
  valueLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  update: (value: number) => void;
  marks: string[];
  lesson: string;
  icon?: IconDefinition;
  customIcon?: ReactNode;
  note?: string;
};

function ParameterSlider({
  id,
  label,
  valueLabel,
  value,
  min,
  max,
  step,
  update,
  marks,
  lesson,
  icon,
  customIcon,
  note,
}: ParameterSliderProps) {
  return (
    <section className="rounded-lg border border-line bg-surface px-4 py-3.5 shadow-soft">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <span
          id={`${id}-label`}
          className="flex items-center gap-2 text-[13px] font-bold leading-none text-ink"
        >
          <span className="text-signal">
            {customIcon ?? (icon ? <FontAwesomeIcon icon={icon} className="h-[16px] w-[16px]" /> : null)}
          </span>
          {label}
        </span>
        <output className="rounded-md bg-signal-soft px-2.5 py-1 text-[13px] font-extrabold tabular-nums text-signal">
          {valueLabel}
        </output>
      </div>

      <SliderPrimitive.Root
        value={value}
        min={min}
        max={max}
        step={step}
        largeStep={Math.max(step * 10, 1)}
        thumbAlignment="edge"
        onValueChange={update}
        aria-labelledby={`${id}-label`}
        className="relative flex h-8 w-full touch-none select-none items-center"
      >
        <SliderPrimitive.Control className="relative h-full w-full cursor-pointer touch-none">
          <SliderPrimitive.Track className="absolute top-1/2 h-[6px] w-full -translate-y-1/2 rounded-full bg-[#DCE4EF] dark:bg-slate-700">
            <SliderPrimitive.Indicator className="h-full rounded-full bg-signal" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            aria-label={label}
            className="block h-[17px] w-[17px] rounded-full border-[3px] border-white bg-signal shadow-[0_1px_4px_rgba(15,23,42,0.28)] outline-none transition focus-visible:ring-4 focus-visible:ring-signal/20 dark:border-slate-950"
          />
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>

      <div className="mt-1.5 hidden justify-between text-[10.5px] font-medium text-muted sm:flex">
        {marks.map((mark) => (
          <span key={mark}>{mark}</span>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-[16px] text-secondary">{lesson}</p>
      {note ? <p className="mt-1 text-[10.5px] font-semibold text-muted">{note}</p> : null}
    </section>
  );
}

type MetricCardProps = {
  icon: IconDefinition;
  label: string;
  description: string;
  value: string;
  primary?: boolean;
};

function MetricCard({ icon, label, description, value, primary }: MetricCardProps) {
  return (
    <article
      className={`min-w-0 rounded-lg border p-4 shadow-soft ${
        primary
          ? "border-signal/35 bg-signal-soft/45"
          : "border-line bg-surface"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
            primary ? "bg-[#DCEBFF] text-signal" : "bg-[#F0F5FB] text-signal"
          }`}
        >
          <FontAwesomeIcon icon={icon} className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <h3 className={`text-[13px] font-extrabold leading-5 ${primary ? "text-signal" : "text-ink"}`}>
            {label}
          </h3>
          <p className="mt-0.5 min-h-[32px] text-[11px] leading-[15px] text-secondary">
            {description}
          </p>
        </div>
      </div>
      <p className="mt-2.5 truncate text-[26px] font-extrabold leading-none tracking-tight tabular-nums text-ink">
        {value}
      </p>
    </article>
  );
}

function RadioChoice({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-[12px] font-bold text-ink">
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span className="grid h-[20px] w-[20px] place-items-center rounded-full border-2 border-[#B9C7D9] bg-white transition peer-checked:border-signal peer-focus-visible:ring-4 peer-focus-visible:ring-signal/20">
        <span className={`h-[10px] w-[10px] rounded-full transition ${checked ? "bg-signal" : "bg-transparent"}`} />
      </span>
      {label}
    </label>
  );
}

function ShootingModeCard({
  mode,
  setMode,
  onSetHyperfocal,
}: {
  mode: "Group / Event" | "Single Subject";
  setMode: (mode: "Group / Event" | "Single Subject") => void;
  onSetHyperfocal: () => void;
}) {
  return (
    <section
      data-testid="shooting-mode"
      className="mt-5 grid min-h-[102px] grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-5 rounded-lg border border-[#D8E8FB] bg-[#F5F9FF] px-4 py-3.5 dark:border-blue-500/20 dark:bg-blue-500/10"
    >
      <div className="flex min-w-0 items-center gap-4">
        <SectionIcon icon={faPeopleGroup} />
        <div className="min-w-0">
          <h2 className="text-[13px] font-extrabold text-ink">Shooting Mode</h2>
          <p className="mt-0.5 max-w-[300px] text-[11px] leading-[16px] text-secondary">
            Adjust the simulation for a single subject or a group/event scenario.
          </p>
        </div>
      </div>

      <fieldset className="flex items-center gap-5">
        <legend className="sr-only">Shooting mode</legend>
        <RadioChoice checked={mode === "Group / Event"} label="Group / Event" onChange={() => setMode("Group / Event")} />
        <RadioChoice checked={mode === "Single Subject"} label="Single Subject" onChange={() => setMode("Single Subject")} />
      </fieldset>

      <div className="border-l border-[#D6E2F0] pl-5">
        <button
          type="button"
          onClick={onSetHyperfocal}
          className="inline-flex h-[42px] items-center justify-center rounded-lg border border-[#BBD6FB] bg-white px-4 text-[12px] font-extrabold text-signal shadow-soft transition hover:border-signal/50 hover:bg-signal-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-signal/20"
        >
          <FontAwesomeIcon icon={faBullseye} className="mr-2 h-[14px] w-[14px]" />
          Set hyperfocal
        </button>
      </div>
    </section>
  );
}

function HelpCard({ onOpen }: { onOpen: () => void }) {
  return (
    <section
      data-testid="help-card"
      className="mt-4 flex min-h-[96px] items-center gap-4 rounded-lg border border-line bg-surface px-4 py-3.5 shadow-panel"
    >
      <SectionIcon icon={faLightbulb} />
      <div className="min-w-0 flex-1">
        <h2 className="text-[14px] font-extrabold text-ink">How to use this tool</h2>
        <p className="mt-1 max-w-[650px] text-[11px] leading-[16px] text-secondary">
          Adjust the controls on the right to see how distance, focal length, aperture and sensor size affect your depth of field. The visualization and values update in real time.
        </p>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex h-[40px] shrink-0 items-center justify-center rounded-lg border border-[#CFE0F5] bg-white px-4 text-[12px] font-extrabold text-signal transition hover:border-signal/50 hover:bg-signal-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-signal/20"
      >
        Learn more <span className="ml-2 text-[15px] leading-none">↗</span>
      </button>
    </section>
  );
}

function App() {
  const [distance, setDistance] = useState(DEFAULT_DISTANCE_INCHES);
  const [distanceMax, setDistanceMax] = useState(DEFAULT_DISTANCE_MAX_INCHES);
  const [focalLength, setFocalLength] = useState(47);
  const [aperture, setAperture] = useState(1.8);
  const [subject, setSubject] = useState("Human");
  const [system, setSystem] = useState<"Metric" | "Imperial">("Metric");
  const [sensor, setSensor] = useState("35mm (full frame)");
  const [customWidth, setCustomWidth] = useState(36);
  const [customHeight, setCustomHeight] = useState(24);
  const [dark, setDark] = useState(false);
  const [mode, setMode] = useState<"Group / Event" | "Single Subject">("Group / Event");
  const [helpOpen, setHelpOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const convert = system === "Imperial" ? toImperial : toMetric;
  const custom = sensor === "Custom";
  const diagonal = Math.sqrt(customWidth ** 2 + customHeight ** 2);
  const coc = custom ? diagonal / 1500 : CIRCLES[sensor].coc;
  const sensorHeight = custom ? customHeight : CIRCLES[sensor].height;
  const crop = custom ? 43.27 / diagonal : CIRCLES[sensor].crop;
  const subjectDistanceMM = distance * 25.4;
  const hyperfocalMM = focalLength + focalLength ** 2 / (aperture * coc);
  const farMM =
    (hyperfocalMM * subjectDistanceMM) /
    (hyperfocalMM - (subjectDistanceMM - focalLength));
  const nearMM =
    (hyperfocalMM * subjectDistanceMM) /
    (hyperfocalMM + (subjectDistanceMM - focalLength));

  const calculationSceneLimit = 360;
  const near = clamp(nearMM / 25.4, 0, calculationSceneLimit);
  let far = clamp(farMM / 25.4, 0, calculationSceneLimit);
  if (far < near) far = calculationSceneLimit;
  const hyperfocal = hyperfocalMM / 25.4;
  const infinity = farMM / 25.4 > calculationSceneLimit || farMM <= 0;
  const depth = far - near;
  const fov = (2 * Math.atan(sensorHeight / 2 / focalLength) * 180) / Math.PI;
  const diffractionLimit = coc / 0.001342;
  const equivalent = Math.round(focalLength * crop);
  const visualSceneMax =
    system === "Metric"
      ? METRIC_VISUAL_SCENE_MAX_INCHES
      : IMPERIAL_VISUAL_SCENE_MAX_INCHES;

  const distanceMarks = useMemo(() => {
    if (distanceMax <= DEFAULT_DISTANCE_MAX_INCHES) {
      return system === "Imperial"
        ? ["2'", "6'", "12'", "20'", "30'"]
        : ["1m", "3m", "5m", "7m", "9m"];
    }

    return [0.2, 0.4, 0.6, 0.8, 1].map((fraction) =>
      convert(distanceMax * fraction, 0)
    );
  }, [convert, distanceMax, system]);

  const metricCards: MetricCardProps[] = [
    {
      icon: faBullseye,
      label: "Near Focus",
      description: "Closest acceptably sharp focus",
      value: convert(near, 0),
    },
    {
      icon: faBullseye,
      label: "Far Focus",
      description: "Furthest acceptably sharp focus",
      value: infinity ? "∞" : convert(far, 0),
    },
    {
      icon: faArrowsLeftRight,
      label: "Depth of Field",
      description: "Total in-focus range",
      value: infinity ? "∞" : convert(depth, 0),
      primary: true,
    },
    {
      icon: faMountainSun,
      label: "Hyperfocal",
      description: "Focus at this distance for maximum depth of field",
      value: convert(hyperfocal, 0),
    },
  ];

  const activePreset = PRESETS.find(([_, focal, fStop, targetDistance, presetSensor]) =>
    Math.abs(focalLength - focal) < 0.001 &&
    Math.abs(aperture - fStop) < 0.001 &&
    Math.abs(distance - targetDistance) < 0.001 &&
    sensor === presetSensor
  )?.[0];

  const selectClass =
    "h-10 w-full rounded-md border border-[#CDD9E8] bg-white px-3 text-[12px] font-semibold text-ink outline-none transition focus:border-signal focus:ring-4 focus:ring-signal/15 dark:bg-slate-900";

  const handleSetHyperfocal = () => {
    const target = Math.max(10, hyperfocal);
    setDistanceMax(Math.max(DEFAULT_DISTANCE_MAX_INCHES, Math.ceil((target * 1.08) / 12) * 12));
    setDistance(target);
  };

  const applyPreset = (
    focal: number,
    fStop: number,
    targetDistance: number,
    presetSensor: string
  ) => {
    setFocalLength(focal);
    setAperture(fStop);
    setSensor(presetSensor);
    setDistance(targetDistance);
    setDistanceMax(DEFAULT_DISTANCE_MAX_INCHES);
  };

  return (
    <main
      className={dark ? "dark min-h-screen bg-canvas text-ink" : "min-h-screen bg-canvas text-ink"}
      data-testid="app-shell"
    >
      <div className="mx-auto w-full max-w-[1448px] px-5 pb-3 pt-6 md:px-8 xl:px-9 xl:pt-7">
        <header className="mb-4 flex items-start justify-between border-b border-line pb-4">
          <div>
            <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.20em] text-signal">
              Optical planning tool
            </p>
            <h1 className="text-[34px] font-extrabold leading-[1.05] tracking-[-0.035em] text-ink lg:text-[36px]">
              Depth of Field Simulator
            </h1>
            <p className="mt-2 text-[14px] leading-5 text-secondary">
              Visualize depth of field, focus range and how your camera settings affect sharpness.
            </p>
          </div>

          <div className="flex items-start gap-4 pt-1">
            <p className="hidden text-right text-[11px] font-medium leading-[15px] text-secondary sm:block">
              Better photos
              <br />
              through understanding
            </p>
            <button
              type="button"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => setDark(!dark)}
              className="grid h-10 w-10 place-items-center rounded-md border border-line bg-surface text-[#334155] shadow-soft transition hover:border-signal/40 hover:text-signal focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-signal/20"
            >
              <FontAwesomeIcon icon={dark ? faSun : faMoon} className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.72fr)_minmax(460px,0.98fr)]">
          <section className="min-w-0">
            <div
              data-testid="simulator-card"
              className="rounded-lg border border-line bg-surface p-4 shadow-panel"
            >
              <div className="flex min-h-[34px] items-center justify-between">
                <h2 className="flex items-center gap-3 text-[16px] font-extrabold text-ink">
                  <FontAwesomeIcon icon={faCamera} className="h-[19px] w-[19px] text-signal" />
                  Scene Visualization
                </h2>
                <span className="hidden items-center gap-2 text-[11px] italic text-muted sm:flex">
                  <FontAwesomeIcon icon={faCircleInfo} className="h-[12px] w-[12px]" />
                  Not to scale · Illustrative representation
                </span>
              </div>

              <div
                data-testid="scene-frame"
                className="dof-scene-frame mt-4 overflow-hidden rounded-lg border border-line bg-white dark:bg-slate-950"
              >
                <PhotographyGraphic
                  distanceToSubjectInInches={distance}
                  nearFocalPointInInches={near}
                  farFocalPointInInches={far}
                  visualSceneMaxInches={visualSceneMax}
                  subject={subject as keyof typeof SUBJECTS}
                  focalLength={focalLength}
                  aperture={aperture}
                  system={system}
                  verticalFieldOfView={fov}
                  textColor={dark ? "#F5F7FB" : "#0B1736"}
                  dark={dark}
                  onChangeDistance={(value) => {
                    setDistance(value);
                    if (value > distanceMax) setDistanceMax(Math.ceil(value));
                  }}
                />
              </div>

              <div data-testid="metrics-grid" className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {metricCards.map((metric) => (
                  <MetricCard key={metric.label} {...metric} />
                ))}
              </div>

              <ShootingModeCard mode={mode} setMode={setMode} onSetHyperfocal={handleSetHyperfocal} />
            </div>

            <HelpCard onOpen={() => setHelpOpen(true)} />
          </section>

          <aside
            data-testid="settings-panel"
            className="rounded-lg border border-line bg-surface p-4 shadow-panel"
          >
            <div className="mb-3 flex items-start gap-3">
              <FontAwesomeIcon icon={faGear} className="mt-0.5 h-[22px] w-[22px] text-signal" />
              <div>
                <h2 className="text-[17px] font-extrabold leading-5 text-ink">Camera &amp; Scene Settings</h2>
                <p className="mt-1 text-[11.5px] leading-4 text-secondary">
                  Adjust the parameters below to see how they affect depth of field.
                </p>
              </div>
            </div>

            <section className="flex min-h-[60px] items-center justify-between gap-4 rounded-lg border border-line bg-surface px-3 py-2 shadow-soft">
              <span className="flex items-center gap-2.5 text-[13px] font-extrabold text-ink">
                <FontAwesomeIcon icon={faRulerCombined} className="h-[16px] w-[16px] text-signal" />
                Units
              </span>
              <div className="grid w-[198px] grid-cols-2 rounded-md bg-[#F1F5FA] p-1 dark:bg-slate-800">
                {(["Metric", "Imperial"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={system === item}
                    onClick={() => setSystem(item)}
                    className={`h-9 rounded-[6px] px-3 text-[12px] font-extrabold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-signal/20 ${
                      system === item
                        ? "bg-signal text-white shadow-[0_2px_6px_rgba(20,110,245,0.25)]"
                        : "text-secondary hover:text-ink"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </section>

            <div className="mt-3 space-y-3">
              <ParameterSlider
                id="subject-distance"
                label="Distance to subject"
                valueLabel={convert(distance, 1)}
                value={distance}
                min={10}
                max={distanceMax}
                step={1}
                update={setDistance}
                icon={faRulerCombined}
                marks={distanceMarks}
                lesson="Moving closer narrows depth of field; stepping back makes more of the scene appear sharp."
              />

              <ParameterSlider
                id="focal-length"
                label="Focal length"
                valueLabel={`${focalLength} mm`}
                value={focalLength}
                min={3}
                max={400}
                step={1}
                update={setFocalLength}
                icon={faMagnifyingGlass}
                marks={["14mm", "28mm", "50mm", "85mm", "135mm", "200mm"]}
                lesson="Longer lenses compress the scene and make the focused zone shallower at the same distance."
                note={sensor !== "35mm (full frame)" ? `${equivalent} mm full-frame equivalent` : undefined}
              />

              <ParameterSlider
                id="aperture"
                label="Aperture"
                valueLabel={`f/${aperture.toFixed(1)}`}
                value={aperture}
                min={0.8}
                max={22}
                step={0.1}
                update={setAperture}
                customIcon={<ApertureIcon />}
                marks={["f/0.8", "f/1.4", "f/2.8", "f/5.6", "f/11", "f/22"]}
                lesson="A smaller f-number opens the aperture and isolates the subject; a larger f-number increases sharpness through the scene."
              />
            </div>

            {aperture > diffractionLimit ? (
              <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-4 text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
                Diffraction may reduce sharpness above f/{diffractionLimit.toFixed(1)} on this sensor.
              </p>
            ) : null}

            <section className="mt-3 grid grid-cols-2 gap-3">
              <label className="block text-[12px] font-extrabold text-ink">
                <span className="mb-2 flex items-center gap-2">
                  <FontAwesomeIcon icon={faCamera} className="h-[15px] w-[15px] text-signal" />
                  Sensor
                </span>
                <select value={sensor} onChange={(event) => setSensor(event.target.value)} className={selectClass}>
                  {Object.keys(CIRCLES).map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                  <option>Custom</option>
                </select>
              </label>

              <label className="block text-[12px] font-extrabold text-ink">
                <span className="mb-2 flex items-center gap-2">
                  <FontAwesomeIcon icon={faUser} className="h-[15px] w-[15px] text-signal" />
                  Subject
                </span>
                <select value={subject} onChange={(event) => setSubject(event.target.value)} className={selectClass}>
                  {Object.keys(SUBJECTS).map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </label>

              {custom ? (
                <div className="col-span-full grid grid-cols-2 gap-3 rounded-lg border border-line bg-surface-soft p-3">
                  <label className="text-[11px] font-bold text-secondary">
                    Width (mm)
                    <input
                      aria-label="Custom sensor width"
                      type="number"
                      min="1"
                      value={customWidth}
                      onChange={(event) => setCustomWidth(Math.max(1, Number(event.target.value)))}
                      className="mt-1.5 h-9 w-full rounded-md border border-line bg-white px-2 text-[12px] font-semibold text-ink outline-none focus:border-signal focus:ring-4 focus:ring-signal/15"
                    />
                  </label>
                  <label className="text-[11px] font-bold text-secondary">
                    Height (mm)
                    <input
                      aria-label="Custom sensor height"
                      type="number"
                      min="1"
                      value={customHeight}
                      onChange={(event) => setCustomHeight(Math.max(1, Number(event.target.value)))}
                      className="mt-1.5 h-9 w-full rounded-md border border-line bg-white px-2 text-[12px] font-semibold text-ink outline-none focus:border-signal focus:ring-4 focus:ring-signal/15"
                    />
                  </label>
                </div>
              ) : null}
            </section>

            <section className="mt-3 rounded-lg border border-line bg-surface px-3 py-3 shadow-soft">
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[12px] font-extrabold text-ink">
                  <FontAwesomeIcon icon={faCamera} className="h-[14px] w-[14px] text-signal" />
                  Quick Presets
                </span>
                <span className="text-right text-[10.5px] leading-4 text-muted">Popular combinations to get you started.</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map(([name, focal, fStop, targetDistance, presetSensor]) => {
                  const active = activePreset === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={active}
                      onClick={() => applyPreset(focal, fStop, targetDistance, presetSensor)}
                      className={`h-[34px] rounded-md border px-2.5 text-[11px] font-extrabold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-signal/20 ${
                        active
                          ? "border-signal bg-signal-soft text-signal"
                          : "border-line bg-white text-ink hover:border-signal/40 hover:bg-signal-soft/50 hover:text-signal"
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </section>
          </aside>
        </div>

        <footer
          data-testid="app-footer"
          className="mt-4 grid min-h-10 grid-cols-1 items-center gap-2 text-[11px] font-semibold text-secondary md:grid-cols-3"
        >
          <a
            href="https://github.com/DXBMARK/depth-of-field"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 justify-self-start rounded-md px-1 py-1 transition hover:text-signal focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-signal/20"
          >
            <FiGithub className="h-[15px] w-[15px]" />
            Contribute on GitHub
          </a>
          <span className="justify-self-center text-center">
            Brought to you with <span className="text-[#E65E65]">♥</span> by{" "}
            <a
              href="https://www.dxbmark.com"
              target="_blank"
              rel="noreferrer"
              className="font-bold underline decoration-line-strong underline-offset-4 transition hover:text-signal"
            >
              DXBMARK
            </a>
          </span>
          <span className="flex items-center gap-2 justify-self-end">
            A clearer view for a sharper world.
            <FontAwesomeIcon icon={faCamera} className="h-[13px] w-[13px]" />
          </span>
        </footer>
      </div>

      {helpOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setHelpOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            className="w-full max-w-lg rounded-xl border border-line bg-surface p-5 shadow-[0_24px_80px_rgba(15,23,42,0.24)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="help-title" className="text-lg font-extrabold text-ink">How the simulator works</h2>
                <p className="mt-2 text-sm leading-6 text-secondary">
                  Distance, focal length, aperture and sensor size all affect the near and far limits of acceptable sharpness. Change one control at a time and watch the focus region and calculated values update together.
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setHelpOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line bg-white text-lg font-bold text-secondary hover:text-ink"
                aria-label="Close help"
              >
                ×
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

export default App;
