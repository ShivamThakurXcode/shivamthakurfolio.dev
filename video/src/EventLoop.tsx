import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

// ---- Timing table (frames @30fps). Retime here to match the voiceover. ----
const T = {
  hookEnd: 120, // 0-4s   "What prints?"
  threadEnd: 300, // 4-10s  one thread
  stack: 300, // 10-18s call stack
  webapi: 540, // 18-26s web APIs
  queues: 780, // 26-34s queues
  sync: 1020, // 34-38s log(4), stack empties
  loop: 1140, // 38-50s event loop
  reveal: 1500, // 50-56s answer
  cta: 1680, // 56-60s rule + follow
};

const C = {
  bg: '#0d1117',
  panel: '#161b22',
  border: '#30363d',
  text: '#e6edf3',
  dim: '#7d8590',
  sync: '#f7df1e',
  task: '#ff8a3d',
  micro: '#b48cff',
  web: '#3fb8ff',
  ok: '#3fb950',
  bad: '#f85149',
};
const MONO = "Consolas, 'JetBrains Mono', monospace";
const SANS = "'Segoe UI', Inter, Arial, sans-serif";

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.inOut(Easing.cubic);
const fade = (f: number, a: number, b: number, d = 12) =>
  interpolate(f, [a, a + d, b - d, b], [0, 1, 1, 0], clamp);

// ---- Code ----
type Tok = [string, string];
const CODE: Tok[][] = [
  [['console', C.web], ['.log(', C.text], ['1', C.sync], [');', C.text]],
  [['setTimeout', C.task], ['(() => ', C.text], ['console', C.web], ['.log(', C.text], ['2', C.sync], ['), 0);', C.text]],
  [['Promise', C.micro], ['.resolve().', C.text], ['then', C.micro], ['(() => ', C.text], ['console', C.web], ['.log(', C.text], ['3', C.sync], ['));', C.text]],
  [['console', C.web], ['.log(', C.text], ['4', C.sync], [');', C.text]],
];

const Code: React.FC<{active?: number; size?: number}> = ({active = -1, size = 34}) => (
  <div style={{fontFamily: MONO, fontSize: size, lineHeight: 1.6}}>
    {CODE.map((line, i) => (
      <div
        key={i}
        style={{
          padding: '0 16px',
          borderLeft: `6px solid ${i === active ? C.sync : 'transparent'}`,
          background: i === active ? 'rgba(247,223,30,0.12)' : 'transparent',
          opacity: active === -1 || i === active ? 1 : 0.45,
          whiteSpace: 'pre',
        }}
      >
        {line.map(([t, c], j) => (
          <span key={j} style={{color: c}}>{t}</span>
        ))}
      </div>
    ))}
  </div>
);

// ---- Board layout ----
const BOX = {
  code: {x: 60, y: 300, w: 960, h: 320},
  stack: {x: 60, y: 660, w: 460, h: 340},
  web: {x: 560, y: 660, w: 460, h: 340},
  micro: {x: 60, y: 1040, w: 960, h: 130},
  task: {x: 60, y: 1200, w: 960, h: 130},
  console: {x: 60, y: 1370, w: 960, h: 180},
};
const P = {
  stack: {x: 90, y: 905},
  web: {x: 590, y: 800},
  micro: {x: 580, y: 1070},
  task: {x: 580, y: 1230},
};

const Box: React.FC<{b: typeof BOX.code; label: string; color: string; glow: boolean; children?: React.ReactNode}> = ({b, label, color, glow, children}) => (
  <div
    style={{
      position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h,
      background: C.panel, borderRadius: 24, border: `3px solid ${glow ? color : C.border}`,
      boxShadow: glow ? `0 0 40px ${color}66` : 'none', overflow: 'hidden',
    }}
  >
    <div style={{fontFamily: SANS, fontWeight: 800, fontSize: 30, letterSpacing: 2, color, padding: '16px 24px'}}>{label}</div>
    {children}
  </div>
);

// Chip moving between positions via keyframes
type K = {f: number; at: {x: number; y: number}; o?: number};
const Chip: React.FC<{frame: number; keys: K[]; label: string; color: string}> = ({frame, keys, label, color}) => {
  const fs = keys.map((k) => k.f);
  const x = interpolate(frame, fs, keys.map((k) => k.at.x), {...clamp, easing: ease});
  const y = interpolate(frame, fs, keys.map((k) => k.at.y), {...clamp, easing: ease});
  const o = interpolate(frame, fs, keys.map((k) => k.o ?? 1), clamp);
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: 400, height: 72, opacity: o,
        borderRadius: 16, background: `${color}22`, border: `3px solid ${color}`,
        color, fontFamily: MONO, fontSize: 30, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {label}
    </div>
  );
};

