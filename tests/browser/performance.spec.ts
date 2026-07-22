import { expect, test } from "@playwright/test";

test("continues working after network loss and leaves reloads to the deployment", async ({ page }) => {
  await page.addInitScript(() => {
    const sourceContext = new AudioContext();
    const destination = sourceContext.createMediaStreamDestination();
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: () => Promise.resolve(destination.stream),
    });
  });

  await page.goto("/");
  await expect(page.getByRole("button", { name: "Start listening" })).toBeVisible();
  expect(await page.evaluate(async () => ({
    cacheKeys: await caches.keys(),
    registrations: await navigator.serviceWorker.getRegistrations(),
    controlled: navigator.serviceWorker.controller !== null,
  }))).toEqual({ cacheKeys: [], registrations: [], controlled: false });

  let offlineRequests = 0;
  page.on("request", () => { offlineRequests += 1; });
  await page.context().setOffline(true);
  await page.getByRole("button", { name: "Start listening" }).click();
  await expect(page.getByRole("button", { name: "Stop listening" })).toBeVisible();
  await page.locator(".preferences > summary").press("Enter");
  await page.getByLabel("Instrument").selectOption("b-flat-trumpet");
  await expect(page.getByRole("status").filter({ hasText: "Preference saved on this device." })).toBeVisible();
  expect(offlineRequests).toBe(0);

  await page.getByRole("button", { name: "Stop listening" }).click();
  expect(await page.evaluate(async () => ({
    cacheKeys: await caches.keys(),
    registrations: await navigator.serviceWorker.getRegistrations(),
  }))).toEqual({ cacheKeys: [], registrations: [] });
  await page.context().setOffline(false);
  const reloadRequests: string[] = [];
  const serviceWorkerResponses: boolean[] = [];
  page.on("request", (request) => { reloadRequests.push(request.url()); });
  page.on("response", (response) => { serviceWorkerResponses.push(response.fromServiceWorker()); });
  await page.reload();
  await expect(page.locator(".preferences > summary")).toContainText("B-flat trumpet");
  expect(reloadRequests.some((url) => url === `${new URL(page.url()).origin}/`)).toBe(true);
  expect(reloadRequests.some((url) => /\/assets\/[^/]+\.[a-z0-9]+$/.test(new URL(url).pathname))).toBe(true);
  expect(serviceWorkerResponses).not.toContain(true);
  expect(await page.evaluate(() => navigator.serviceWorker.controller)).toBeNull();
});

test("progressively reveals settings and keeps instrument controls available during capture", async ({ page }) => {
  await page.addInitScript(() => {
    const sourceContext = new AudioContext();
    const destination = sourceContext.createMediaStreamDestination();
    let resolveMicrophoneAccess: ((stream: MediaStream) => void) | undefined;

    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: () =>
        new Promise<MediaStream>((resolve) => {
          resolveMicrophoneAccess = resolve;
        }),
    });
    Object.defineProperty(window, "resolveMicrophoneAccess", {
      configurable: true,
      value: () => resolveMicrophoneAccess?.(destination.stream),
    });
  });

  await page.goto("/");
  const settings = page.locator(".preferences > summary");
  await expect(settings).toContainText("Instrument and input settings");
  await expect(page.getByLabel("Instrument")).not.toBeVisible();
  await settings.press("Enter");
  await expect(page.getByLabel("Instrument")).toBeVisible();
  const instrument = page.getByLabel("Instrument");
  const roomCalibration = page.getByRole("button", { name: "Calibrate room noise" });
  await expect(roomCalibration).toBeDisabled();

  await page.getByRole("button", { name: "Start listening" }).click();
  await expect(instrument).toBeEnabled();
  await expect(page.getByRole("status").filter({ hasText: "Changes apply immediately." })).toBeVisible();

  await page.evaluate(() => (window as typeof window & { resolveMicrophoneAccess(): void }).resolveMicrophoneAccess());
  await expect(page.getByRole("button", { name: "Stop listening" })).toBeVisible();
  await expect(instrument).toBeEnabled();
  await expect(roomCalibration).toBeEnabled();
  await roomCalibration.click();
  await expect(page.getByText("The room is already below the detector noise threshold. Calibration is not needed.")).toBeVisible({ timeout: 3_000 });

  await page.getByRole("button", { name: "Stop listening" }).click();
  await expect(roomCalibration).toBeDisabled();
  await expect(instrument).toBeEnabled();
  await expect(page.getByText("Concert instruments show concert notation. Transposing instruments show their written notation. Changes apply immediately.")).toBeVisible();
});

