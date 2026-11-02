import { useCallback, useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { emptyLibrary, libraryAction } from "./library";

export function useMusicLibrary() {
  const [library, setLibrary] = useState(emptyLibrary);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(isTauri);
  const reload = useCallback(async () => {
    try {
      const next = await libraryAction({ kind: "snapshot" });
      setLibrary(next);
      setError("");
    } catch (reason) {
      setError(String(reason));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let disposed = false;
    const refresh = async () => {
      try {
        const next = await libraryAction({ kind: "snapshot" });
        if (!disposed) {
          setLibrary(next);
          setError("");
        }
      } catch (reason) {
        if (!disposed) setError(String(reason));
      } finally {
        if (!disposed) setLoading(false);
      }
    };
    const cleanup = isTauri()
      ? listen("library:changed", () => void refresh())
      : Promise.resolve(() => {});
    void cleanup
      .then(() => {
        if (!disposed) void refresh();
      })
      .catch((reason) => {
        if (!disposed) {
          setError(String(reason));
          setLoading(false);
        }
      });
    return () => {
      disposed = true;
      void cleanup.then((stop) => stop()).catch(() => {});
    };
  }, []);
  return { library, loading, error, reload };
}
