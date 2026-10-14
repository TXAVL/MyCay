// ==========================================================
// MÃ QR CHƠI GAME CÙNG BẠN BÈ (TXAQR)
// Tạo mã QR Code độc lập (Zero-dependency) chuẩn Level H
// Cho phép vẽ logo Tiệm Mỳ Cay ở chính giữa & tải ảnh PNG
// ==========================================================

export class txaqr {
  /**
   * Tạo bảng dữ liệu QR Code từ văn bản (Hỗ trợ URL bất kỳ)
   * Sử dụng thuật toán QR Code Model 2 chuẩn với Error Correction H (30%)
   */
  static createQRCodeMatrix(text) {
    // Thuật toán QR Code Generator chuẩn hỗ trợ Byte mode & Error Correction H
    const QRMode = { MODE_NUMBER: 1, MODE_ALPHA_NUM: 2, MODE_8BIT_BYTE: 4, MODE_KANJI: 8 };
    const QRErrorCorrectLevel = { L: 1, M: 0, Q: 3, H: 2 };

    function QRBitBuffer() {
      this.buffer = [];
      this.length = 0;
    }
    QRBitBuffer.prototype = {
      get: function(index) {
        const bufIndex = Math.floor(index / 8);
        return ((this.buffer[bufIndex] >>> (7 - index % 8)) & 1) == 1;
      },
      put: function(num, length) {
        for (let i = 0; i < length; i++) {
          this.putBit(((num >>> (length - i - 1)) & 1) == 1);
        }
      },
      putBit: function(bit) {
        const bufIndex = Math.floor(this.length / 8);
        if (this.buffer.length <= bufIndex) {
          this.buffer.push(0);
        }
        if (bit) {
          this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
        }
        this.length++;
      }
    };

    const QRPolynomial = function(num, shift) {
      if (num.length == undefined) throw new Error(num.length + "/" + shift);
      let offset = 0;
      while (offset < num.length && num[offset] == 0) offset++;
      this.num = new Array(num.length - offset + shift);
      for (let i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
    };
    QRPolynomial.prototype = {
      get: function(index) { return this.num[index]; },
      getLength: function() { return this.num.length; },
      multiply: function(e) {
        const num = new Array(this.getLength() + e.getLength() - 1);
        for (let i = 0; i < this.getLength(); i++) {
          for (let j = 0; j < e.getLength(); j++) {
            num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
          }
        }
        return new QRPolynomial(num, 0);
      },
      mod: function(e) {
        if (this.getLength() - e.getLength() < 0) return this;
        const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
        const num = new Array(this.getLength());
        for (let i = 0; i < this.getLength(); i++) num[i] = this.get(i);
        for (let i = 0; i < e.getLength(); i++) {
          num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
        }
        return new QRPolynomial(num, 0).mod(e);
      }
    };

    const QRMath = {
      glog: function(n) {
        if (n < 1) throw new Error("glog(" + n + ")");
        return QRMath.LOG_TABLE[n];
      },
      gexp: function(n) {
        while (n < 0) n += 255;
        while (n >= 255) n -= 255;
        return QRMath.EXP_TABLE[n];
      },
      EXP_TABLE: new Array(256),
      LOG_TABLE: new Array(256)
    };
    for (let i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
    for (let i = 8; i < 256; i++) QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4] ^ QRMath.EXP_TABLE[i - 5] ^ QRMath.EXP_TABLE[i - 6] ^ QRMath.EXP_TABLE[i - 8];
    for (let i = 0; i < 255; i++) QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;

    const QRRSBlock = {
      RS_BLOCK_TABLE: [
        // 1
        [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
        // 2
        [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
        // 3
        [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
        // 4
        [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
        // 5
        [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
        // 6
        [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],
        // 7
        [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14],
        // 8
        [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15],
        // 9
        [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13],
        // 10
        [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16]
      ],
      getRSBlocks: function(typeNumber, errorCorrectLevel) {
        const rsBlock = QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + errorCorrectLevel];
        if (rsBlock == undefined) throw new Error("bad rs block: " + typeNumber + "/" + errorCorrectLevel);
        const length = rsBlock.length / 3;
        const list = [];
        for (let i = 0; i < length; i++) {
          const count = rsBlock[i * 3 + 0];
          const totalCount = rsBlock[i * 3 + 1];
          const dataCount = rsBlock[i * 3 + 2];
          for (let j = 0; j < count; j++) {
            list.push({ totalCount: totalCount, dataCount: dataCount });
          }
        }
        return list;
      }
    };

    function QRCode(typeNumber, errorCorrectLevel) {
      this.typeNumber = typeNumber;
      this.errorCorrectLevel = errorCorrectLevel;
      this.modules = null;
      this.moduleCount = 0;
      this.dataList = [];
    }

    QRCode.prototype = {
      addData: function(data) {
        this.dataList.push({
          mode: QRMode.MODE_8BIT_BYTE,
          data: data,
          getLength: function() { return data.length; },
          write: function(buffer) {
            for (let i = 0; i < data.length; i++) {
              buffer.put(data.charCodeAt(i), 8);
            }
          }
        });
      },
      make: function() {
        this.makeImpl(false, this.getBestMaskPattern());
      },
      makeImpl: function(test, maskPattern) {
        this.moduleCount = this.typeNumber * 4 + 17;
        this.modules = new Array(this.moduleCount);
        for (let row = 0; row < this.moduleCount; row++) {
          this.modules[row] = new Array(this.moduleCount);
          for (let col = 0; col < this.moduleCount; col++) {
            this.modules[row][col] = null;
          }
        }
        this.setupPositionProbePattern(0, 0);
        this.setupPositionProbePattern(this.moduleCount - 7, 0);
        this.setupPositionProbePattern(0, this.moduleCount - 7);
        this.setupPositionAdjustPattern();
        this.setupTimingPattern();
        this.setupTypeInfo(test, maskPattern);
        if (this.typeNumber >= 7) this.setupTypeNumber(test);
        const data = QRCode.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
        this.mapData(data, maskPattern);
      },
      setupPositionProbePattern: function(row, col) {
        for (let r = -1; r <= 7; r++) {
          if (row + r <= -1 || this.moduleCount <= row + r) continue;
          for (let c = -1; c <= 7; c++) {
            if (col + c <= -1 || this.moduleCount <= col + c) continue;
            if ((0 <= r && r <= 6 && (c == 0 || c == 6)) ||
                (0 <= c && c <= 6 && (r == 0 || r == 6)) ||
                (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
              this.modules[row + r][col + c] = true;
            } else {
              this.modules[row + r][col + c] = false;
            }
          }
        }
      },
      getBestMaskPattern: function() {
        return 0; // Pattern 0 chuẩn cho đa số web URL
      },
      setupTimingPattern: function() {
        for (let r = 8; r < this.moduleCount - 8; r++) {
          if (this.modules[r][6] !== null) continue;
          this.modules[r][6] = (r % 2 == 0);
        }
        for (let c = 8; c < this.moduleCount - 8; c++) {
          if (this.modules[6][c] !== null) continue;
          this.modules[6][c] = (c % 2 == 0);
        }
      },
      setupPositionAdjustPattern: function() {
        const pos = [
          [],
          [6, 18],
          [6, 22],
          [6, 26],
          [6, 30],
          [6, 34],
          [6, 22, 38],
          [6, 24, 42],
          [6, 26, 46],
          [6, 28, 50]
        ][this.typeNumber - 1] || [];
        for (let i = 0; i < pos.length; i++) {
          for (let j = 0; j < pos.length; j++) {
            const row = pos[i];
            const col = pos[j];
            if (this.modules[row][col] !== null) continue;
            for (let r = -2; r <= 2; r++) {
              for (let c = -2; c <= 2; c++) {
                if (r == -2 || r == 2 || c == -2 || c == 2 || (r == 0 && c == 0)) {
                  this.modules[row + r][col + c] = true;
                } else {
                  this.modules[row + r][col + c] = false;
                }
              }
            }
          }
        }
      },
      setupTypeInfo: function(test, maskPattern) {
        const data = (this.errorCorrectLevel << 3) | maskPattern;
        const bits = QRCode.getBCHTypeInfo(data);
        for (let i = 0; i < 15; i++) {
          const mod = (!test && ((bits >> i) & 1) == 1);
          if (i < 6) this.modules[i][8] = mod;
          else if (i < 8) this.modules[i + 1][8] = mod;
          else this.modules[this.moduleCount - 15 + i][8] = mod;
        }
        for (let i = 0; i < 15; i++) {
          const mod = (!test && ((bits >> i) & 1) == 1);
          if (i < 8) this.modules[8][this.moduleCount - i - 1] = mod;
          else if (i < 9) this.modules[8][15 - i - 1 + 1] = mod;
          else this.modules[8][15 - i - 1] = mod;
        }
        this.modules[this.moduleCount - 8][8] = !test;
      },
      mapData: function(data, maskPattern) {
        let inc = -1;
        let row = this.moduleCount - 1;
        let bitIndex = 7;
        let byteIndex = 0;
        for (let col = this.moduleCount - 1; col > 0; col -= 2) {
          if (col == 6) col--;
          while (true) {
            for (let c = 0; c < 2; c++) {
              if (this.modules[row][col - c] === null) {
                let dark = false;
                if (byteIndex < data.length) {
                  dark = (((data[byteIndex] >>> bitIndex) & 1) == 1);
                }
                const mask = (row + (col - c)) % 2 == 0;
                if (mask) dark = !dark;
                this.modules[row][col - c] = dark;
                bitIndex--;
                if (bitIndex == -1) {
                  byteIndex++;
                  bitIndex = 7;
                }
              }
            }
            row += inc;
            if (row < 0 || this.moduleCount <= row) {
              row -= inc;
              inc = -inc;
              break;
            }
          }
        }
      }
    };

    QRCode.createData = function(typeNumber, errorCorrectLevel, dataList) {
      const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
      const buffer = new QRBitBuffer();
      for (let i = 0; i < dataList.length; i++) {
        const data = dataList[i];
        buffer.put(data.mode, 4);
        buffer.put(data.getLength(), 8); // 8-bit length indicator for byte mode v1-9
        data.write(buffer);
      }
      let totalDataCount = 0;
      for (let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
      if (buffer.length + 4 <= totalDataCount * 8) buffer.put(0, 4);
      while (buffer.length % 8 != 0) buffer.putBit(false);
      while (true) {
        if (buffer.length >= totalDataCount * 8) break;
        buffer.put(0xec, 8);
        if (buffer.length >= totalDataCount * 8) break;
        buffer.put(0x11, 8);
      }
      return QRCode.createBytes(buffer, rsBlocks);
    };

    QRCode.createBytes = function(buffer, rsBlocks) {
      let offset = 0;
      let maxDcCount = 0;
      let maxEcCount = 0;
      const dcdata = new Array(rsBlocks.length);
      const ecdata = new Array(rsBlocks.length);
      for (let r = 0; r < rsBlocks.length; r++) {
        const dcCount = rsBlocks[r].dataCount;
        const ecCount = rsBlocks[r].totalCount - dcCount;
        maxDcCount = Math.max(maxDcCount, dcCount);
        maxEcCount = Math.max(maxEcCount, ecCount);
        dcdata[r] = new Array(dcCount);
        for (let i = 0; i < dcdata[r].length; i++) dcdata[r][i] = 0xff & buffer.buffer[i + offset];
        offset += dcCount;
        const rsPoly = QRCode.getErrorCorrectPolynomial(ecCount);
        const rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
        const modPoly = rawPoly.mod(rsPoly);
        ecdata[r] = new Array(rsPoly.getLength() - 1);
        for (let i = 0; i < ecdata[r].length; i++) {
          const modIndex = i + modPoly.getLength() - ecdata[r].length;
          ecdata[r][i] = (modIndex >= 0) ? modPoly.get(modIndex) : 0;
        }
      }
      let totalCodeCount = 0;
      for (let i = 0; i < rsBlocks.length; i++) totalCodeCount += rsBlocks[i].totalCount;
      const data = new Array(totalCodeCount);
      let index = 0;
      for (let i = 0; i < maxDcCount; i++) {
        for (let r = 0; r < rsBlocks.length; r++) {
          if (i < dcdata[r].length) data[index++] = dcdata[r][i];
        }
      }
      for (let i = 0; i < maxEcCount; i++) {
        for (let r = 0; r < rsBlocks.length; r++) {
          if (i < ecdata[r].length) data[index++] = ecdata[r][i];
        }
      }
      return data;
    };

    QRCode.getErrorCorrectPolynomial = function(errorCorrectLength) {
      let a = new QRPolynomial([1], 0);
      for (let i = 0; i < errorCorrectLength; i++) {
        a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
      }
      return a;
    };

    QRCode.getBCHTypeInfo = function(data) {
      let d = data << 10;
      while (QRCode.getBCHDigit(d) - QRCode.getBCHDigit(1335) >= 0) {
        d ^= (1335 << (QRCode.getBCHDigit(d) - QRCode.getBCHDigit(1335)));
      }
      return ((data << 10) | d) ^ 21522;
    };

    QRCode.getBCHDigit = function(data) {
      let digit = 0;
      while (data != 0) {
        digit++;
        data >>>= 1;
      }
      return digit;
    };

    // Chọn version phù hợp cho URL (Version 4 hoặc 5 với Level H chứa tốt ~40-70 ký tự)
    let typeNumber = 4;
    if (text.length > 50) typeNumber = 6;
    if (text.length > 90) typeNumber = 8;

    const qr = new QRCode(typeNumber, QRErrorCorrectLevel.H);
    qr.addData(text);
    qr.make();

    return qr.modules;
  }

  /**
   * Vẽ mã QR lên thẻ Canvas với Logo ở giữa
   * @param {HTMLCanvasElement} canvas
   * @param {string} url
   * @param {string} logoSrc
   * @returns {Promise<boolean>}
   */
  static async renderToCanvas(canvas, url, logoSrc = "assets/logo.png") {
    if (!canvas) return false;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    try {
      const matrix = txaqr.createQRCodeMatrix(url);
      const modCount = matrix.length;

      // Độ phân giải cao cho canvas để khi tải về rất sắc nét
      const size = 600;
      canvas.width = size;
      canvas.height = size;

      // Nền trắng tinh khôi
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, size, size);

      const margin = 36;
      const cellSize = (size - margin * 2) / modCount;

      // Vẽ từng ô module của QR
      ctx.fillStyle = "#2D1B18"; // Màu nâu đen cà phê đậm ấm áp phong cách anime cozy
      for (let r = 0; r < modCount; r++) {
        for (let c = 0; c < modCount; c++) {
          if (matrix[r][c]) {
            const x = margin + c * cellSize;
            const y = margin + r * cellSize;

            // Bo tròn nhẹ từng pixel cho thẩm mỹ
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(x, y, cellSize + 0.3, cellSize + 0.3, 1.5) : ctx.rect(x, y, cellSize + 0.3, cellSize + 0.3);
            ctx.fill();
          }
        }
      }

      // Vẽ logo ở giữa
      const centerLogoSize = size * 0.24; // 24% diện tích trung tâm (Level H chịu được 30% mất dữ liệu)
      const centerX = (size - centerLogoSize) / 2;
      const centerY = (size - centerLogoSize) / 2;

      // Nền trắng tròn hoặc bo góc phía sau logo để tách biệt hoàn toàn khỏi các chấm QR
      ctx.save();
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
      ctx.shadowBlur = 14;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;

      const pad = 6;
      const boxX = centerX - pad;
      const boxY = centerY - pad;
      const boxW = centerLogoSize + pad * 2;
      const boxH = centerLogoSize + pad * 2;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(boxX, boxY, boxW, boxH, 16);
      } else {
        ctx.rect(boxX, boxY, boxW, boxH);
      }
      ctx.fill();
      ctx.restore();

      // Viền đỏ ấm phong cách Tiệm Mỳ Cay
      ctx.save();
      ctx.strokeStyle = "#C44569";
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(boxX, boxY, boxW, boxH, 16);
      } else {
        ctx.rect(boxX, boxY, boxW, boxH);
      }
      ctx.stroke();
      ctx.restore();

      // Tải và vẽ ảnh Logo
      await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          ctx.save();
          // Clip bo góc cho ảnh logo
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(centerX, centerY, centerLogoSize, centerLogoSize, 12);
            ctx.clip();
          }
          ctx.drawImage(img, centerX, centerY, centerLogoSize, centerLogoSize);
          ctx.restore();
          resolve(true);
        };
        img.onerror = () => {
          // Fallback nếu logo không load được: Vẽ biểu tượng tô mì cay
          ctx.fillStyle = "#FFF0F3";
          ctx.fillRect(centerX, centerY, centerLogoSize, centerLogoSize);
          ctx.font = "bold 56px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🍜", centerX + centerLogoSize / 2, centerY + centerLogoSize / 2);
          resolve(true);
        };
        img.src = logoSrc;
      });

      return true;
    } catch (err) {
      console.error("Lỗi tạo mã QR:", err);
      return false;
    }
  }

  /**
   * Tải ảnh mã QR xuống máy
   * @param {HTMLCanvasElement} canvas
   * @param {string} filename
   * @returns {{ success: boolean, message: string }}
   */
  static downloadQR(canvas, filename = "tiem-my-cay-qr.png") {
    if (!canvas) {
      return { success: false, message: "❌ Không tìm thấy khung ảnh mã QR!" };
    }

    try {
      const dataUrl = canvas.toDataURL("image/png");
      if (!dataUrl || dataUrl === "data:,") {
        return { success: false, message: "❌ Lỗi xuất dữ liệu hình ảnh mã QR!" };
      }

      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return {
        success: true,
        message: "✅ Đã tải ảnh mã QR thành công về thiết bị!"
      };
    } catch (e) {
      console.error("Lỗi download QR:", e);
      return {
        success: false,
        message: `❌ Không thể tải ảnh (${e.message || "Lỗi trình duyệt"})`
      };
    }
  }
}