test("keeps instrument settings available after microphone startup fails", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: () => Promise.reject(new DOMException("Permission denied", "NotAllowedError")),
    });
  });

  await page.goto("/");
  await page.locator(".preferences > summary").press("Enter");
  await page.getByRole("button", { name: "Start listening" }).click();

  await expect(page.getByText("Microphone access was denied. Allow access and try again.")).toBeVisible();
  await expect(page.getByLabel("Instrument")).toBeEnabled();
  await expect(page.getByRole("group", { name: "Input filters" })).toBeVisible();
});

test("cancels pending microphone startup and releases the late stream without a duplicate request", async ({ page }) => {
  await page.addInitScript(() => {
    const state = { requests: 0, stops: 0 };
    let resolveRequest: ((stream: MediaStream) => void) | undefined;
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: () => {
        state.requests += 1;
        return new Promise<MediaStream>((resolve) => { resolveRequest = resolve; });
      },
    });
    Object.assign(window, {
      lifecycleState: state,
      resolveCanceledRequest: () => resolveRequest?.({
        getTracks: () => [{ stop: () => { state.stops += 1; } }],
      } as MediaStream),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Start listening" }).click();
  await expect(page.getByRole("button", { name: "Cancel starting" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel starting" }).click();
  await expect(page.getByText("Microphone startup canceled. No audio session is active.")).toBeVisible();
  await page.evaluate(() => (window as typeof window & { resolveCanceledRequest(): void }).resolveCanceledRequest());
  await expect.poll(() => page.evaluate(() => (window as typeof window & { lifecycleState: { stops: number } }).lifecycleState.stops)).toBe(1);
  expect(await page.evaluate(() => (window as typeof window & { lifecycleState: { requests: number } }).lifecycleState.requests)).toBe(1);
});

test("resumes a suspended context and recovers repeatedly from simulated device loss", async ({ page }) => {
  await page.addInitScript(() => {
    const state = { requests: 0, stops: 0, closes: 0, resumes: 0 };
    let currentTrack: (EventTarget & { readyState: MediaStreamTrackState; stop(): void }) | undefined;
    class TestTrack extends EventTarget {
      readyState: MediaStreamTrackState = "live";
      stop() { state.stops += 1; this.readyState = "ended"; }
      end() { this.readyState = "ended"; this.dispatchEvent(new Event("ended")); }
    }
    class TestAudioContext extends EventTarget {
      static current: TestAudioContext | undefined;
      readonly sampleRate = 48_000;
      state: AudioContextState = "running";
      constructor() { super(); TestAudioContext.current = this; }
      createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
      createAnalyser() {
        return {
          fftSize: 4_096,
          frequencyBinCount: 2_048,
          minDecibels: -100,
          maxDecibels: -30,
          disconnect() {},
          getFloatTimeDomainData(frame: Float32Array) { frame.fill(0); },
          getFloatFrequencyData(frame: Float32Array) { frame.fill(-100); },
        };
      }
      resume() { state.resumes += 1; this.state = "running"; this.dispatchEvent(new Event("statechange")); return Promise.resolve(); }
      close() { state.closes += 1; this.state = "closed"; return Promise.resolve(); }
      suspendForTest() { this.state = "suspended"; this.dispatchEvent(new Event("statechange")); }
    }
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: () => {
        state.requests += 1;
        currentTrack = new TestTrack();
        return Promise.resolve({ getTracks: () => [currentTrack] } as unknown as MediaStream);
      },
    });
    Object.defineProperty(window, "AudioContext", { configurable: true, value: TestAudioContext });
    Object.assign(window, {
      lifecycleState: state,
      suspendAudio: () => TestAudioContext.current?.suspendForTest(),
      endTrack: () => (currentTrack as TestTrack | undefined)?.end(),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Start listening" }).click();
  await expect(page.getByRole("button", { name: "Stop listening" })).toBeVisible();
  await page.evaluate(() => (window as typeof window & { suspendAudio(): void }).suspendAudio());
  await expect(page.getByRole("button", { name: "Resume listening" })).toBeVisible();
  await page.getByRole("button", { name: "Resume listening" }).click();
  await expect(page.getByRole("button", { name: "Stop listening" })).toBeVisible();

  for (const expectedRequests of [2, 3]) {
    await page.evaluate(() => (window as typeof window & { endTrack(): void }).endTrack());
    await expect(page.getByText("The microphone disconnected. Connect it and try again.")).toBeVisible();
    await page.getByRole("button", { name: "Start listening" }).click();
    await expect(page.getByRole("button", { name: "Stop listening" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as typeof window & { lifecycleState: { requests: number } }).lifecycleState.requests)).toBe(expectedRequests);
  }

  await page.getByRole("button", { name: "Stop listening" }).click();
  const counts = await page.evaluate(() => (window as typeof window & {
    lifecycleState: { requests: number; stops: number; closes: number; resumes: number };
  }).lifecycleState);
  expect(counts).toEqual({ requests: 3, stops: 3, closes: 3, resumes: 1 });
});

test("keeps settings usable on a small screen and restores saved preferences", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  await page.locator(".preferences > summary").press("Enter");
  await page.getByLabel("Instrument").selectOption("b-flat-trumpet");
  await expect(page.getByRole("status").filter({ hasText: "Preference saved on this device." })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("live-staff.preferences"))).toBe(
    '{"instrumentId":"b-flat-trumpet","mainsHumFrequency":"off","inputFilters":[]}',
  );

  await page.reload();
  await expect(page.locator(".preferences > summary")).toContainText("B-flat trumpet");
  await page.locator(".preferences > summary").press("Enter");
  await expect(page.getByLabel("Instrument")).toHaveValue("b-flat-trumpet");
});

test("migrates a legacy concert-display preference and renders the B-flat trumpet's written staff", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "live-staff.preferences",
      JSON.stringify({ instrumentId: "b-flat-trumpet", pitchDisplay: "concert", mainsHumFrequency: "off" }),
    );

    class TestAudioContext {
      readonly sampleRate = 44_100;
      readonly state = "running";

      createMediaStreamSource() {
        return { connect() {}, disconnect() {} };
      }

      createAnalyser() {
        let sample = 0;
        return {
          fftSize: 0,
          connect() {},
          disconnect() {},
          getFloatTimeDomainData(frame: Float32Array) {
            for (let index = 0; index < frame.length; index += 1) {
              frame[index] = Math.sin((2 * Math.PI * 261.625565 * (sample + index)) / 44_100);
            }
            sample += frame.length;
          },
        };
      }

      close() {
        return Promise.resolve();
      }
    }

    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: () => Promise.resolve({ getTracks: () => [] }),
    });
    Object.defineProperty(window, "AudioContext", { configurable: true, value: TestAudioContext });
  });

  await page.goto("/");
  await page.locator(".preferences > summary").press("Enter");
  await expect(page.getByLabel("Instrument")).toHaveValue("b-flat-trumpet");
  await expect(page.getByRole("radio")).toHaveCount(0);
  await page.getByRole("button", { name: "Start listening" }).click();

  await expect(page.getByLabel("Detected pitch").getByText("D4", { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Written pitch for B-flat trumpet", { exact: true })).toBeVisible();
  await expect(page.getByRole("figure", { name: "Grand staff with a 10-second pitch history showing current written pitch for B-flat trumpet D4 on the treble staff" })).toBeVisible();
  await expect(page.locator(".staff-graphic svg")).toHaveCount(1);
  await expect(page.getByText("Written pitch for B-flat trumpet: D4. Treble staff.")).toBeVisible();
  await expect(page.getByText("Pitch reference")).toBeVisible();
  await page.getByText("Pitch reference").click();
  await expect(page.getByText("Sounding concert pitch: C4")).toBeVisible();
  await expect(page.getByText(/Pitch history, oldest to newest: D4, current, treble staff\./)).toBeAttached();
  await expect(page.locator(".vf-staff-note-current")).toHaveCount(1);
  const writtenCurrentX = await page.locator(".vf-staff-note-current").getAttribute("data-note-x");

  await page.getByLabel("Instrument").selectOption("concert");
  await expect(page.getByLabel("Detected pitch").getByText("C4", { exact: true })).toBeVisible();
  await expect(page.getByText(/Pitch history, oldest to newest: C4, current, treble staff\./)).toBeAttached();
  await expect(page.getByLabel("Detected pitch").getByText("Concert pitch", { exact: true })).toBeVisible();
  await expect(page.getByRole("figure", { name: "Grand staff with a 10-second pitch history showing current concert pitch C4 on the treble staff" })).toBeVisible();
  await expect(page.locator(".vf-staff-note-current")).toHaveAttribute("data-note-x", writtenCurrentX!);
  await expect(page.getByText("Pitch reference")).toHaveCount(0);
});

test("routes a deterministic low concert pitch to the bass staff in the persistent grand staff", async ({ page }) => {
  await page.addInitScript(() => {
    class TestAudioContext {
      readonly sampleRate = 44_100;
      readonly state = "running";

      createMediaStreamSource() {
        return { connect() {}, disconnect() {} };
      }

      createAnalyser() {
        let sample = 0;
        return {
          fftSize: 0,
          connect() {},
          disconnect() {},
          getFloatTimeDomainData(frame: Float32Array) {
            for (let index = 0; index < frame.length; index += 1) {
              frame[index] = Math.sin((2 * Math.PI * 220 * (sample + index)) / 44_100);
            }
            sample += frame.length;
          },
        };
      }

      close() {
        return Promise.resolve();
      }
    }

    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: () => Promise.resolve({ getTracks: () => [] }),
    });
    Object.defineProperty(window, "AudioContext", { configurable: true, value: TestAudioContext });
  });

  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  await page.getByRole("button", { name: "Start listening" }).click();

  await expect(page.getByLabel("Detected pitch").getByText("A3", { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("figure", { name: "Grand staff with a 10-second pitch history showing current concert pitch A3 on the bass staff" })).toBeVisible();
  await expect(page.getByText("Concert pitch: A3. Bass staff.")).toBeVisible();
  await expect(page.locator(".staff-graphic svg")).toHaveCount(1);
  const current = page.locator(".vf-staff-note-current");
  const initialX = await current.getAttribute("data-note-x");
  await page.waitForTimeout(500);
  await expect(current).toHaveAttribute("data-note-x", initialX!);

  await page.getByRole("button", { name: "Stop listening" }).click();
  await expect(page.getByRole("figure", { name: "Grand staff with 1 recent concert pitch event" })).toBeVisible();
  await expect(page.getByText(/Pitch history, oldest to newest: A3, bass staff, about \d+ seconds old\./)).toBeAttached();
  await expect(page.locator(".vf-staff-notation-layer")).toHaveCount(1);
  await page.waitForTimeout(250);
  expect(await page.evaluate(async () => {
    const notation = document.querySelector(".staff-graphic svg")!;
    let mutations = 0;
    const observer = new MutationObserver((records) => {
      mutations += records.length;
    });
    observer.observe(notation, { attributes: true, childList: true, subtree: true });
    await new Promise((resolve) => window.setTimeout(resolve, 1_100));
    observer.disconnect();
    return mutations;
  })).toBe(0);
});

test("renders idle notation and updates the listening control within budget", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  const requestUrls: string[] = [];
  page.on("request", (request) => requestUrls.push(request.url()));

  await page.goto("/");
  await expect(page.getByRole("figure", { name: "Grand staff with an empty 10-second pitch history" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start listening" })).toBeVisible();
  await expect(page.getByText("Past 10s · event history · current")).toBeVisible();
  await page.waitForTimeout(250);

  await expect(page.locator(".staff-graphic svg")).toHaveCount(1);
  expect(requestUrls.some((url) => url.includes("vexflowGrandStaffRenderer"))).toBe(true);

  const interactionDuration = await page.evaluate(async () => {
    const status = document.querySelector("#listening-status")!;
    const start = performance.now();

    return await new Promise<number>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("Listening state did not update.")), 100);
      const observer = new MutationObserver(() => {
        if (status.textContent === "Requesting microphone access...") {
          window.clearTimeout(timeout);
          observer.disconnect();
          resolve(performance.now() - start);
        }
      });

      observer.observe(status, { childList: true, characterData: true, subtree: true });
      (document.querySelector("button") as HTMLButtonElement).click();
    });
  });

  expect(interactionDuration).toBeLessThan(100);
});

