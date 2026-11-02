import { useEffect, useRef, useState, type CSSProperties } from "react";
import { pickAudioFiles, useAudioEngine } from "./audio";
import { Icon } from "./Icon";
import { navigation, viewTitle, type AppView } from "./navigation";
import { hasNativeStorage, loadAppearance, saveAppearance } from "./storage";
import { Library } from "./LibraryPanel";
import { Playlists } from "./PlaylistsPanel";
import { QueuePanel } from "./QueuePanel";
import { Artwork } from "./ArtworkPanel";
import { Lyrics } from "./LyricsPanel";
import { ListeningHistory } from "./ListeningHistory";
import { Sources } from "./SourcesPanel";
import { Settings } from "./SettingsPanel";
import { Home, Search, Downloads } from "./MusicScreens";
import { PlayerBar } from "./PlayerBar";
import { ExpandedPlayer } from "./ExpandedPlayer";
import { useMusicLibrary } from "./useMusicLibrary";
import { libraryAction, type LibraryView } from "./library";
import "./App.css";
import "./Experience.css";
import "./Refinement.css";

const libraryRoutes: Partial<Record<AppView, LibraryView>> = {
  library: "Canciones",
  albums: "Álbumes",
  artists: "Artistas",
  genres: "Géneros",
  favorites: "Favoritos",
};

