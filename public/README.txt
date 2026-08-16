Silicon to Singularity - SFX assets

Drop short sound-effect files here with EXACTLY these filenames (wav).
game/services/audioManifest.ts references them by this exact path/name -
no code change is needed once a file is added.

  buy.wav               - Buying a GPU or cooling unit
  upgrade.wav            - (reserved for a future facility-upgrade-specific cue)
  hire.wav                - Hiring staff
  research-unlock.wav     - Unlocking a tech
  training-start.wav      - Starting a training job
  model-complete.wav      - A training job finishes
  deploy.wav               - Deploying a model
  funding.wav              - A funding round succeeds
  warning.wav               - A new warning appears (thermal/runway/etc.)
  loss-explosion.wav        - A Loss Explosion occurs mid-training
  meltdown.wav               - Meltdown newly triggers
  save.wav                    - Manual save
  tab-switch.wav               - Switching a facility tab
  game-clear.wav                - Singularity achieved (AGI clear)
  achievement.wav                - An achievement unlocks
  ui-hover.wav                    - (reserved - defined but not yet wired to hover states)
  ui-click.wav                     - (reserved - generic UI click, not yet wired)
  data-click.wav                    - Manual "Collect Raw Data" click
  data-clean.wav                     - Manual "Clean Data" click

Missing files are silently skipped (no crash, no console error) - the game
is fully playable with this folder empty.
