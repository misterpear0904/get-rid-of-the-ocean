# Publish Get Rid of the Ocean on GitHub Pages

The workflow in `.github/workflows/pages.yml` tests the game, checks JavaScript syntax, and publishes only `dist/`. Three.js is already bundled, so deployment needs no dependency install or build. Pull requests run checks without deploying.

## First publication

1. Create or choose a GitHub repository. A public repository works with GitHub Free. The playable Pages website is normally public.
2. Push this project's source to its `main` branch. Include `dist/`, `.github/workflows/pages.yml`, and `tests/`. Do not upload the release ZIP or `node_modules/`. `.openai/` contains unrelated hosting metadata and is ignored.
3. In the repository, choose **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Open **Actions → Publish game to GitHub Pages → Run workflow**, select `main`, then **Run workflow**. If Pages was enabled before the first push, that push will already have triggered it.
5. After both jobs pass, the deployment link opens the playable game. For a project repository its address is `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.

## Future updates

Commit and push changes to `main`. The workflow checks and publishes each update automatically. Failed tests stop publication; the previously published version stays live.

The game uses relative imports and asset paths, so it works beneath the repository subpath without modifying the game. No secrets, paid services, database, or running Node server are needed for the published game. Node is used only by automated checks and the optional local server.

## Move your current save

Export the save through **Field Notes** on the local version. Open the Pages game, then use **Field Notes → Import Save**. Saves and settings belong to each browser origin; the local and hosted games keep separate storage.

## Official references

- [Configure a Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Use a custom Pages workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
