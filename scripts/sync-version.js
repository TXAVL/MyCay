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

// 3. Cập nhật README.md
const readmeFile = path.join(rootDir, "README.md");
if (fs.existsSync(readmeFile)) {
  let readme = fs.readFileSync(readmeFile, "utf-8");
  readme = readme.replace(/# 🍜 Tiệm Mỳ Cay \(Phiên Bản [^)]+\)/, `# 🍜 Tiệm Mỳ Cay (Phiên Bản ${currentVer})`);
  readme = readme.replace(/Ph%C3%A1t%20H%C3%A0nh-[^)]+-blue/, `Ph%C3%A1t%20H%C3%A0nh-${encodeURIComponent(releaseDate)}-blue`);
  fs.writeFileSync(readmeFile, readme, "utf-8");
  console.log(`✓ Đã cập nhật README.md -> v${currentVer}`);
}

console.log("🎉 Hoàn tất đồng bộ phiên bản!");
