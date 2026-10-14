// ==========================================================
// Copyright (c) 2026 TXA. All rights reserved.
// Project: Tiệm Mỳ Cay (https://tmc.txasoftdev.workers.dev/)
// Author: TXA (txasoftdev)
// QR Code Generator Engine licensed under MIT License
// ==========================================================

// Khởi tạo engine QR Code chuẩn quốc tế (Zero external dependency)
const createQREngine = function () {
  var qrcode = (function () {
    function i(t, r) {
      function a(t, r) {
        (g = (function (t) {
          for (var r = new Array(t), e = 0; e < t; e += 1) {
            r[e] = new Array(t);
            for (var n = 0; n < t; n += 1) r[e][n] = null;
          }
          return r;
        })((l = 4 * u + 17))),
          e(0, 0),
          e(l - 7, 0),
          e(0, l - 7),
          i(),
          o(),
          v(t, r),
          7 <= u && h(t),
          null == n && (n = w(u, f, c)),
          d(n, r);
      }
      var u = t,
        f = y[r],
        g = null,
        l = 0,
        n = null,
        c = [],
        s = {},
        e = function (t, r) {
          for (var e = -1; e <= 7; e += 1)
            if (!(t + e <= -1 || l <= t + e))
              for (var n = -1; n <= 7; n += 1)
                r + n <= -1 ||
                  l <= r + n ||
                  (g[t + e][r + n] =
                    (0 <= e && e <= 6 && (0 == n || 6 == n)) ||
                    (0 <= n && n <= 6 && (0 == e || 6 == e)) ||
                    (2 <= e && e <= 4 && 2 <= n && n <= 4));
        },
        o = function () {
          for (var t = 8; t < l - 8; t += 1)
            null == g[t][6] && (g[t][6] = t % 2 == 0);
          for (var r = 8; r < l - 8; r += 1)
            null == g[6][r] && (g[6][r] = r % 2 == 0);
        },
        i = function () {
          for (var t = B.getPatternPosition(u), r = 0; r < t.length; r += 1)
            for (var e = 0; e < t.length; e += 1) {
              var n = t[r],
                o = t[e];
              if (null == g[n][o])
                for (var i = -2; i <= 2; i += 1)
                  for (var a = -2; a <= 2; a += 1)
                    g[n + i][o + a] =
                      -2 == i || 2 == i || -2 == a || 2 == a || (0 == i && 0 == a);
            }
        },
        h = function (t) {
          for (var r = B.getBCHTypeNumber(u), e = 0; e < 18; e += 1) {
            var n = !t && 1 == ((r >> e) & 1);
            g[Math.floor(e / 3)][(e % 3) + l - 8 - 3] = n;
          }
          for (e = 0; e < 18; e += 1) {
            n = !t && 1 == ((r >> e) & 1);
            g[(e % 3) + l - 8 - 3][Math.floor(e / 3)] = n;
          }
        },
        v = function (t, r) {
          for (var e = (f << 3) | r, n = B.getBCHTypeInfo(e), o = 0; o < 15; o += 1) {
            var i = !t && 1 == ((n >> o) & 1);
            o < 6 ? (g[o][8] = i) : o < 8 ? (g[o + 1][8] = i) : (g[l - 15 + o][8] = i);
          }
          for (o = 0; o < 15; o += 1) {
            i = !t && 1 == ((n >> o) & 1);
            o < 8
              ? (g[8][l - o - 1] = i)
              : o < 9
              ? (g[8][15 - o - 1 + 1] = i)
              : (g[8][15 - o - 1] = i);
          }
          g[l - 8][8] = !t;
        },
        d = function (t, r) {
          for (
            var e = -1, n = l - 1, o = 7, i = 0, a = B.getMaskFunction(r), u = l - 1;
            0 < u;
            u -= 2
          )
            for (6 == u && (u -= 1); ; ) {
              for (var f = 0; f < 2; f += 1)
                if (null == g[n][u - f]) {
                  var c = !1;
                  i < t.length && (c = 1 == ((t[i] >>> o) & 1)),
                    a(n, u - f) && (c = !c),
                    (g[n][u - f] = c),
                    -1 == (o -= 1) && ((i += 1), (o = 7));
                }
              if ((n += e) < 0 || l <= n) {
                (n -= e), (e = -e);
                break;
              }
            }
        },
        w = function (t, r, e) {
          for (var n = b.getRSBlocks(t, r), o = M(), i = 0; i < e.length; i += 1) {
            var a = e[i];
            o.put(a.getMode(), 4),
              o.put(a.getLength(), B.getLengthInBits(a.getMode(), t)),
              a.write(o);
          }
          var u = 0;
          for (i = 0; i < n.length; i += 1) u += n[i].dataCount;
          if (o.getLengthInBits() > 8 * u)
            throw "code length overflow. (" + o.getLengthInBits() + ">" + 8 * u + ")";
          for (o.getLengthInBits() + 4 <= 8 * u && o.put(0, 4); o.getLengthInBits() % 8 != 0; )
            o.putBit(!1);
          for (; !(o.getLengthInBits() >= 8 * u || (o.put(236, 8), o.getLengthInBits() >= 8 * u)); )
            o.put(17, 8);
          return (function (t, r) {
            for (
              var e = 0,
                n = 0,
                o = 0,
                i = new Array(r.length),
                a = new Array(r.length),
                u = 0;
              u < r.length;
              u += 1
            ) {
              var f = r[u].dataCount,
                c = r[u].totalCount - f;
              (n = Math.max(n, f)), (o = Math.max(o, c)), (i[u] = new Array(f));
              for (var g = 0; g < i[u].length; g += 1) i[u][g] = 255 & t.getBuffer()[g + e];
              e += f;
              var l = B.getErrorCorrectPolynomial(c),
                h = C(i[u], l.getLength() - 1).mod(l);
              a[u] = new Array(l.getLength() - 1);
              for (g = 0; g < a[u].length; g += 1) {
                var s = g + h.getLength() - a[u].length;
                a[u][g] = 0 <= s ? h.getAt(s) : 0;
              }
            }
            var v = 0;
            for (g = 0; g < r.length; g += 1) v += r[g].totalCount;
            var d = new Array(v),
              w = 0;
            for (g = 0; g < n; g += 1)
              for (u = 0; u < r.length; u += 1) g < i[u].length && ((d[w] = i[u][g]), (w += 1));
            for (g = 0; g < o; g += 1)
              for (u = 0; u < r.length; u += 1) g < a[u].length && ((d[w] = a[u][g]), (w += 1));
            return d;
          })(o, n);
        };
      (s.addData = function (t, r) {
        var e = null;
        switch ((r = r || "Byte")) {
          case "Numeric":
            e = x(t);
            break;
          case "Alphanumeric":
            e = m(t);
            break;
          case "Byte":
            e = L(t);
            break;
          default:
            e = L(t);
        }
        c.push(e), (n = null);
      }),
        (s.isDark = function (t, r) {
          if (t < 0 || l <= t || r < 0 || l <= r) throw t + "," + r;
          return g[t][r];
        }),
        (s.getModuleCount = function () {
          return l;
        }),
        (s.make = function () {
          if (u < 1) {
            for (var t = 1; t < 40; t++) {
              for (var r = b.getRSBlocks(t, f), e = M(), n = 0; n < c.length; n++) {
                var o = c[n];
                e.put(o.getMode(), 4),
                  e.put(o.getLength(), B.getLengthInBits(o.getMode(), t)),
                  o.write(e);
              }
              var i = 0;
              for (n = 0; n < r.length; n++) i += r[n].dataCount;
              if (e.getLengthInBits() <= 8 * i) break;
            }
            u = t;
          }
          a(
            !1,
            (function () {
              for (var t = 0, r = 0, e = 0; e < 8; e += 1) {
                a(!0, e);
                var n = B.getLostPoint(s);
                (0 == e || n < t) && ((t = n), (r = e));
              }
              return r;
            })()
          );
        });
      return s;
    }
    (i.stringToBytes = (
      i.stringToBytesFuncs = {
        default: function (t) {
          for (var r = [], e = 0; e < t.length; e += 1) {
            var n = t.charCodeAt(e);
            r.push(255 & n);
          }
          return r;
        }
      }
    ).default);
    var r,
      t,
      a = 1,
      u = 2,
      o = 4,
      f = 8,
      y = { L: 1, M: 0, Q: 3, H: 2 },
      e = 0,
      n = 1,
      c = 2,
      g = 3,
      l = 4,
      h = 5,
      s = 6,
      v = 7,
      B =
        ((r = [
          [],
          [6, 18],
          [6, 22],
          [6, 26],
          [6, 30],
          [6, 34],
          [6, 22, 38],
          [6, 24, 42],
          [6, 26, 46],
          [6, 28, 50],
          [6, 30, 54],
          [6, 32, 58],
          [6, 34, 62],
          [6, 26, 46, 66],
          [6, 26, 48, 70],
          [6, 26, 50, 74],
          [6, 30, 54, 78],
          [6, 30, 56, 82],
          [6, 30, 58, 86],
          [6, 34, 62, 90],
          [6, 28, 50, 72, 94],
          [6, 26, 50, 74, 98],
          [6, 30, 54, 78, 102],
          [6, 28, 54, 80, 106],
          [6, 32, 58, 84, 110],
          [6, 30, 58, 86, 114],
          [6, 34, 62, 90, 118],
          [6, 26, 50, 74, 98, 122],
          [6, 30, 54, 78, 102, 126],
          [6, 26, 52, 78, 104, 130],
          [6, 30, 56, 82, 108, 134],
          [6, 34, 60, 86, 112, 138],
          [6, 30, 58, 86, 114, 142],
          [6, 34, 62, 90, 118, 146],
          [6, 30, 54, 78, 102, 126, 150],
          [6, 24, 50, 76, 102, 128, 154],
          [6, 28, 54, 80, 106, 132, 158],
          [6, 32, 58, 84, 110, 136, 162],
          [6, 26, 54, 82, 110, 138, 166],
          [6, 30, 58, 86, 114, 142, 170]
        ]),
        ((t = {}).getBCHTypeInfo = function (t) {
          for (var r = t << 10; 0 <= d(r) - d(1335); ) r ^= 1335 << (d(r) - d(1335));
          return 21522 ^ ((t << 10) | r);
        }),
        (t.getBCHTypeNumber = function (t) {
          for (var r = t << 12; 0 <= d(r) - d(7973); ) r ^= 7973 << (d(r) - d(7973));
          return (t << 12) | r;
        }),
        (t.getPatternPosition = function (t) {
          return r[t - 1];
        }),
        (t.getMaskFunction = function (t) {
          switch (t) {
            case e:
              return function (t, r) {
                return (t + r) % 2 == 0;
              };
            case n:
              return function (t, r) {
                return t % 2 == 0;
              };
            case c:
              return function (t, r) {
                return r % 3 == 0;
              };
            case g:
              return function (t, r) {
                return (t + r) % 3 == 0;
              };
            case l:
              return function (t, r) {
                return (Math.floor(t / 2) + Math.floor(r / 3)) % 2 == 0;
              };
            case h:
              return function (t, r) {
                return (t * r) % 2 + ((t * r) % 3) == 0;
              };
            case s:
              return function (t, r) {
                return ((t * r) % 2 + ((t * r) % 3)) % 2 == 0;
              };
            case v:
              return function (t, r) {
                return (((t * r) % 3 + ((t + r) % 2)) % 2) == 0;
              };
            default:
              throw "bad maskPattern:" + t;
          }
        }),
        (t.getErrorCorrectPolynomial = function (t) {
          for (var r = C([1], 0), e = 0; e < t; e += 1)
            r = r.multiply(C([1, w.gexp(e)], 0));
          return r;
        }),
        (t.getLengthInBits = function (t, r) {
          if (1 <= r && r < 10)
            switch (t) {
              case a:
                return 10;
              case u:
                return 9;
              case o:
              case f:
                return 8;
              default:
                throw "mode:" + t;
            }
          else if (r < 27)
            switch (t) {
              case a:
                return 12;
              case u:
                return 11;
              case o:
                return 16;
              case f:
                return 10;
              default:
                throw "mode:" + t;
            }
          else {
            if (!(r < 41)) throw "type:" + r;
            switch (t) {
              case a:
                return 14;
              case u:
                return 13;
              case o:
                return 16;
              case f:
                return 12;
              default:
                throw "mode:" + t;
            }
          }
        }),
        (t.getLostPoint = function (t) {
          for (var r = t.getModuleCount(), e = 0, n = 0; n < r; n += 1)
            for (var o = 0; o < r; o += 1) {
              for (var i = 0, a = t.isDark(n, o), u = -1; u <= 1; u += 1)
                if (!(n + u < 0 || r <= n + u))
                  for (var f = -1; f <= 1; f += 1)
                    o + f < 0 ||
                      r <= o + f ||
                      (0 == u && 0 == f) ||
                      (a == t.isDark(n + u, o + f) && (i += 1));
              5 < i && (e += 3 + i - 5);
            }
          for (n = 0; n < r - 1; n += 1)
            for (o = 0; o < r - 1; o += 1) {
              var c = 0;
              t.isDark(n, o) && (c += 1),
                t.isDark(n + 1, o) && (c += 1),
                t.isDark(n, o + 1) && (c += 1),
                t.isDark(n + 1, o + 1) && (c += 1),
                (0 != c && 4 != c) || (e += 3);
            }
          for (n = 0; n < r; n += 1)
            for (o = 0; o < r - 6; o += 1)
              t.isDark(n, o) &&
                !t.isDark(n, o + 1) &&
                t.isDark(n, o + 2) &&
                t.isDark(n, o + 3) &&
                t.isDark(n, o + 4) &&
                !t.isDark(n, o + 5) &&
                t.isDark(n, o + 6) &&
                (e += 40);
          for (o = 0; o < r; o += 1)
            for (n = 0; n < r - 6; n += 1)
              t.isDark(n, o) &&
                !t.isDark(n + 1, o) &&
                t.isDark(n + 2, o) &&
                t.isDark(n + 3, o) &&
                t.isDark(n + 4, o) &&
                !t.isDark(n + 5, o) &&
                t.isDark(n + 6, o) &&
                (e += 40);
          var g = 0;
          for (o = 0; o < r; o += 1) for (n = 0; n < r; n += 1) t.isDark(n, o) && (g += 1);
          return (e += (Math.abs((100 * g) / r / r - 50) / 5) * 10);
        }),
        t);
    function d(t) {
      for (var r = 0; 0 != t; ) (r += 1), (t >>>= 1);
      return r;
    }
    var w = (function () {
      for (var r = new Array(256), e = new Array(256), t = 0; t < 8; t += 1) r[t] = 1 << t;
      for (t = 8; t < 256; t += 1) r[t] = r[t - 4] ^ r[t - 5] ^ r[t - 6] ^ r[t - 8];
      for (t = 0; t < 255; t += 1) e[r[t]] = t;
      var n = {
        glog: function (t) {
          if (t < 1) throw "glog(" + t + ")";
          return e[t];
        },
        gexp: function (t) {
          for (; t < 0; ) t += 255;
          for (; 256 <= t; ) t -= 255;
          return r[t];
        }
      };
      return n;
    })();
    function C(n, o) {
      if (void 0 === n.length) throw n.length + "/" + o;
      var r = (function () {
          for (var t = 0; t < n.length && 0 == n[t]; ) t += 1;
          for (var r = new Array(n.length - t + o), e = 0; e < n.length - t; e += 1)
            r[e] = n[e + t];
          return r;
        })(),
        i = {
          getAt: function (t) {
            return r[t];
          },
          getLength: function () {
            return r.length;
          },
          multiply: function (t) {
            for (
              var r = new Array(i.getLength() + t.getLength() - 1), e = 0;
              e < i.getLength();
              e += 1
            )
              for (var n = 0; n < t.getLength(); n += 1)
                r[e + n] ^= w.gexp(w.glog(i.getAt(e)) + w.glog(t.getAt(n)));
            return C(r, 0);
          },
          mod: function (t) {
            if (i.getLength() - t.getLength() < 0) return i;
            for (
              var r = w.glog(i.getAt(0)) - w.glog(t.getAt(0)),
                e = new Array(i.getLength()),
                n = 0;
              n < i.getLength();
              n += 1
            )
              e[n] = i.getAt(n);
            for (n = 0; n < t.getLength(); n += 1) e[n] ^= w.gexp(w.glog(t.getAt(n)) + r);
            return C(e, 0).mod(t);
          }
        };
      return i;
    }
    var k,
      A,
      b =
        ((k = [
          [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
          [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
          [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
          [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
          [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
          [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],
          [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14],
          [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15],
          [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13],
          [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16]
        ]),
        ((A = {}).getRSBlocks = function (t, r) {
          var e = (function (t, r) {
            switch (r) {
              case y.L:
                return k[4 * (t - 1) + 0];
              case y.M:
                return k[4 * (t - 1) + 1];
              case y.Q:
                return k[4 * (t - 1) + 2];
              case y.H:
                return k[4 * (t - 1) + 3];
            }
          })(t, r);
          if (void 0 === e) throw "bad rs block @ typeNumber:" + t + "/errorCorrectionLevel:" + r;
          for (var n, o, i = e.length / 3, a = [], u = 0; u < i; u += 1)
            for (
              var f = e[3 * u + 0], c = e[3 * u + 1], g = e[3 * u + 2], l = 0;
              l < f;
              l += 1
            )
              a.push(((n = g), (o = void 0), ((o = {}).totalCount = c), (o.dataCount = n), o));
          return a;
        }),
        A),
      M = function () {
        var e = [],
          n = 0,
          o = {
            getBuffer: function () {
              return e;
            },
            put: function (t, r) {
              for (var e = 0; e < r; e += 1) o.putBit(1 == ((t >>> (r - e - 1)) & 1));
            },
            getLengthInBits: function () {
              return n;
            },
            putBit: function (t) {
              var r = Math.floor(n / 8);
              e.length <= r && e.push(0), t && (e[r] |= 128 >>> (n % 8)), (n += 1);
            }
          };
        return o;
      },
      x = function (t) {
        var r = a,
          n = t,
          e = {
            getMode: function () {
              return r;
            },
            getLength: function () {
              return n.length;
            },
            write: function (t) {
              for (var r = n, e = 0; e + 2 < r.length; )
                t.put(o(r.substring(e, e + 3)), 10), (e += 3);
              e < r.length &&
                (1 == r.length - e
                  ? t.put(o(r.substring(e, e + 1)), 4)
                  : 2 == r.length - e && t.put(o(r.substring(e, e + 2)), 7));
            }
          },
          o = function (t) {
            for (var r = 0, e = 0; e < t.length; e += 1) r = 10 * r + i(t.charAt(e));
            return r;
          },
          i = function (t) {
            if ("0" <= t && t <= "9") return t.charCodeAt(0) - "0".charCodeAt(0);
            throw "illegal char :" + t;
          };
        return e;
      },
      m = function (t) {
        var r = u,
          n = t,
          e = {
            getMode: function () {
              return r;
            },
            getLength: function () {
              return n.length;
            },
            write: function (t) {
              for (var r = n, e = 0; e + 1 < r.length; )
                t.put(45 * o(r.charAt(e)) + o(r.charAt(e + 1)), 11), (e += 2);
              e < r.length && t.put(o(r.charAt(e)), 6);
            }
          },
          o = function (t) {
            if ("0" <= t && t <= "9") return t.charCodeAt(0) - "0".charCodeAt(0);
            if ("A" <= t && t <= "Z") return t.charCodeAt(0) - "A".charCodeAt(0) + 10;
            switch (t) {
              case " ": return 36;
              case "$": return 37;
              case "%": return 38;
              case "*": return 39;
              case "+": return 40;
              case "-": return 41;
              case ".": return 42;
              case "/": return 43;
              case ":": return 44;
              default: throw "illegal char :" + t;
            }
          };
        return e;
      },
      L = function (t) {
        var r = o,
          e = (function (t) {
            for (var r = [], e = 0; e < t.length; e++) {
              var n = t.charCodeAt(e);
              n < 128
                ? r.push(n)
                : n < 2048
                ? r.push(192 | (n >> 6), 128 | (63 & n))
                : n < 55296 || 57344 <= n
                ? r.push(224 | (n >> 12), 128 | ((n >> 6) & 63), 128 | (63 & n))
                : (e++,
                  (n = 65536 + (((1023 & n) << 10) | (1023 & t.charCodeAt(e)))),
                  r.push(
                    240 | (n >> 18),
                    128 | ((n >> 12) & 63),
                    128 | ((n >> 6) & 63),
                    128 | (63 & n)
                  ));
            }
            return r;
          })(t),
          n = {
            getMode: function () {
              return r;
            },
            getLength: function () {
              return e.length;
            },
            write: function (t) {
              for (var r = 0; r < e.length; r += 1) t.put(e[r], 8);
            }
          };
        return n;
      };
    return i;
  })();
  return qrcode;
};

const qrcodeEngine = createQREngine();

export class txaqr {
  /**
   * Sinh đối tượng QRCode chuẩn từ văn bản với Error Correction H
   * @param {string} text
   * @returns {any} QR instance
   */
  static generateQR(text) {
    // typeNumber = 0: Tự động phát hiện phiên bản tối ưu nhất theo độ dài URL
    // errorCorrectionLevel = 'H': Chịu được tới 30% che lấp / hư hao dữ liệu để chèn logo
    const qr = qrcodeEngine(0, "H");
    qr.addData(text);
    qr.make();
    return qr;
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
      const qr = txaqr.generateQR(url);
      const modCount = qr.getModuleCount();

      // Kích thước canvas lớn (500x500px) để quét cực nhạy và khi tải về rất sắc nét
      const canvasSize = 500;
      canvas.width = canvasSize;
      canvas.height = canvasSize;

      // 1. Vẽ nền trắng toàn bộ
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvasSize, canvasSize);

      // 2. Tính toán Quiet Zone (lề an toàn 4 modules theo chuẩn ISO/IEC 18004)
      const quietModules = 4;
      const totalModules = modCount + quietModules * 2;
      const cellSize = canvasSize / totalModules;
      const offset = quietModules * cellSize;

      // 3. Màu chấm QR: Nâu đậm cà phê anime cao cấp (#1F140E)
      ctx.fillStyle = "#1F140E";

      // 4. Vẽ từng module QR Code
      for (let r = 0; r < modCount; r++) {
        for (let c = 0; c < modCount; c++) {
          if (qr.isDark(r, c)) {
            const x = Math.round(offset + c * cellSize);
            const y = Math.round(offset + r * cellSize);
            const w = Math.ceil(cellSize);
            const h = Math.ceil(cellSize);
            ctx.fillRect(x, y, w, h);
          }
        }
      }

      // 5. Vẽ Logo trung tâm Tiệm Mỳ Cay
      // Kích thước logo chuẩn ~18% canvasSize để đảm bảo dữ liệu QR Level H luôn nguyên vẹn
      const logoBoxSize = Math.round(canvasSize * 0.20);
      const logoCenter = canvasSize / 2;
      const logoX = Math.round(logoCenter - logoBoxSize / 2);
      const logoY = Math.round(logoCenter - logoBoxSize / 2);

      // Vẽ nền trắng bo góc che nhẹ vùng trung tâm (Quiet box cho logo)
      ctx.save();
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      const pad = 4;
      const boxX = logoX - pad;
      const boxY = logoY - pad;
      const boxW = logoBoxSize + pad * 2;
      const boxH = logoBoxSize + pad * 2;
      const radius = 12;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(boxX, boxY, boxW, boxH, radius);
      } else {
        ctx.rect(boxX, boxY, boxW, boxH);
      }
      ctx.fill();
      ctx.restore();

      // Viền đỏ ánh berry ấm áp phong cách quán
      ctx.save();
      ctx.strokeStyle = "#C44569";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(boxX, boxY, boxW, boxH, radius);
      } else {
        ctx.rect(boxX, boxY, boxW, boxH);
      }
      ctx.stroke();
      ctx.restore();

      // Tải và vẽ hình logo
      await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          ctx.save();
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(logoX, logoY, logoBoxSize, logoBoxSize, 8);
            ctx.clip();
          }
          ctx.drawImage(img, logoX, logoY, logoBoxSize, logoBoxSize);
          ctx.restore();
          resolve(true);
        };
        img.onerror = () => {
          // Fallback nếu logo chưa tải: vẽ emoji mì cay
          ctx.fillStyle = "#FFF0F3";
          ctx.fillRect(logoX, logoY, logoBoxSize, logoBoxSize);
          ctx.font = "bold 44px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🍜", logoCenter, logoCenter);
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
