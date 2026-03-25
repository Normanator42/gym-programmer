const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const projectRoot = path.resolve(__dirname, "..");
const entryPoint = path.join(projectRoot, "src", "main.jsx");
const stylesPath = path.join(projectRoot, "styles.css");
const publicDir = path.join(projectRoot, "public");

async function build() {
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }

  const result = await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    format: "iife",
    minify: true,
    target: ["ios12", "safari12", "es2018"],
    outfile: path.join(publicDir, "app.bundle.js"),
  });

  fs.copyFileSync(stylesPath, path.join(publicDir, "styles.css"));

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="theme-color" content="#0a7a5a" />
    <link rel="manifest" href="./manifest.json" />
    <link rel="apple-touch-icon" href="./icon-192.svg" />
    <title>1RM Equivalency Calculator</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <main class="app-shell">
      <noscript>This calculator needs JavaScript enabled.</noscript>
      <div id="root"></div>
    </main>
    <script src="./app.bundle.js"></script>
    <script>
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./sw.js");
      }
    </script>
  </body>
</html>
`;

  fs.writeFileSync(path.join(publicDir, "index.html"), html, "utf8");

  console.log("Build complete -> public/");
  console.log("  index.html, styles.css, app.bundle.js, sw.js, manifest.json, icons");
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
