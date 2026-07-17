import { expect, test } from "@playwright/test";

test("progressively reveals settings and locks display controls for the microphone lifecycle", async ({ page }) => {
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
  const settings = page.locator("summary");
  await expect(settings).toContainText("Display and input settings");
  await expect(page.getByLabel("Instrument")).not.toBeVisible();
  await settings.press("Enter");
  await expect(page.getByLabel("Instrument")).toBeVisible();
  const instrument = page.getByLabel("Instrument");
  const concertPitch = page.getByRole("radio", { name: "Concert pitch" });
  const backgroundHum = page.getByLabel("Background hum");

  await page.getByRole("button", { name: "Start listening" }).click();
  await expect(instrument).toBeDisabled();
  await expect(concertPitch).toBeDisabled();
  await expect(backgroundHum).toBeEnabled();
  await expect(page.getByRole("status").filter({ hasText: "Stop listening to change them." })).toBeVisible();

  await page.evaluate(() => (window as typeof window & { resolveMicrophoneAccess(): void }).resolveMicrophoneAccess());
  await expect(page.getByRole("button", { name: "Stop listening" })).toBeVisible();
  await expect(instrument).toBeDisabled();
  await expect(concertPitch).toBeDisabled();
  await expect(backgroundHum).toBeEnabled();

  await page.getByRole("button", { name: "Stop listening" }).click();
  await expect(instrument).toBeEnabled();
  await expect(concertPitch).toBeEnabled();
  await expect(page.getByText("Instrument and pitch display changes apply when you start your next listening session.")).toBeVisible();
});

test("restores display settings after microphone startup fails", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: () => Promise.reject(new DOMException("Permission denied", "NotAllowedError")),
    });
  });

  await page.goto("/");
  await page.locator("summary").press("Enter");
  await page.getByRole("button", { name: "Start listening" }).click();

  await expect(page.getByText("Microphone access was denied. Allow access and try again.")).toBeVisible();
  await expect(page.getByLabel("Instrument")).toBeEnabled();
  await expect(page.getByRole("radio", { name: "Concert pitch" })).toBeEnabled();
  await expect(page.getByLabel("Background hum")).toBeEnabled();
});

test("keeps settings usable on a small screen and restores saved preferences", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  await page.locator("summary").press("Enter");
  await page.getByLabel("Instrument").selectOption("b-flat-trumpet");
  await expect(page.getByRole("status").filter({ hasText: "Preference saved on this device." })).toBeVisible();

  await page.reload();
  await expect(page.locator("summary")).toContainText("B-flat trumpet");
  await page.locator("summary").press("Enter");
  await expect(page.getByLabel("Instrument")).toHaveValue("b-flat-trumpet");
});

test("renders a deterministic concert C4 as written D4 for B-flat trumpet", async ({ page }) => {
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
  await page.locator("summary").press("Enter");
  await page.getByLabel("Instrument").selectOption("b-flat-trumpet");
  await page.getByRole("radio", { name: "Written pitch" }).check();
  await page.getByRole("button", { name: "Start listening" }).click();

  await expect(page.getByText("D4", { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Written pitch for B-flat trumpet", { exact: true })).toBeVisible();
  await expect(page.getByRole("figure", { name: "Treble staff showing D4" })).toBeVisible();
});

test("keeps notation out of the initial page load and updates the listening control within budget", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  const requestUrls: string[] = [];
  page.on("request", (request) => requestUrls.push(request.url()));

  await page.goto("/");
  await expect(page.getByRole("figure", { name: "Empty treble staff" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start listening" })).toBeVisible();
  await page.waitForTimeout(250);

  expect(requestUrls.some((url) => url.includes("vexflowTrebleRenderer"))).toBe(false);

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
  await expect.poll(() => requestUrls.some((url) => url.includes("vexflowTrebleRenderer"))).toBe(true);
});
