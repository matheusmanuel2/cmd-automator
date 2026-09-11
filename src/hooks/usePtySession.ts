import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { listen } from "@tauri-apps/api/event";
import "@xterm/xterm/css/xterm.css";
import { createStreamingDecoder } from "../utils/base64";
import { getPtyBacklog, resizePty, writeToPty } from "../api/pty";

export function usePtySession(
  sessionId: string,
  containerRef: React.RefObject<HTMLDivElement | null>,
  isActive: boolean,
) {
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: "Cascadia Mono, Consolas, monospace",
      fontSize: 13,
      theme: {
        background: "#111318",
        foreground: "#e4e6eb",
      },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    termRef.current = term;
    fitRef.current = fitAddon;

    let disposed = false;
    let queue: string[] = [];
    let replaying = true;
    let resizeTimeout: number | undefined;

    const decoder = createStreamingDecoder();

    fitAddon.fit();
    resizePty(sessionId, term.cols, term.rows).catch(() => {});

    const unlistenOutputPromise = listen<{ data: string }>(
      `pty:${sessionId}:output`,
      (event) => {
        if (replaying) {
          queue.push(event.payload.data);
        } else {
          term.write(decoder.decode(event.payload.data));
        }
      },
    );

    const unlistenExitPromise = listen<{ code: number | null }>(
      `pty:${sessionId}:exit`,
      (event) => {
        term.write(
          `\r\n\x1b[31m[processo finalizado, code=${event.payload.code ?? "?"}]\x1b[0m\r\n`,
        );
      },
    );

    (async () => {
      try {
        const backlog = await getPtyBacklog(sessionId);
        if (disposed) return;
        term.write(decoder.decode(backlog));
        for (const chunk of queue) {
          term.write(decoder.decode(chunk));
        }
      } finally {
        queue = [];
        replaying = false;
      }
    })();

    const dataDisposable = term.onData((data) => {
      writeToPty(sessionId, data).catch(() => {});
    });

    const resizeObserver = new ResizeObserver(() => {
      window.clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        fitAddon.fit();
        resizePty(sessionId, term.cols, term.rows).catch(() => {});
      }, 100);
    });
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      dataDisposable.dispose();
      resizeObserver.disconnect();
      window.clearTimeout(resizeTimeout);
      unlistenOutputPromise.then((f) => f());
      unlistenExitPromise.then((f) => f());
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (isActive && fitRef.current && termRef.current) {
      fitRef.current.fit();
      resizePty(sessionId, termRef.current.cols, termRef.current.rows).catch(() => {});
    }
  }, [isActive, sessionId]);
}