test("disables notation fading when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".staff-graphic svg")).toHaveCount(1);

  expect(await page.evaluate(() => {
    const ruleTarget = document.createElement("g");
    ruleTarget.classList.add("vf-staff-note-history");
    document.querySelector(".staff-graphic svg")!.append(ruleTarget);
    return getComputedStyle(ruleTarget).transitionDuration;
  })).toBe("1e-05s");
});

test("keeps signal monitoring opt-in, bounded, accessible, and immediately stoppable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.addInitScript(() => {
    const counters = { microphoneRequests: 0, spectrumReads: 0 };
    class TestAudioContext {
      readonly sampleRate = 48_000;
      readonly state = "running";
      createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
      createAnalyser() {
        return {
          fftSize: 4_096,
          frequencyBinCount: 2_048,
          minDecibels: -100,
          maxDecibels: -30,
          disconnect() {},
          getFloatTimeDomainData(frame: Float32Array) {
            for (let index = 0; index < frame.length; index += 1) frame[index] = Math.sin(index / 12) * 0.2;
          },
          getFloatFrequencyData(frame: Float32Array) {
            counters.spectrumReads += 1;
            frame.fill(-90);
            frame[5] = -42;
            frame[6] = -45;
          },
        };
      }
      close() { return Promise.resolve(); }
    }
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: () => {
        counters.microphoneRequests += 1;
        return Promise.resolve({ getTracks: () => [{ stop() {} }] });
      },
    });
    Object.defineProperty(window, "AudioContext", { configurable: true, value: TestAudioContext });
    Object.defineProperty(window, "signalMonitorCounters", { configurable: true, value: counters });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Signal monitor" })).toHaveCount(0);
  await page.locator(".preferences > summary").press("Enter");
  await page.getByRole("button", { name: "Start listening" }).click();
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => (window as typeof window & { signalMonitorCounters: { spectrumReads: number } }).signalMonitorCounters.spectrumReads)).toBe(0);

  await page.getByText("Advanced diagnostics").click();
  const toggle = page.getByLabel("Show waveform and spectrum");
  await toggle.check();
  await expect(page.getByRole("heading", { name: "Signal monitor" })).toBeVisible();
  await expect(page.getByText(/raw microphone input/)).toBeVisible();
  await expect(page.getByText(/Raw spectrum and filter response/)).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-describedby", "signal-monitor-guidance");
  const measurementStart = await page.evaluate(() => ({
    timestamp: performance.now(),
    reads: (window as typeof window & { signalMonitorCounters: { spectrumReads: number } }).signalMonitorCounters.spectrumReads,
  }));
  await page.waitForTimeout(1_050);
  const measurementEnd = await page.evaluate(() => ({
    timestamp: performance.now(),
    reads: (window as typeof window & { signalMonitorCounters: { spectrumReads: number } }).signalMonitorCounters.spectrumReads,
  }));
  const measuredReads = measurementEnd.reads - measurementStart.reads;
  expect(measuredReads).toBeGreaterThan(0);
  expect(measuredReads).toBeLessThanOrEqual(Math.ceil((measurementEnd.timestamp - measurementStart.timestamp) / 100));
  expect(await page.evaluate(() => (window as typeof window & { signalMonitorCounters: { microphoneRequests: number } }).signalMonitorCounters.microphoneRequests)).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  const canvasHeight = await page.locator(".signal-monitor canvas").first().evaluate((canvas) => ({
    actual: canvas.height,
    expected: Math.round(canvas.clientHeight * Math.min(devicePixelRatio, 2)),
  }));
  expect(canvasHeight.actual).toBe(canvasHeight.expected);

  await toggle.uncheck();
  const readsAtDisable = await page.evaluate(() => (window as typeof window & { signalMonitorCounters: { spectrumReads: number } }).signalMonitorCounters.spectrumReads);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as typeof window & { signalMonitorCounters: { spectrumReads: number } }).signalMonitorCounters.spectrumReads)).toBe(readsAtDisable);
  await expect(page.getByRole("heading", { name: "Signal monitor" })).toHaveCount(0);
});

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`keeps the idle core experience in the ${viewport.name} first viewport`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.locator(".staff-graphic svg")).toHaveCount(1);

    const core = [
      page.getByRole("heading", { name: "Live Staff" }),
      page.getByRole("button", { name: "Start listening" }),
      page.getByRole("figure", { name: "Grand staff with an empty 10-second pitch history" }),
      page.getByRole("region", { name: "Detected pitch" }),
      page.locator(".preferences > summary"),
    ];
    for (const element of core) {
      await expect(element).toBeInViewport({ ratio: 1 });
    }

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
    await page.screenshot({ path: testInfo.outputPath(`idle-${viewport.name}.png`), fullPage: true });
  });
}

test("edits four bounded filters without pointer input and keeps mobile controls accessible", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  await page.locator(".preferences > summary").press("Enter");
  const add = page.getByRole("button", { name: "Add band-stop filter" });
  await add.press("Enter");
  const frequency = page.getByRole("slider", { name: "Band-stop 1 frequency" });
  await expect(frequency).toHaveAttribute("aria-valuetext", "60 hertz");
  await frequency.press("ArrowRight");
  await expect(frequency).toHaveValue("61");
  await page.getByLabel("Band-stop 1 width").selectOption("30");
  await page.getByRole("slider", { name: "Band-stop 1 reduction" }).press("ArrowRight");
  await expect(page.getByText("21 dB", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Bypass all filters")).toBeEnabled();

  await add.click();
  await add.click();
  await add.click();
  await expect(add).toBeDisabled();
  await expect(page.getByRole("group", { name: /Band-stop/ })).toHaveCount(4);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  const touchHeight = await page.getByRole("button", { name: "Remove filter" }).first().evaluate((element) => element.getBoundingClientRect().height);
  expect(touchHeight).toBeGreaterThanOrEqual(44);
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page.getByRole("group", { name: /Band-stop/ })).toHaveCount(0);
});
