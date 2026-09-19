export interface LocalFile {
  readonly name: string;
  readonly type: string;
  readonly contents: string;
}

export interface LocalSaveDependencies {
  readonly createObjectURL: (blob: Blob) => string;
  readonly revokeObjectURL: (url: string) => void;
  readonly createAnchor: () => HTMLAnchorElement;
  readonly click: (anchor: HTMLAnchorElement) => void;
  readonly canShare?: (data: ShareData) => boolean;
  readonly share?: (data: ShareData) => Promise<void>;
}

export type LocalSaveResult = "downloaded" | "shared";

export function browserSaveDependencies(): LocalSaveDependencies {
  return {
    createObjectURL: (blob) => URL.createObjectURL(blob),
    revokeObjectURL: (url) => URL.revokeObjectURL(url),
    createAnchor: () => document.createElement("a"),
    click: (anchor) => {
      anchor.click();
    },
    canShare: (data) => {
      try {
        return typeof navigator.canShare === "function" && navigator.canShare(data);
      } catch {
        return false;
      }
    },
    share: navigator.share?.bind(navigator),
  };
}

function shareFile(file: LocalFile, blob: Blob): File | undefined {
  if (typeof File !== "function") return undefined;
  return new File([blob], file.name, { type: file.type });
}

function downloadFile(file: LocalFile, blob: Blob, deps: LocalSaveDependencies): void {
  const url = deps.createObjectURL(blob);
  try {
    const anchor = deps.createAnchor();
    anchor.href = url;
    anchor.download = file.name;
    deps.click(anchor);
  } finally {
    deps.revokeObjectURL(url);
  }
}

export async function saveLocalTextFile(
  file: LocalFile,
  deps: LocalSaveDependencies = browserSaveDependencies(),
): Promise<LocalSaveResult> {
  const blob = new Blob([file.contents], { type: `${file.type};charset=utf-8` });
  const shared = shareFile(file, blob);
  const shareData = shared ? { files: [shared], title: file.name } : undefined;
  if (shareData && deps.canShare?.(shareData) && deps.share) {
    try {
      await deps.share(shareData);
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
    }
  }

  downloadFile(file, blob, deps);
  return "downloaded";
}
