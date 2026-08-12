"use client";

import * as React from "react";
import type { EditableValue, ProjectContent, ProjectMeta, ProjectTheme } from "@/lib/templates/types";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

type Snapshot = { content: ProjectContent; theme: ProjectTheme; meta: ProjectMeta };

const HISTORY_LIMIT = 80;
const AUTOSAVE_DELAY = 900;

/**
 * Editor state: the content map, an undo/redo stack and debounced autosave.
 *
 * History entries are whole snapshots. The content map is small (a few hundred
 * short strings even for a large template), so this is far simpler than diffing
 * and fast enough to keep eighty steps in memory.
 */
export function useEditorState(input: {
  projectId: string;
  initial: Snapshot;
  initialRevision: number;
  onSaved?: (revision: number) => void;
  onError?: (message: string) => void;
}) {
  const [snapshot, setSnapshot] = React.useState<Snapshot>(input.initial);
  const [saveState, setSaveState] = React.useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null);

  const past = React.useRef<Snapshot[]>([]);
  const future = React.useRef<Snapshot[]>([]);
  const revision = React.useRef(input.initialRevision);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = React.useRef<Snapshot | null>(null);
  const inFlight = React.useRef(false);
  const [historyVersion, setHistoryVersion] = React.useState(0);

  const flush = React.useCallback(async () => {
    if (inFlight.current || !pending.current) return;

    const payload = pending.current;
    pending.current = null;
    inFlight.current = true;
    setSaveState("saving");

    try {
      const response = await fetch(`/api/projects/${input.projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, baseRevision: revision.current }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSaveState("error");
        input.onError?.(body.message ?? "Changes could not be saved.");
        return;
      }

      revision.current = body.project?.revision ?? revision.current + 1;
      setLastSavedAt(new Date());
      setSaveState(pending.current ? "dirty" : "saved");
      input.onSaved?.(revision.current);
    } catch {
      setSaveState("error");
      input.onError?.("Network error — your changes are still here, retrying shortly.");
    } finally {
      inFlight.current = false;
      if (pending.current) {
        saveTimer.current = setTimeout(() => void flush(), 400);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.projectId]);

  const queueSave = React.useCallback(
    (next: Snapshot) => {
      pending.current = next;
      setSaveState("dirty");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void flush(), AUTOSAVE_DELAY);
    },
    [flush],
  );

  /** Applies a change and pushes the previous state onto the undo stack. */
  const commit = React.useCallback(
    (mutate: (draft: Snapshot) => Snapshot, options?: { merge?: boolean }) => {
      setSnapshot((current) => {
        const next = mutate(current);
        if (next === current) return current;

        // `merge` coalesces rapid edits to the same field into one history entry.
        if (!options?.merge) {
          past.current = [...past.current.slice(-(HISTORY_LIMIT - 1)), current];
          future.current = [];
          setHistoryVersion((v) => v + 1);
        }

        queueSave(next);
        return next;
      });
    },
    [queueSave],
  );

  const setValue = React.useCallback(
    (file: string, key: string, patch: EditableValue, options?: { merge?: boolean }) => {
      commit((current) => {
        const fileValues = current.content[file] ?? {};
        const existing = fileValues[key] ?? {};
        const merged = { ...existing, ...patch };

        // Drop keys that no longer carry an override so the map stays lean.
        for (const [k, v] of Object.entries(merged)) {
          if (v === undefined) delete (merged as Record<string, unknown>)[k];
        }

        return {
          ...current,
          content: {
            ...current.content,
            [file]: { ...fileValues, [key]: merged },
          },
        };
      }, options);
    },
    [commit],
  );

  const resetValue = React.useCallback(
    (file: string, key: string) => {
      commit((current) => {
        const fileValues = { ...(current.content[file] ?? {}) };
        delete fileValues[key];
        return { ...current, content: { ...current.content, [file]: fileValues } };
      });
    },
    [commit],
  );

  const setTheme = React.useCallback(
    (patch: Partial<ProjectTheme>, options?: { merge?: boolean }) => {
      commit(
        (current) => ({
          ...current,
          theme: { ...current.theme, ...patch, vars: { ...current.theme.vars, ...patch.vars } },
        }),
        options,
      );
    },
    [commit],
  );

  const setMeta = React.useCallback(
    (patch: Partial<ProjectMeta>, options?: { merge?: boolean }) => {
      commit((current) => ({ ...current, meta: { ...current.meta, ...patch } }), options);
    },
    [commit],
  );

  const undo = React.useCallback(() => {
    setSnapshot((current) => {
      const previous = past.current.pop();
      if (!previous) return current;
      future.current = [current, ...future.current.slice(0, HISTORY_LIMIT - 1)];
      setHistoryVersion((v) => v + 1);
      queueSave(previous);
      return previous;
    });
  }, [queueSave]);

  const redo = React.useCallback(() => {
    setSnapshot((current) => {
      const [next, ...rest] = future.current;
      if (!next) return current;
      future.current = rest;
      past.current = [...past.current.slice(-(HISTORY_LIMIT - 1)), current];
      setHistoryVersion((v) => v + 1);
      queueSave(next);
      return next;
    });
  }, [queueSave]);

  const replaceAll = React.useCallback(
    (next: Snapshot, nextRevision?: number) => {
      past.current = [];
      future.current = [];
      setHistoryVersion((v) => v + 1);
      if (typeof nextRevision === "number") revision.current = nextRevision;
      setSnapshot(next);
      setSaveState("saved");
    },
    [],
  );

  const saveNow = React.useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    pending.current ??= snapshot;
    await flush();
  }, [flush, snapshot]);

  // Keyboard shortcuts. Ignored while typing in an input so Cmd+Z still works
  // normally inside text fields.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier) return;

      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveNow();
        return;
      }
      if (typing) return;

      if (event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((event.key.toLowerCase() === "z" && event.shiftKey) || event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, saveNow]);

  // Warn before leaving with unsaved work in flight.
  React.useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (pending.current || inFlight.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  React.useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  return {
    snapshot,
    saveState,
    lastSavedAt,
    revision: revision.current,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    historyVersion,
    setValue,
    resetValue,
    setTheme,
    setMeta,
    commit,
    undo,
    redo,
    replaceAll,
    saveNow,
  };
}
