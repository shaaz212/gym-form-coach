# Tasks: On-device Gym Form Coach

See `tasks/plan.md` for decisions, the exercise table and risks.

## Status (2026-10-30)
- **Task 1:** built and live at https://gym-form-coach.gym-form-coach.workers.dev. The front camera works
  on the iPhone 15. Still to check: laptop camera, the back-camera switch, adding to the home screen.
- **Task 2:** `/bench` page built and live. iPhone 15, lite model on GPU: 13.8 ms/frame (~73 FPS).
  Still to do: lite/full/heavy comparison (whole body in view), the gym bench-press test, and
  `docs/decisions/001-pose-model.md`.
- **Next:** start Tasks 4 and 5 with the lite model (changing size later is one setting); the gym test runs alongside.
- **New machine:** `npm install`, then `npx wrangler login` once before `npm run deploy`.
- **Branches:** work on `dev`; merge into `main` when a version is ready to go live.

## Phase 0: Prove the riskiest parts first

### Task 1: Web app skeleton
**Description:** Vite + React + TypeScript + Vitest + PWA manifest. A "tap to start" screen
opens the front camera and shows the video (mirrored like a mirror), with a switch button for the back
camera. Deploy it to Cloudflare (`npm run deploy`).
**Acceptance criteria:**
- [ ] The deployed link opens the front camera on your iPhone 15 (Safari) and on the laptop
- [ ] The switch button changes to the back camera and back
- [ ] Can be added to the iPhone home screen and opens full screen
**Verification:** `npm run build`, `npm test`; open the deployed URL on the phone
**Dependencies:** None | **Scope:** S

### Task 2: Pose test page
**Description:** A `/bench` page runs MediaPipe Pose Landmarker (lite, full, heavy) live and
on uploaded videos. It shows ms/frame and FPS and draws all 33 points. Try it while lying on
a bench, with arms overhead, and side-on with a barbell. Also try the front and back cameras, and a 45° angle
for side-view exercises (so you can see the screen). Write the result in `docs/decisions/001-pose-model.md`.
**Acceptance criteria:**
- [ ] FPS table for each model size on your iPhone 15 and the laptop
- [ ] Clear yes/no: does tracking hold while lying on a bench? (decides Task 11b)
**Verification:** open `/bench` on both devices; the decision doc exists
**Dependencies:** 1 | **Scope:** M

### Task 3: Record test clips + keypoint export
**Description:** Record at the gym: each of the 12 exercises from its set view, with about
3 clips of clean reps and 2 with typical faults. `labels.json` records the exercise, rep
count and which reps have which fault. An `/extract` page runs the pose model on each clip
and saves keypoint JSON, so tests run without a camera or model. Also run the public Mendeley multi-view
clips (CC BY 4.0: squat, push-up, shoulder press) through `/extract`, so tuning can start before all gym clips exist.
**Acceptance criteria:**
- [ ] Every exercise has clips with good and faulty reps, labelled
- [ ] Keypoint JSON exists for every clip
**Verification:** `npm run check-clips` finds every clip, its labels and its keypoints
**Dependencies:** 2 | **Scope:** M (mostly gym time; can be done in parts per day)

## Checkpoint A
- [ ] Model size chosen for your phone; bench-press tracking decided
- [ ] At least the squat clips are ready (the other exercises can follow)
- [ ] Review together

## Phase 1: One exercise end to end (squat)

### Task 4: Live pose + overlay
**Description:** Camera -> MediaPipe -> One Euro smoothing -> skeleton drawn over the
video, with an FPS readout. Portrait and landscape both work. The PWA saves the model files (WASM and
`.task`) on the device, so they do not load from the internet.
**Acceptance criteria:**
- [ ] Meets the FPS target on your iPhone 15; points are steady when standing still
- [ ] The skeleton lines up with the mirrored front-camera video, and left/right are correct on both cameras
- [ ] After the first load, the app and model work with no internet (test in airplane mode)
**Verification:** `npm test -- smoothing`; live check on the phone
**Dependencies:** 2 | **Scope:** S

### Task 5: Geometry + view check
**Description:** `core/geometry.ts`: joint angle, segment angle against vertical, scale by
torso length, side/front view detection, and point visibility.
**Acceptance criteria:**
- [ ] Unit tests with hand-made points give the right angles
- [ ] View detection is correct on all recorded clips
**Verification:** `npm test -- geometry`
**Dependencies:** 1 | **Scope:** S

