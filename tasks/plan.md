# Implementation Plan: On-device Gym Form Coach

## Overview
A free web app (installable as a PWA) that coaches you through a gym plan (Chest day,
Shoulder day, Leg day) live through the phone camera. For each exercise it shows where to
place the phone, counts reps, checks form, and tells you what is wrong and how to fix it,
by voice and on screen. It also runs the rest timer between sets. Everything runs on the
device: no server, and no video leaves the phone. It works on iPhone, Android and laptop
browsers, so friends just open a link.

## Decisions

### Train from scratch or fine-tune?
**Neither for the pose model: use pretrained. No training needed for the MVP.**

| Part | Approach | Why |
|---|---|---|
| Pose model (image -> body points) | **Pretrained MediaPipe Pose Landmarker** | Built for fitness. 33 points including heels and toes, rough 3D, built-in tracking. Proven live in iPhone Safari. Free (Apache-2.0). |
| Form checking | **Rules on joint angles** (one JSON file per exercise) | Needs no training data, and each cue says exactly what is wrong |
| Which exercise is happening | **Not needed:** the plan already knows the next exercise | Removes a whole model from the MVP |
| Fallback if MediaPipe fails on lying exercises (bench press) | **RTMPose on ONNX Runtime Web**, fine-tuned if needed | Can be retrained, unlike MediaPipe. Only built if Task 2 shows MediaPipe fails. It looks at a cropped person, so it also needs a small person detector or a crop taken from the previous frame. |

ONNX Runtime and INT8 quantisation only come into play if RTMPose is needed, or later if we
add learned form models. A free personal app does not need them on day one.

### Platform: one web app for every device
- **Vite + React + TypeScript, installable as a PWA.** One codebase covers iPhone, Android and laptop.
  No App Store, no $99/year Apple fee, and updates reach everyone right away.
- **Free hosting** on Cloudflare (static files on Workers): https://gym-form-coach.gym-form-coach.workers.dev.
  HTTPS is required for camera access, and Cloudflare provides it.
- **Voice** uses the browser's built-in speech (Web Speech API): free and works offline.
  English first. All cue text lives in one strings file, so other languages are easy to add later.
