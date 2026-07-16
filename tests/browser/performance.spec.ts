import { expect, test } from "@playwright/test";

test("locks display settings for microphone lifecycle without locking background hum", async ({ page }) => {
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
  await page.getByRole("button", { name: "Start listening" }).click();

  await expect(page.getByText("Microphone access was denied. Allow access and try again.")).toBeVisible();
  await expect(page.getByLabel("Instrument")).toBeEnabled();
  await expect(page.getByRole("radio", { name: "Concert pitch" })).toBeEnabled();
  await expect(page.getByLabel("Background hum")).toBeEnabled();
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