export default function App() {
  const [view, setView] = useState<AppView>("home");
  const [playerExpanded, setPlayerExpanded] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [query, setQuery] = useState("");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [picking, setPicking] = useState(false);
  const [themeError, setThemeError] = useState("");
  const [accent, setAccent] = useState<string | undefined>();
  const main = useRef<HTMLElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const audio = useAudioEngine();
  const { library, loading, error, reload } = useMusicLibrary();
  const current = library.tracks.find(
    (t) =>
      t.id === audio.state.track?.trackId ||
      t.local_path === audio.state.track?.path,
  );
  function navigate(next: AppView) {
    if (next === "nowPlaying") {
      setPlayerExpanded(true);
      return;
    }
    setPlayerExpanded(false);
    setView(next);
    setLibraryQuery("");
    main.current?.scrollTo({ top: 0 });
    main.current?.focus({ preventScroll: true });
  }
  useEffect(() => {
    document.title = `${viewTitle(view)} · Zenith Player`;
  }, [view]);
  useEffect(() => {
    let disposed = false;
    void loadAppearance()
      .then((appearance) => {
        if (!disposed && appearance) setTheme(appearance.theme);
      })
      .catch((reason) => {
        if (!disposed) setThemeError(String(reason));
      });
    return () => {
      disposed = true;
    };
  }, []);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  async function changeTheme(next: string) {
    setTheme(next);
    setThemeError("");
    if (hasNativeStorage())
      try {
        await saveAppearance(next);
      } catch (reason) {
        setThemeError(String(reason));
      }
  }
  async function openFiles() {
    if (!audio.available) return;
    setPicking(true);
    try {
      const paths = await pickAudioFiles();
      if (paths.length) await audio.openFiles(paths);
    } catch (reason) {
      audio.reportError(reason);
    } finally {
      setPicking(false);
    }
  }
  async function favorite() {
    if (!current) return;
    try {
      await libraryAction({
        kind: "favorite",
        id: current.id,
        favorite: !current.favorite,
      });
      await reload();
    } catch (reason) {
      audio.reportError(reason);
    }
  }
  function content() {
    const shared = { audio, tracks: library.tracks, navigate };
    if (libraryRoutes[view])
      return (
        <Library
          audio={audio}
          initialView={libraryRoutes[view]}
          initialQuery={libraryQuery}
        />
      );
    switch (view) {
      case "home":
        return <Home {...shared} onImport={() => navigate("library")} />;
      case "search":
        return (
          <Search
            {...shared}
            query={query}
            onQuery={setQuery}
            onAlbum={(text, next) => {
              setLibraryQuery(text);
              setView(next);
            }}
          />
        );
      case "playlists":
        return <Playlists audio={audio} />;
      case "queue":
        return <QueuePanel audio={audio} />;
      case "history":
        return <ListeningHistory audio={audio} />;
      case "lyrics":
        return <Lyrics audio={audio} />;
      case "artwork":
        return <Artwork audio={audio} />;
      case "sources":
        return (
          <Sources
            audio={audio}
            initialQuery={query}
            onOpenLibrary={() => navigate("library")}
          />
        );
      case "downloads":
        return <Downloads audio={audio} navigate={navigate} />;
      case "settings":
        return (
          <Settings
            audio={audio}
            theme={theme}
            onTheme={(next) => void changeTheme(next)}
            onSources={() => navigate("sources")}
          />
        );
    }
  }
  return (
    <div
      className="workspace"
      data-theme={theme}
      style={{ "--artwork-color": accent } as CSSProperties}
      onLoad={(event) => {
        const image = event.target;
        if (
          !(image instanceof HTMLImageElement) ||
          image.classList.contains("fallback-mark") ||
          !image.closest(".now-art, .hero-art")
        )
          return;
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 1;
          canvas.height = 1;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(image, 0, 0, 1, 1);
          const pixel = ctx?.getImageData(0, 0, 1, 1).data;
          if (pixel) setAccent(`rgb(${pixel[0]} ${pixel[1]} ${pixel[2]})`);
        } catch {
          /* Missing artwork colors keep the brand palette. */
        }
      }}
    >
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => navigate("home")}
          aria-label="Zenith, inicio"
        >
          <img src="/favicon.svg" width="36" height="36" alt="" />
          <span>Zenith</span>
        </button>
        <nav aria-label="Navegación principal">
          {["main", "library", "collection", "settings"].map((group) => (
            <div className={`nav-group nav-group-${group}`} key={group}>
              {group === "library" && <p className="nav-heading">Biblioteca</p>}
              {navigation
                .filter((item) => item.group === group)
                .map((item) => (
                  <button
                    className={`nav-button ${view === item.view ? "active" : ""}`}
                    key={item.view}
                    title={item.label}
                    aria-label={item.label}
                    aria-current={view === item.view ? "page" : undefined}
                    onClick={() => navigate(item.view)}
                  >
                    <Icon name={item.view} size={19} />
                    <span>{item.label}</span>
                    {item.view === "favorites" &&
                      library.tracks.some((t) => t.favorite) && (
                        <small>
                          {library.tracks.filter((t) => t.favorite).length}
                        </small>
                      )}
                  </button>
                ))}
            </div>
          ))}
        </nav>
      </aside>
      <main ref={main} id="main-content" tabIndex={-1}>
        <header className="page-header">
          <div className="page-heading">
            <h1>{viewTitle(view)}</h1>
          </div>
          <form
            className="global-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              navigate("search");
            }}
          >
            <Icon name="search" size={17} />
            <input
              ref={search}
              type="search"
              aria-label="Buscar en Zenith"
              placeholder="Buscar en tu música"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <kbd>Ctrl K</kbd>
          </form>
          <button
            className="header-add icon-button"
            disabled={!audio.available || picking}
            onClick={() => void openFiles()}
            title="Abrir archivos de audio"
            aria-label="Abrir archivos de audio"
          >
            <Icon name="plus" />
          </button>
        </header>
        <div className="page-content" key={`${view}-${libraryQuery}`}>
          {loading && (
            <p className="inline-note" role="status">
              Abriendo tu biblioteca…
            </p>
          )}
          {(error || themeError) && (
            <p className="error-note" role="alert">
              {error || themeError}
            </p>
          )}
          {(audio.error || audio.state.error) && (
            <div className="playback-alert" role="alert">
              <span>{audio.error || audio.state.error}</span>
              <button
                className="text-button"
                onClick={() => void audio.restartOutput()}
              >
                Reintentar salida
              </button>
            </div>
          )}
          {content()}
        </div>
      </main>
      <PlayerBar
        audio={audio}
        current={current}
        navigate={navigate}
        onOpenFiles={() => void openFiles()}
        onFavorite={() => void favorite()}
      />
      {playerExpanded && (
        <ExpandedPlayer
          audio={audio}
          current={current}
          navigate={navigate}
          onOpenFiles={() => void openFiles()}
          onFavorite={() => void favorite()}
          onMinimize={() => setPlayerExpanded(false)}
        />
      )}
    </div>
  );
}
