import { expect, it } from "vitest";
import type { LibraryTrack, MetadataRecord } from "./library";
import { albumGroups, playableTracks, searchMusic } from "./musicViews";

const track = (
  id: string,
  fields: Partial<LibraryTrack> = {},
): LibraryTrack => ({
  id,
  title: id,
  artist: "Aurora",
  album: "Órbita",
  album_artist: null,
  genre: "Ambient",
  year: null,
  track_number: null,
  disc_number: null,
  comments: null,
  local_path: `/music/${id}.wav`,
  duration: 60,
  artwork_id: null,
  format: "WAV",
  size: 10,
  added_at: 1,
  missing: false,
  favorite: false,
  play_count: 0,
  last_played: null,
  ...fields,
});

it("keeps distinct album identities in discovery even when names match", () => {
  const originals = [
    track("a", { metadata: { album_key: "original" } as MetadataRecord }),
    track("b", { metadata: { album_key: "live" } as MetadataRecord }),
    track("c", { metadata: { album_key: "original" } as MetadataRecord }),
  ];
  expect(albumGroups(originals).map((group) => group.map((t) => t.id))).toEqual(
    [["a", "c"], ["b"]],
  );
  expect(originals.map((t) => t.id)).toEqual(["a", "b", "c"]);
});
it("does not create a queue from missing files or pathless provider records", () => {
  const tracks = [
    track("a"),
    track("b", { missing: true }),
    track("c", { local_path: null }),
  ];
  expect(playableTracks(tracks).map((t) => t.id)).toEqual(["a"]);
  expect(tracks).toHaveLength(3);
});
it("searches Unicode metadata without displaying an unrequested full library", () => {
  const tracks = [
    track("a"),
    track("b", { artist: "Otro", album: "Otro", genre: "Rock" }),
  ];
  expect(searchMusic(tracks, " o\u0301RBITA ").map((t) => t.id)).toEqual(["a"]);
  expect(searchMusic(tracks, "ambient").map((t) => t.id)).toEqual(["a"]);
  expect(searchMusic(tracks, " ")).toEqual([]);
});
