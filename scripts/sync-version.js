// Script tự động đồng bộ phiên bản từ txaversion.js sang package.json và README.md
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// 1. Đọc phiên bản từ txaversion.js
const txaVersionFile = path.join(rootDir, "js", "txaversion.js");
const content = fs.readFileSync(txaVersionFile, "utf-8");

const versionMatch = content.match(/new\s+txaversion\(\s*["']([^"']+)["']\s*,\s*(\d+)\s*,\s*["']([^"']+)["']/);
if (!versionMatch) {
  console.error("❌ Không tìm thấy định nghĩa txaversion.CURRENT_VERSION trong js/txaversion.js!");
  process.exit(1);
}

const [, currentVer, versionCode, releaseDate] = versionMatch;
console.log(`📌 Phát hiện phiên bản hiện tại: v${currentVer} (code: ${versionCode}, ngày: ${releaseDate})`);

// 2. Cập nhật package.json
const pkgFile = path.join(rootDir, "package.json");
if (fs.existsSync(pkgFile)) {
  const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf-8"));
  pkg.version = currentVer;
  fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  console.log(`✓ Đã cập nhật package.json -> version ${currentVer}`);
}

// 3. Cập nhật README.md (Badge Phiên Bản & Ngày Phát Hành)
const readmeFile = path.join(rootDir, "README.md");
if (fs.existsSync(readmeFile)) {
  let readme = fs.readFileSync(readmeFile, "utf-8");
  readme = readme.replace(/Phi%C3%AAn%20B%E1%BA%A3n-[^)]+-F59E0B/, `Phi%C3%AAn%20B%E1%BA%A3n-v${currentVer}-F59E0B`);
  readme = readme.replace(/Ph%C3%A1t%20H%C3%A0nh-[^)]+-blue/, `Ph%C3%A1t%20H%C3%A0nh-${encodeURIComponent(releaseDate)}-blue`);
  fs.writeFileSync(readmeFile, readme, "utf-8");
  console.log(`✓ Đã cập nhật README.md -> v${currentVer}`);
}

// 4. Cập nhật sw.js (CACHE_NAME & PRECACHE_ASSETS query ?v=)
const swFile = path.join(rootDir, "sw.js");
if (fs.existsSync(swFile)) {
  let sw = fs.readFileSync(swFile, "utf-8");
  sw = sw.replace(/const CACHE_NAME = ["'][^"']+["'];/, `const CACHE_NAME = "mycay-pwa-v${currentVer}";`);
  sw = sw.replace(/\?v=[0-9a-zA-Z.-]+/g, `?v=${currentVer}`);
  fs.writeFileSync(swFile, sw, "utf-8");
  console.log(`✓ Đã cập nhật sw.js -> CACHE_NAME mycay-pwa-v${currentVer}`);
}

// 5. Cập nhật index.html (link stylesheets & scripts ?v=)
const indexFile = path.join(rootDir, "index.html");
if (fs.existsSync(indexFile)) {
  let html = fs.readFileSync(indexFile, "utf-8");
  html = html.replace(/\?v=[0-9a-zA-Z.-]+/g, `?v=${currentVer}`);
  fs.writeFileSync(indexFile, html, "utf-8");
  console.log(`✓ Đã cập nhật index.html -> query ?v=${currentVer}`);
}

// 6. Cập nhật các ES module imports trong thư mục js/
const jsDir = path.join(rootDir, "js");
const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith(".js"));
for (const file of jsFiles) {
  const filePath = path.join(jsDir, file);
  let jsContent = fs.readFileSync(filePath, "utf-8");
  if (jsContent.includes("?v=")) {
    jsContent = jsContent.replace(/\?v=[0-9a-zA-Z.-]+/g, `?v=${currentVer}`);
    fs.writeFileSync(filePath, jsContent, "utf-8");
    console.log(`✓ Đã cập nhật imports trong js/${file} -> ?v=${currentVer}`);
  }
}

console.log("🎉 Hoàn tất đồng bộ toàn bộ file trong dự án!");
