import { useCallback, useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import type { AudioController } from "./audio";
import {
  canConnect,
  canDisconnect,
  canQuery,
  capabilityLabels,
  emptySources,
  entryActions,
  fieldKind,
  fieldLabel,
  formatSize,
  hasCapability,
  sourcesAction,
  stateHint,
  type ProviderId,
  type ProviderStatus,
  type SourceEntry,
  type SourcesSnapshot,
} from "./sources";
import "./Resources.css";

/** Shown when the panel runs in a browser without the Rust side. */
const nativeOnlySourcesMessage =
  "Las fuentes externas requieren la aplicación de escritorio.";

export function Sources({
  audio,
  onOpenLibrary,
  initialQuery = "",
}: {
  audio: AudioController;
  onOpenLibrary: () => void;
  initialQuery?: string;
}) {
  const [snapshot, setSnapshot] = useState(emptySources);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [target, setTarget] = useState<ProviderId>("local");
  const [forms, setForms] = useState<Record<string, Record<string, string>>>(
    {},
  );
  const requests = useRef(0);
  const native = isTauri();

  const load = useCallback(
    async (action: object): Promise<SourcesSnapshot | null> => {
      if (!isTauri()) {
        setError(nativeOnlySourcesMessage);
        return null;
      }
      const token = ++requests.current;
      setBusy(true);
      setError("");
      try {
        const next = await sourcesAction(action);
        if (token === requests.current) setSnapshot(next);
        return next;
      } catch (reason) {
        if (token === requests.current) setError(String(reason));
        // A failed authorization or refresh may have changed connection state.
        try {
          const next = await sourcesAction({ kind: "snapshot" });
          if (token === requests.current) setSnapshot(next);
        } catch {
          // Keep the original error when storage itself is unavailable.
        }
        return null;
      } finally {
        if (token === requests.current) setBusy(false);
      }
    },
    [],
  );

  // The first snapshot arrives asynchronously, so the effect only subscribes
  // to the answer instead of updating state while it renders.
  useEffect(() => {
    if (!isTauri()) return;
    const ref = requests;
    const token = ++ref.current;
    void sourcesAction({ kind: "snapshot" })
      .then((next) => {
        if (token === ref.current) setSnapshot(next);
      })
      .catch((reason) => {
        if (token === ref.current) setError(String(reason));
      });
    return () => {
      ++ref.current;
    };
  }, []);

  const providers = snapshot.providers;
  const selectable = providers.filter(
    (item) => hasCapability(item, "search") && canQuery(item),
  );
  const active = providers.find((item) => item.id === target) ?? null;
  const activeTarget = active && canQuery(active) ? active.id : "local";
  const activeProvider = providers.find((item) => item.id === activeTarget);
  const browsable =
    !!activeProvider &&
    activeTarget !== "local" &&
    activeTarget !== "youtube" &&
    hasCapability(activeProvider, "read");
  const needsExternal = activeTarget !== "local";

  function fieldOf(provider: ProviderStatus, name: string): string {
    const saved = provider.settings[name as keyof typeof provider.settings];
    return forms[provider.id]?.[name] ?? saved ?? "";
  }

  function setField(provider: ProviderStatus, name: string, value: string) {
    setForms((previous) => ({
      ...previous,
      [provider.id]: { ...previous[provider.id], [name]: value },
    }));
  }

  async function play(entry: SourceEntry) {
    const next = await load({
      kind: "download",
      provider: entry.provider,
      id: entry.id,
    });
    if (next?.downloaded) audio.openFiles([next.downloaded]);
  }

  const pending = providers.filter((item) => item.state === "pending");

  return (
    <section className="resources">
      <div className="resource-heading">
        <div>
          <h2>Fuentes externas</h2>
          <p>
            Conecta servicios independientes sin depender de ellos para usar tu
            biblioteca.
          </p>
        </div>
        <button
          className="button"
          disabled={busy}
          onClick={() => void load({ kind: "snapshot" })}
        >
          Actualizar
        </button>
      </div>

      <fieldset className="resource-controls" disabled={busy}>
        <legend>Consultas externas</legend>
        <label>
          <input
            type="checkbox"
            checked={snapshot.external}
            onChange={(e) =>
              void load({ kind: "external", enabled: e.target.checked })
            }
          />
          Permitir consultas a servicios externos
        </label>
        <p className="inline-note">
          Las contraseñas y los tokens viven en el almacén de credenciales del
          sistema; los documentos de la aplicación solo guardan conexiones y
          ajustes.
        </p>
      </fieldset>

      {!native && <p className="inline-note">{nativeOnlySourcesMessage}</p>}

      {!!snapshot.pending_url && (
        <div className="resource-attribution">
          <p>
            {pending.length === 1
              ? `Autorizando ${pending[0].name}: confirma en el navegador.`
              : "Autorización en curso en el navegador."}
          </p>
          <p className="secondary">{snapshot.pending_url}</p>
          <div className="resource-actions">
            {pending.map((item) => (
              <button
                key={item.id}
                className="button"
                disabled={busy}
                onClick={() => void load({ kind: "finish", provider: item.id })}
              >
                Ya lo autoricé, continuar
              </button>
            ))}
          </div>
        </div>
      )}

      <h3>Proveedores</h3>
      <ul className="resource-results">
        {providers.map((provider) => (
          <li key={provider.id}>
            <div>
              <strong>{provider.name}</strong>
              <p>{provider.note}</p>
              <p>{stateHint(provider)}</p>
              <p>
                {provider.capabilities
                  .map((capability) => capabilityLabels[capability])
                  .join(" · ")}
              </p>
              {canConnect(provider) && snapshot.external && (
                <form
                  className="resource-actions"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const entries = new FormData(event.currentTarget);
                    const fields: Record<string, string> = {};
                    for (const [name, value] of entries.entries())
                      fields[name] = String(value);
                    void load({
                      kind: "connect",
                      provider: provider.id,
                      fields,
                    }).then((next) => {
                      if (!next) return;
                      setForms((previous) => ({
                        ...previous,
                        [provider.id]: Object.fromEntries(
                          Object.entries(previous[provider.id] ?? {}).filter(
                            ([name]) => fieldKind(name) !== "password",
                          ),
                        ),
                      }));
                    });
                  }}
                >
                  {provider.required.map((name) => {
                    const optional = fieldLabel(name).includes("opcional");
                    const kind = fieldKind(name);
                    return (
                      <label key={name}>
                        {fieldLabel(name)}
                        <input
                          name={name}
                          type={kind === "password" ? "password" : kind}
                          value={fieldOf(provider, name)}
                          onChange={(event) =>
                            setField(provider, name, event.target.value)
                          }
                          maxLength={4096}
                          required={!optional}
                          autoComplete="off"
                        />
                      </label>
                    );
                  })}
                  {provider.auth === "oauth2" &&
                    !provider.required.includes("client_secret") && (
                      <label>
                        {fieldLabel("client_secret")}
                        <input
                          name="client_secret"
                          type="password"
                          value={fieldOf(provider, "client_secret")}
                          onChange={(event) =>
                            setField(
                              provider,
                              "client_secret",
                              event.target.value,
                            )
                          }
                          maxLength={4096}
                          autoComplete="off"
                        />
                      </label>
                    )}
                  <button className="button small" disabled={busy}>
                    Conectar
                  </button>
                </form>
              )}
            </div>
            <div className="resource-actions">
              {provider.id === "local" && (
                <button className="button small" onClick={onOpenLibrary}>
                  Abrir biblioteca
                </button>
              )}
              {canDisconnect(provider) && (
                <button
                  className="button small"
                  disabled={busy}
                  onClick={() =>
                    void load({
                      kind: "disconnect",
                      provider: provider.id,
                    })
                  }
                >
                  Desconectar
                </button>
              )}
              {hasCapability(provider, "revoke") &&
                (provider.state === "connected" ||
                  provider.state === "expired") && (
                  <button
                    className="button small"
                    disabled={busy}
                    onClick={() =>
                      void load({ kind: "revoke", provider: provider.id })
                    }
                  >
                    Revocar acceso
                  </button>
                )}
            </div>
          </li>
        ))}
      </ul>

      <form
        className="resource-actions"
        onSubmit={(event) => {
          event.preventDefault();
          void load({
            kind: "search",
            provider: activeTarget,
            query,
          });
        }}
      >
        <select
          aria-label="Fuente de la búsqueda"
          value={activeTarget}
          disabled={busy}
          onChange={(event) => setTarget(event.target.value as ProviderId)}
        >
          {selectable.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <input
          aria-label="Texto de búsqueda en la fuente"
          placeholder="Título, artista o carpeta"
          maxLength={200}
          value={query}
          disabled={busy}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button
          className="button"
          disabled={busy || (needsExternal && !snapshot.external)}
        >
          Buscar
        </button>
        {browsable && (
          <button
            type="button"
            className="button"
            disabled={busy || (needsExternal && !snapshot.external)}
            onClick={() =>
              void load({ kind: "browse", provider: activeTarget, path: null })
            }
          >
            Recorrer desde la raíz
          </button>
        )}
      </form>

      {!!snapshot.downloaded && (
        <div className="resource-actions">
          <span className="secondary grow">{snapshot.downloaded}</span>
          <button
            className="button"
            disabled={busy}
            onClick={() => audio.openFiles([snapshot.downloaded as string])}
          >
            Reproducir descarga
          </button>
        </div>
      )}

      {!!snapshot.results.length && (
        <>
          <h3>Resultados</h3>
          <ul className="resource-results">
            {snapshot.results.map((entry, index) => {
              const source = providers.find(
                (item) => item.id === entry.provider,
              );
              const actions = source ? entryActions(source, entry) : null;
              const openable =
                entry.kind === "folder" &&
                !!source &&
                hasCapability(source, "read") &&
                entry.provider !== "local" &&
                entry.provider !== "youtube";
              return (
                <li key={`${entry.provider}-${entry.id}-${index}`}>
                  <div>
                    <strong>{entry.name}</strong>
                    <p>
                      {[source?.name, entry.detail, formatSize(entry.size)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="resource-actions">
                    {openable && (
                      <button
                        className="button small"
                        disabled={busy}
                        onClick={() =>
                          void load({
                            kind: "browse",
                            provider: entry.provider,
                            path: entry.id,
                          })
                        }
                      >
                        Abrir carpeta
                      </button>
                    )}
                    {actions?.download && (
                      <button
                        className="button small"
                        disabled={busy}
                        onClick={() =>
                          void load({
                            kind: "download",
                            provider: entry.provider,
                            id: entry.id,
                          })
                        }
                      >
                        Descargar
                      </button>
                    )}
                    {actions?.play && (
                      <button
                        className="button small"
                        disabled={busy}
                        onClick={() => void play(entry)}
                      >
                        Reproducir
                      </button>
                    )}
                    {entry.source_url && (
                      <a
                        href={entry.source_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ver origen
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {error && <p role="alert">{error}</p>}
      {snapshot.warnings.map((warning, index) => (
        <p role="status" key={index}>
          {warning}
        </p>
      ))}
      {busy && <p role="status">Procesando…</p>}
      <p className="inline-note">
        YouTube solo permite buscar y mostrar la fuente original: sin una
        integración oficial no se descarga ni se reproduce su audio. WebDAV y
        las nubes descargan a la caché local para reproducirlos con el motor de
        audio.
      </p>
    </section>
  );
}
