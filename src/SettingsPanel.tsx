import { useEffect, useState, type ReactNode } from "react";
import type { AudioController } from "./audio";
import {
  createBackup,
  clearCache,
  exportData,
  formatBytes,
  hasNativeStorage,
  importData,
  loadStorageStatus,
  type StorageStatus,
} from "./storage";

function Setting({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="setting-row">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
}
export function Settings({
  theme,
  onTheme,
  audio,
  onSources,
}: {
  theme: string;
  onTheme: (theme: string) => void;
  audio: AudioController;
  onSources: () => void;
}) {
  const [tab, setTab] = useState("Apariencia");
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const native = hasNativeStorage();
  useEffect(() => {
    let disposed = false;
    void loadStorageStatus()
      .then((value) => {
        if (!disposed) setStatus(value);
      })
      .catch((reason) => {
        if (!disposed) setError(String(reason));
      });
    return () => {
      disposed = true;
    };
  }, []);
  async function run(action: () => Promise<string>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setNotice(await action());
      setStatus(await loadStorageStatus());
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  }
  const tabs = ["Apariencia", "Biblioteca y datos", "Audio", "Privacidad"];
  return (
    <section className="settings-screen">
      <div
        className="tabs"
        role="tablist"
        aria-label="Secciones de configuración"
      >
        {tabs.map((item, index) => (
          <button
            key={item}
            id={`setting-tab-${index}`}
            role="tab"
            aria-selected={tab === item}
            aria-controls="settings-panel"
            tabIndex={tab === item ? 0 : -1}
            onClick={() => setTab(item)}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? tabs.length - 1
                    : (index +
                        (event.key === "ArrowRight" ? 1 : -1) +
                        tabs.length) %
                      tabs.length;
              setTab(tabs[next]);
              document.getElementById(`setting-tab-${next}`)?.focus();
            }}
          >
            {item}
          </button>
        ))}
      </div>
      <div
        id="settings-panel"
        role="tabpanel"
        aria-labelledby={`setting-tab-${tabs.indexOf(tab)}`}
      >
        {tab === "Apariencia" && (
          <>
            <Setting
              title="Hazlo tuyo"
              description="Elige la apariencia de Zenith. Automático sigue el tema de tu equipo."
            >
              <select
                aria-label="Tema de la interfaz"
                value={theme}
                onChange={(e) => onTheme(e.target.value)}
              >
                <option value="dark">Oscuro</option>
                <option value="light">Claro</option>
                <option value="system">Automático</option>
              </select>
            </Setting>
            <div className="theme-previews" aria-hidden="true">
              <div className="theme-preview dark-preview">
                <i />
                <span />
                <b>Oscuro</b>
              </div>
              <div className="theme-preview light-preview">
                <i />
                <span />
                <b>Claro</b>
              </div>
            </div>
            <Setting
              title="Idioma"
              description="Tu biblioteca habla tu idioma."
            >
              <span className="status">Español</span>
            </Setting>
          </>
        )}
        {tab === "Biblioteca y datos" && (
          <>
            <Setting
              title="Todo en tu equipo"
              description={
                status
                  ? status.root
                  : "Tu biblioteca, listas, letras y preferencias se guardan localmente."
              }
            >
              <span className="status">
                {status
                  ? status.writable
                    ? "Disponible"
                    : "Solo lectura"
                  : native
                    ? "Cargando…"
                    : "Aplicación de escritorio"}
              </span>
            </Setting>
            <Setting
              title="Modo portátil"
              description="Se activa con el archivo zenith-portable junto al ejecutable."
            >
              <span className="status">
                {status?.portable ? "Activado" : "Desactivado"}
              </span>
            </Setting>
            <Setting
              title="Respaldo de tus datos"
              description="Conserva una copia de la biblioteca y tus preferencias."
            >
              <button
                className="button"
                disabled={!native || busy}
                onClick={() =>
                  void run(async () => {
                    const r = await createBackup();
                    return `Respaldo creado: ${r.created.length} documentos en ${r.directory}.`;
                  })
                }
              >
                Crear respaldo
              </button>
            </Setting>
            <Setting
              title="Llévate tu biblioteca"
              description="Exporta o restaura tus datos. Las credenciales quedan protegidas en este equipo."
            >
              <div className="button-group">
                <button
                  className="button"
                  disabled={!native || busy}
                  onClick={() =>
                    void run(async () => {
                      const r = await exportData();
                      return `Datos exportados a ${r.path}.`;
                    })
                  }
                >
                  Exportar
                </button>
                <button
                  className="button"
                  disabled={!native || busy}
                  onClick={() =>
                    void run(async () => {
                      const r = await importData();
                      return `Datos importados de ${r.path}.`;
                    })
                  }
                >
                  Importar
                </button>
              </div>
            </Setting>
            <Setting
              title="Espacio de la caché"
              description={`${status ? formatBytes(status.cache_bytes) : "Recursos"} de audio, imágenes y archivos temporales. Limpiarla retira las descargas; tus archivos originales permanecen intactos.`}
            >
              <button
                className="button"
                disabled={!native || busy}
                onClick={() =>
                  void run(async () => {
                    const r = await clearCache();
                    return `Liberados ${formatBytes(r.freed_bytes)} en ${r.removed_files} archivos.`;
                  })
                }
              >
                Limpiar caché
              </button>
            </Setting>
            <details className="advanced-details">
              <summary>Estado y recuperación</summary>
              <p>
                {status?.documents.filter((d) => d.valid).length ?? 0}{" "}
                documentos válidos. {status?.index.tracks ?? 0} canciones
                indexadas.
              </p>
              {status?.recovery.map((item) => (
                <p key={`${item.file}-${item.kind}`}>{item.message}</p>
              ))}
            </details>
          </>
        )}
        {tab === "Audio" && (
          <>
            <Setting
              title="Salida de sonido"
              description={
                audio.capabilities
                  ? `${audio.capabilities.decoder} · ${audio.capabilities.output}`
                  : "Salida de audio del sistema."
              }
            >
              <button
                className="button"
                disabled={!audio.available}
                onClick={() => void audio.restartOutput()}
              >
                Reiniciar salida
              </button>
            </Setting>
            <Setting
              title="Formatos de reproducción"
              description={
                audio.capabilities?.formats.join(", ") ??
                "Los formatos disponibles se muestran en la aplicación de escritorio."
              }
            >
              <span className="status">Audio local</span>
            </Setting>
            <p className="inline-note">
              El ecualizador y el procesamiento avanzado de sonido estarán
              disponibles en una próxima actualización.
            </p>
          </>
        )}
        {tab === "Privacidad" && (
          <>
            <Setting
              title="Tus conexiones"
              description="Decide qué fuentes pueden consultar servicios externos y desconéctalas cuando quieras."
            >
              <button className="button" onClick={onSources}>
                Administrar fuentes
              </button>
            </Setting>
            <Setting
              title="Credenciales protegidas"
              description="Las contraseñas y los tokens se guardan en el almacén de credenciales del sistema."
            >
              <span className="status">Almacenamiento del sistema</span>
            </Setting>
            <Setting
              title="Telemetría"
              description="Zenith no envía estadísticas de uso."
            >
              <span className="status">Sin telemetría</span>
            </Setting>
          </>
        )}
      </div>
      {busy && <p role="status">Guardando cambios…</p>}
      {notice && (
        <p className="inline-note" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="error-note" role="alert">
          {error}
        </p>
      )}
      <p className="settings-version">
        Zenith Player <span>0.1.0</span>
      </p>
    </section>
  );
}