const up = (p: {x: number; y: number}) => ({x: p.x, y: p.y - 60});

// ---- Scenes ----
const Hook: React.FC<{f: number}> = ({f}) => {
  const {fps} = useVideoConfig();
  const pop = spring({frame: f, fps, config: {damping: 12}});
  const strike = interpolate(f, [70, 82], [0, 1], clamp);
  return (
    <AbsoluteFill style={{opacity: fade(f, -1, T.hookEnd, 10), alignItems: 'center', justifyContent: 'center', gap: 60}}>
      <div style={{fontFamily: SANS, fontWeight: 900, fontSize: 56, color: C.bad, letterSpacing: 2}}>MOST DEVS GET THIS WRONG</div>
      <div style={{fontFamily: SANS, fontWeight: 900, fontSize: 110, color: C.text, transform: `scale(${pop})`, marginTop: -30}}>
        What prints<span style={{color: C.sync}}>?</span>
      </div>
      <div style={{background: C.panel, border: `3px solid ${C.border}`, borderRadius: 24, padding: '30px 10px'}}>
        <Code size={32} />
      </div>
      <div style={{position: 'relative', fontFamily: MONO, fontSize: 100, fontWeight: 800, color: C.dim, opacity: interpolate(f, [40, 50], [0, 1], clamp)}}>
        1 2 3 4
        <div style={{position: 'absolute', left: -20, top: '50%', height: 12, width: `${strike * 110}%`, background: C.bad, borderRadius: 6}} />
      </div>
      <div style={{fontFamily: SANS, fontWeight: 800, fontSize: 60, color: C.bad, opacity: interpolate(f, [85, 95], [0, 1], clamp)}}>
        Nope. Here's why 👇
      </div>
    </AbsoluteFill>
  );
};

const Thread: React.FC<{f: number}> = ({f}) => {
  const t = f - T.hookEnd;
  const dot = interpolate(t, [20, 160], [0, 1], {...clamp, easing: ease});
  const tasks = ['task A', 'task B', 'task C'];
  return (
    <AbsoluteFill style={{opacity: fade(f, T.hookEnd, T.threadEnd), alignItems: 'center', justifyContent: 'center', gap: 70}}>
      <div style={{fontFamily: SANS, fontWeight: 900, fontSize: 96, color: C.text, textAlign: 'center', lineHeight: 1.1}}>
        JavaScript has<br />
        <span style={{color: C.sync, fontSize: 150}}>ONE</span> thread
      </div>
      <div style={{position: 'relative', width: 900, height: 120}}>
        <div style={{position: 'absolute', top: 54, width: '100%', height: 12, background: C.border, borderRadius: 6}} />
        {tasks.map((name, i) => (
          <div key={name} style={{position: 'absolute', left: 120 + i * 280, top: 0, fontFamily: MONO, fontSize: 30, color: dot * 900 > 120 + i * 280 ? C.ok : C.dim}}>
            {name}
          </div>
        ))}
        <div style={{position: 'absolute', left: dot * 860, top: 40, width: 40, height: 40, borderRadius: 20, background: C.sync, boxShadow: `0 0 30px ${C.sync}`}} />
      </div>
      <div style={{fontFamily: SANS, fontSize: 56, color: C.dim, opacity: interpolate(t, [60, 75], [0, 1], clamp)}}>
        One thing at a time.
      </div>
      <div style={{fontFamily: SANS, fontWeight: 800, fontSize: 64, color: C.text, opacity: interpolate(t, [110, 125], [0, 1], clamp)}}>
        So how do timers work? 🤔
      </div>
    </AbsoluteFill>
  );
};

const CAPTIONS: [number, number, string][] = [
  [T.stack, T.webapi, 'Line by line → CALL STACK'],
  [T.webapi, T.queues, 'setTimeout? Sent to the browser'],
  [T.queues, T.sync, 'Promises get the VIP line 👑'],
  [T.sync, T.loop, 'Stack empty. Now what?'],
  [T.loop, T.reveal, 'The EVENT LOOP wakes up'],
];

