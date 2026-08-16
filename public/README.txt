Silicon to Singularity - BGM assets

Drop loop-friendly music files here with EXACTLY these filenames (mp3).
game/services/audioManifest.ts references them by this exact path/name -
no code change is needed once a file is added; it's picked up automatically
the next time that stage plays.

  title-theme.mp3        - Title screen
  garage-loop.mp3         - Base View stage: Garage
  office-loop.mp3         - Base View stage: Small Office
  server-room-loop.mp3    - Base View stage: Server Room
  data-center-loop.mp3    - Base View stage: Data Center
  hyperscale-loop.mp3     - Base View stage: Hyperscale Campus
  singularity-loop.mp3    - Base View stage: Singularity Lab (post AGI Theory)

Missing files are silently skipped (no crash, no console error) - the game
is fully playable with this folder empty.
