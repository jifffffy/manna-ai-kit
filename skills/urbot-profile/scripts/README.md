# urbot-profile scripts

`apply.mjs` writes the approved profile. It refuses to write without `--approve` and refuses to overwrite
existing files without `--force`. It only touches the bot profile package and resources.
