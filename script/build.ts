import { build as esbuild, Plugin } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

const importMetaPlugin: Plugin = {
  name: "import-meta-polyfill",
  setup(build) {
    build.onLoad({ filter: /\.[tj]s$/ }, async (args) => {
      const contents = await readFile(args.path, "utf8");
      
      if (contents.includes("import.meta.dirname") || contents.includes("import.meta.url")) {
        const transformed = contents
          .replace(/import\.meta\.dirname/g, "__dirname")
          .replace(/import\.meta\.filename/g, "__filename")
          .replace(/import\.meta\.url/g, "require('url').pathToFileURL(__filename).href");
        
        return {
          contents: transformed,
          loader: args.path.endsWith(".ts") ? "ts" : "js",
        };
      }
      return null;
    });
  },
};

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "@google-cloud/storage",
  "@replit/object-storage",
  "axios",
  "bcryptjs",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "google-auth-library",
  "jsonwebtoken",
  "memoizee",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "openid-client",
  "passport",
  "passport-local",
  "pg",
  "resend",
  "semver",
  "stripe",
  "twilio",
  "uuid",
  "firebase-admin",
  "sharp",
  "web-push",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    plugins: [importMetaPlugin],
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