- **History** (sets, reps, form score per set) is stored on the device only.
- **Works with weak gym signal:** the PWA saves the app and the MediaPipe model files on the device
  (MediaPipe's own examples load them from the internet), so it runs after the first load with no connection.
- **Screen stays awake** during a workout (Screen Wake Lock). Test it on the iPhone in home-screen mode.
- **Logic is pure TypeScript** (geometry, rep counting, rules, feedback). It is tested with
  Vitest on saved keypoint JSON from recorded clips, so tests never need a camera or model.

### Camera view
One camera sees in 2D, so each exercise sets its view (side or front). The intro screen
shows where to put the phone, and the app checks the view before the set starts.

**Which camera:** the front camera is the default, so you can see yourself and the cues and correct
yourself. A switch button changes to the back camera (sharper image, but you cannot see the screen).
- The front image is mirrored like a mirror. The skeleton overlay and the left/right checks handle this in one place.
- In front-view exercises (overhead press, lateral raise) you face the screen. In side-view exercises the
  screen faces sideways, so voice cues and big text do most of the work. Task 2 also tries a 45° angle.

### Public clips for early tuning
Gym recording (Task 3) takes time, so tuning does not have to wait for it. The Mendeley multi-view set
(CC BY 4.0: squat, push-up and dumbbell shoulder press, good and bad form, front/side/diagonal views) can go
through the same `/extract` page and be used for the first rule tuning. Fitness-AQA (squat, overhead press) is
non-commercial: fine for personal testing, keep it out of anything sold. Your own clips stay the final test:
we found no public set with bench, incline, fly, lateral/front raise, rear delt fly or calf raise from a phone's side view.

## Exercises (MVP: 4 per day)
The view is where the phone points at you. Thresholds get tuned on your recorded clips.

| Day | Exercise | View | Rep counted by | Form checks |
|---|---|---|---|---|
| Chest | Push-up | side | elbow angle | hips sagging or piking, depth, full lockout |
| Chest | Flat bench press (bar or DB) | side | elbow angle | depth, lockout, hips stay on bench, wrists over elbows |
| Chest | Incline DB press | side | elbow angle | depth, lockout, wrists over elbows |
| Chest | Dumbbell fly | side | shoulder angle | elbows keep a fixed slight bend (no pressing), not too deep |
| Shoulder | Overhead press | front | elbow angle + wrist height | lockout, lower to chin, left/right even |
| Shoulder | Lateral raise | front | arm angle from body | up to shoulder height and not above, no swinging, even |
| Shoulder | Front raise | side | arm angle | shoulder height, no torso swing, arms near straight |
| Shoulder | Rear delt fly (bent over) | side | arm angle | torso stays bent over and still, no bouncing |
| Leg | Squat (barbell or goblet) | side | knee angle | depth (hip to knee level), chest up, heels stay down |
| Leg | Lunge / Bulgarian split squat | side | front knee angle | depth, torso upright, front knee over the foot |
| Leg | Romanian deadlift | side | hip angle | soft fixed knees (not a squat), hips back, hands close to legs |
| Leg | Standing calf raise | side | heel height | full range, pause at top, knees straight |

**What it cannot see:** a rounded back (the model only gives a shoulder-to-hip line, not
the spine), and the bar or dumbbells themselves (wrists stand in for them). Machine
exercises (leg press, pec deck, cables) are left out for now: the machine blocks the body
and guides the movement anyway.

**Later:** Back day and Arm day (after Checkpoint B), a plan editor, other languages, learned form models
(ONNX), and auto-detecting the exercise.

## Targets
| Metric | Target |
|---|---|
| iPhone 15 live | ≥ 20 FPS |
| Laptop browser live | ≥ 30 FPS |
| Fault happens -> visual cue | ≤ 300 ms |
| Rep count on test clips | ≥ 95% correct |
| Form cues on test clips | precision ≥ 85%, recall ≥ 70% |
| Cue readable from | 2-3 m away (big text, big rep counter) |

## Project layout
```
src/
  pose/          MediaPipe wrapper (+ RTMPose/ORT Web if needed)
  core/          geometry.ts, smoothing.ts, reps.ts, rules.ts, feedback.ts   (pure, unit-tested)
  voice.ts       Web Speech wrapper
  ui/            day picker, exercise intro, live set screen, rest timer, summary
data/
  exercises/     squat.json, pushup.json, ...   (view, rep angle, checks, cue text)
  plans/         chest.json, shoulder.json, leg.json   (exercises, sets x reps, rest)
test-data/clips/ recorded clips, labels.json, extracted keypoint JSON
tests/
```

## Task list (details in `tasks/todo.md`)

### Phase 0: Prove the riskiest parts first
- [ ] Task 1: Web app skeleton, deployed, camera opens on your iPhone
- [ ] Task 2: Pose test page: MediaPipe (lite/full/heavy) speed + quality on iPhone and laptop
- [ ] Task 3: Record test clips at the gym + keypoint export page

### Checkpoint A: Pose model confirmed on your phone; bench-press tracking checked; clips recorded

### Phase 1: One exercise end to end (squat)
- [ ] Task 4: Live camera + pose + skeleton overlay + smoothing
- [ ] Task 5: Geometry + view check
- [ ] Task 6: Rules engine + rep counter + squat rules + clip scoring
- [ ] Task 7: Feedback manager + voice + big on-screen cues

### Checkpoint B: Squat coaching works live on your iPhone at the gym

### Phase 2: Workout plans
- [ ] Task 8: Plan flow: day picker -> exercise intro -> set -> rest timer -> summary + history
- [ ] Task 9: Leg day (lunge, Romanian deadlift, calf raise)
- [ ] Task 10: Shoulder day (overhead press, lateral raise, front raise, rear delt fly)
- [ ] Task 11: Chest day (push-up, bench press, incline press, fly)
- [ ] Task 11b: *(only if Task 2 shows MediaPipe fails lying down)* RTMPose on ONNX Runtime Web for lying exercises

### Checkpoint C: All three days work at the gym and score at target on the clips

### Phase 3: Fast, polished, shareable
- [ ] Task 12: Speed: pick the model size per device, pose in a Web Worker, skip frames
- [ ] Task 13: Share with friends: install-as-app guide, privacy note, disclaimer, final deploy

### Checkpoint D: MVP done; friends can use it

## Risks and mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| MediaPipe loses track on bench press / incline (lying down) | High | Test in Task 2 first. Fallback is Task 11b (RTMPose, fine-tunable). |
| Phone placement at the gym (crowded, wrong angle) | High | Exercise intro shows the phone position; the view check blocks the set until it is right |
| Wrong or noisy cues annoy users | High | Fault must last N frames, cooldowns, max 1 voice cue per rep, clip scoring |
| iOS Safari quirks (speech needs a tap first, camera in PWA mode) | Med | Tap-to-start screen unlocks audio; test on iPhone from Task 1 |
| Rounded back cannot be detected | Med | Say so in the exercise intro; never claim a check the app cannot make |
| Users read cues as medical advice | Med | Disclaimer. Cues are about technique only. |
| Screen faces sideways in side-view exercises (front camera) | Med | Voice cues first, big text; try a 45° angle in Task 2 |
| Phone screen locks mid-set | Med | Screen Wake Lock; test on the iPhone in home-screen mode |
| Weak gym signal | Med | App and model files saved on the device (PWA) |

## Answered questions
1. Which iPhone? **iPhone 15.** It sets the speed target and the model size (Task 2 compares lite and full).
2. Are these 12 exercises right? **Keep the 12 for the first version.** Back day and Arm day come after Checkpoint B (squat coaching works).
3. Which camera? **Both: front by default** (you can see yourself and the cues), with a switch to the back camera.