const LOOP_NOTES: [number, string, string][] = [
  [T.loop + 20, 'Stack empty? ✓', C.ok],
  [T.loop + 80, 'VIP line FIRST 👑', C.micro],
  [T.loop + 230, 'Then the timer', C.task],
];

const Board: React.FC<{f: number}> = ({f}) => {
  const activeLine = f >= 330 && f < 460 ? 0 : f >= 540 && f < 660 ? 1 : f >= 800 && f < 920 ? 2 : f >= 1020 && f < 1110 ? 3 : -1;
  const between = (a: number, b: number) => f >= a && f < b;
  const printed: [number, string][] = [[450, '1'], [1110, '4'], [1320, '3'], [1470, '2']];
  const caption = CAPTIONS.find(([a, b]) => between(a, b));
  const inLoop = between(T.loop, T.reveal);
  const note = [...LOOP_NOTES].reverse().find(([s]) => f >= s);

  return (
    <AbsoluteFill style={{opacity: fade(f, T.stack, T.reveal, 15)}}>
      {/* caption */}
      {caption && (
        <div
          key={caption[2]}
          style={{
            position: 'absolute', top: 200, width: '100%', textAlign: 'center',
            fontFamily: SANS, fontWeight: 900, fontSize: 58, color: C.text,
            opacity: fade(f, caption[0], caption[1], 8),
          }}
        >
          {caption[2]}
        </div>
      )}

      <Box b={BOX.code} label="main.js" color={C.dim} glow={false}>
        <div style={{paddingTop: 6}}>
          <Code active={activeLine} />
        </div>
      </Box>
      <Box b={BOX.stack} label="CALL STACK" color={C.sync} glow={between(T.stack, T.webapi) || between(T.sync, T.reveal)} />
      <Box b={BOX.web} label="WEB APIs" color={C.web} glow={between(T.webapi, T.queues)}>
        {between(620, 730) && (
          <div style={{position: 'absolute', bottom: 40, width: '100%', textAlign: 'center', fontFamily: MONO, fontSize: 34, color: C.web}}>
            ⏱ 0ms… {f >= 700 ? 'done ✓' : 'waiting'}
          </div>
        )}
      </Box>
      <Box b={BOX.micro} label="MICROTASK QUEUE" color={C.micro} glow={between(T.queues, T.sync) || between(T.loop + 60, T.loop + 200)} />
      <Box b={BOX.task} label="TASK QUEUE" color={C.task} glow={between(700, 780) || between(T.loop + 210, T.reveal)} />
      <Box b={BOX.console} label="CONSOLE" color={C.ok} glow={printed.some(([pf]) => between(pf, pf + 20))}>
        <div style={{display: 'flex', gap: 50, padding: '0 30px', fontFamily: MONO, fontSize: 80, fontWeight: 800, color: C.text}}>
          {printed.map(([pf, v]) => {
            const s = interpolate(f, [pf, pf + 8], [0, 1], clamp);
            return <span key={v} style={{opacity: s, transform: `scale(${0.5 + s * 0.5})`}}>{v}</span>;
          })}
        </div>
      </Box>

      {/* chips */}
      <Chip frame={f} label="console.log(1)" color={C.sync} keys={[
        {f: 330, at: up(P.stack), o: 0}, {f: 345, at: P.stack}, {f: 435, at: P.stack}, {f: 455, at: up(P.stack), o: 0},
      ]} />
      <Chip frame={f} label="setTimeout cb" color={C.task} keys={[
        {f: 540, at: up(P.stack), o: 0}, {f: 555, at: P.stack}, {f: 610, at: P.stack}, {f: 645, at: P.web},
        {f: 720, at: P.web}, {f: 755, at: P.task}, {f: 1380, at: P.task}, {f: 1410, at: P.stack}, {f: 1455, at: P.stack}, {f: 1470, at: up(P.stack), o: 0},
      ]} />
      <Chip frame={f} label="then cb" color={C.micro} keys={[
        {f: 800, at: up(P.stack), o: 0}, {f: 815, at: P.stack}, {f: 870, at: P.stack}, {f: 905, at: P.micro},
        {f: 1230, at: P.micro}, {f: 1260, at: P.stack}, {f: 1305, at: P.stack}, {f: 1320, at: up(P.stack), o: 0},
      ]} />
      <Chip frame={f} label="console.log(4)" color={C.sync} keys={[
        {f: 1020, at: up(P.stack), o: 0}, {f: 1035, at: P.stack}, {f: 1095, at: P.stack}, {f: 1110, at: up(P.stack), o: 0},
      ]} />

      {/* event loop spinner + notes, in the Web APIs box spot */}
      {inLoop && (
        <div style={{position: 'absolute', left: BOX.web.x, top: BOX.web.y, width: BOX.web.w, height: BOX.web.h, background: C.panel, borderRadius: 24, border: `3px solid ${C.sync}`, boxShadow: `0 0 40px ${C.sync}66`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, opacity: interpolate(f, [T.loop, T.loop + 12], [0, 1], clamp)}}>
          <div style={{fontSize: 140, color: C.sync, transform: `rotate(${(f - T.loop) * 6}deg)`, lineHeight: 1}}>↻</div>
          <div style={{fontFamily: SANS, fontWeight: 900, fontSize: 36, color: C.sync, letterSpacing: 2}}>EVENT LOOP</div>
          {note && <div key={note[1]} style={{fontFamily: SANS, fontWeight: 800, fontSize: 40, color: note[2]}}>{note[1]}</div>}
        </div>
      )}
    </AbsoluteFill>
  );
};