### Task 6: Rules engine + rep counter + squat
**Description:** `core/reps.ts` tracks the phases (top -> down -> bottom -> up) from the
rep angle, with hysteresis. `core/rules.ts` evaluates the check types listed in a JSON file:
angle range per phase, range of motion reached, stays still, left/right even, and point
above/below another point. `data/exercises/squat.json`. `npm run score` reports rep
accuracy and cue precision/recall over the clip keypoints.
**Acceptance criteria:**
- [ ] Squat clips: rep count ≥ 95% correct, cue precision ≥ 85%, recall ≥ 70%
**Verification:** `npm test`; `npm run score -- squat`
**Dependencies:** 5, and clips from 3 (the public squat clips are enough to start) | **Scope:** M

### Task 7: Feedback + voice + cues
**Description:** `core/feedback.ts`: a fault must last N frames, the most important fault
wins, each cue has a cooldown, and there is at most 1 voice cue per rep. "Good rep" counts
as positive feedback. Speech goes through Web Speech. The screen shows a big rep counter, the
faulty joint in red, and a one-line fix ("Chest up").
**Acceptance criteria:**
- [ ] The same cue never repeats within the cooldown; voice works on iPhone after tap-to-start
- [ ] The cue is readable from 2-3 m away
**Verification:** `npm test -- feedback`; live squat set on the phone
**Dependencies:** 4, 6 | **Scope:** S

## Checkpoint B
- [ ] A real squat set at the gym: right rep count, useful cues, not annoying
- [ ] Review together before adding exercises

## Phase 2: Workout plans

### Task 8: Plan flow + history
**Description:** `data/plans/*.json` (exercises, sets × reps, rest time). Screens: day
picker -> exercise intro (phone position picture plus the checks it makes) -> live set
-> rest timer (with voice countdown) -> next exercise -> day summary. Saves history per set on the device.
**Acceptance criteria:**
- [ ] A full plan can be run start to finish with no laptop
- [ ] History survives closing the app
- [ ] The screen stays on for a whole plan run, in home-screen mode on the iPhone (Screen Wake Lock)
**Verification:** `npm test`; run Leg day on the phone
**Dependencies:** 7 | **Scope:** M

### Task 9: Leg day exercises
**Description:** JSON rules for lunge or Bulgarian split squat, Romanian deadlift and calf raise.
**Acceptance criteria:** each one meets the targets on its clips
**Verification:** `npm run score -- lunge rdl calf_raise`
**Dependencies:** 8 | **Scope:** S

### Task 10: Shoulder day exercises
**Description:** JSON rules for overhead press, lateral raise, front raise and rear delt fly.
**Acceptance criteria:** each one meets the targets on its clips
**Verification:** `npm run score -- ohp lateral_raise front_raise rear_delt_fly`
**Dependencies:** 8 | **Scope:** S

### Task 11: Chest day exercises
**Description:** JSON rules for push-up, flat bench press, incline DB press and DB fly.
**Acceptance criteria:** each one meets the targets on its clips
**Verification:** `npm run score -- pushup bench incline_press db_fly`
**Dependencies:** 8 (bench and incline also depend on 11b if Task 2 says no) | **Scope:** S

### Task 11b (only if needed): RTMPose fallback for lying exercises
**Description:** RTMPose-t/s on ONNX Runtime Web (WebGPU, WASM fallback) with INT8
quantisation. Fine-tune on bench-press frames on Colab if it is still not accurate enough.
RTMPose needs a cropped person image, so add a small person detector or crop around the last frame's points.
Used only for exercises marked `"pose": "rtmpose"`.
**Acceptance criteria:** bench and incline clips meet the targets; FPS target still met
**Verification:** `npm run score -- bench incline_press`; `/bench` page FPS
**Dependencies:** Checkpoint A decision | **Scope:** L

## Checkpoint C
- [ ] All three days run at the gym; all clips meet the targets

## Phase 3: Fast, polished, shareable

### Task 12: Speed
**Description:** Choose the model size per device, run pose in a Web Worker
(OffscreenCanvas), skip frames when slow, and fix any phone that runs too hot.
**Acceptance criteria:** FPS targets met across a 45-minute session
**Verification:** FPS log from a full plan run on the phone
**Dependencies:** C | **Scope:** S

### Task 13: Share with friends
**Description:** "Add to Home Screen" guide for iPhone and Android, a privacy note (video
never leaves the phone), a disclaimer (technique tips, not medical advice), and a final deploy.
**Acceptance criteria:** a friend can open the link and finish a day with no help from you
**Verification:** a friend tries it
**Dependencies:** 12 | **Scope:** S

## Checkpoint D
- [ ] MVP complete