const Reveal: React.FC<{f: number}> = ({f}) => {
  const {fps} = useVideoConfig();
  const t = f - T.reveal;
  const digits = ['1', '4', '3', '2'];
  const colors = [C.sync, C.sync, C.micro, C.task];
  return (
    <AbsoluteFill style={{opacity: fade(f, T.reveal, T.cta), alignItems: 'center', justifyContent: 'center', gap: 50}}>
      <div style={{fontFamily: SANS, fontWeight: 800, fontSize: 64, color: C.dim}}>The answer:</div>
      <div style={{display: 'flex', gap: 50}}>
        {digits.map((d, i) => {
          const s = spring({frame: t - 10 - i * 12, fps, config: {damping: 10}});
          return <div key={d} style={{fontFamily: MONO, fontWeight: 900, fontSize: 220, color: colors[i], transform: `scale(${s})`}}>{d}</div>;
        })}
      </div>
      <div style={{fontFamily: SANS, fontWeight: 800, fontSize: 60, color: C.text, opacity: interpolate(t, [80, 95], [0, 1], clamp)}}>
        Not 1 2 3 4 🤯
      </div>
      <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 46, color: C.dim, textAlign: 'center', opacity: interpolate(t, [110, 125], [0, 1], clamp)}}>
        A 0ms timer still loses to a Promise.
      </div>
    </AbsoluteFill>
  );
};

const Cta: React.FC<{f: number}> = ({f}) => {
  const t = f - T.cta;
  const steps: [string, string][] = [['Sync code', C.sync], ['Microtasks', C.micro], ['Tasks', C.task]];
  return (
    <AbsoluteFill style={{opacity: interpolate(t, [0, 12], [0, 1], clamp), alignItems: 'center', justifyContent: 'center', gap: 50}}>
      <div style={{fontFamily: SANS, fontWeight: 900, fontSize: 80, color: C.text}}>Remember:</div>
      {steps.map(([s, c], i) => (
        <React.Fragment key={s}>
          {i > 0 && <div style={{fontSize: 70, color: C.dim, opacity: interpolate(t, [i * 15, i * 15 + 8], [0, 1], clamp)}}>↓</div>}
          <div style={{fontFamily: SANS, fontWeight: 900, fontSize: 90, color: c, opacity: interpolate(t, [i * 15, i * 15 + 8], [0, 1], clamp)}}>{s}</div>
        </React.Fragment>
      ))}
      <div style={{marginTop: 40, padding: '24px 50px', borderRadius: 60, background: C.sync, color: C.bg, fontFamily: SANS, fontWeight: 900, fontSize: 52, opacity: interpolate(t, [55, 65], [0, 1], clamp)}}>
        Follow for more JS in 60s
      </div>
    </AbsoluteFill>
  );
};

export const EventLoop: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: C.bg}}>
      {f < T.hookEnd && <Hook f={f} />}
      {f >= T.hookEnd && f < T.threadEnd && <Thread f={f} />}
      {f >= T.stack && f < T.reveal && <Board f={f} />}
      {f >= T.reveal && f < T.cta && <Reveal f={f} />}
      {f >= T.cta && <Cta f={f} />}
    </AbsoluteFill>
  );
};
