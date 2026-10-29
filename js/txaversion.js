// Quản lý phiên bản game Tiệm Mỳ Cay
// Khai báo class txaversion theo đúng yêu cầu dự án

export class txaversion {
  constructor(version, versionCode, releaseDate, features = [], themeName = "") {
    this.version = version; // Ví dụ: "1.4.0"
    this.versionCode = versionCode; // Ví dụ: 140
    this.releaseDate = releaseDate;
    this.features = features; // Danh sách { title, desc, icon, badge }
    this.themeName = themeName || (features[0] ? features[0].title : "Bản Cập Nhật Mới");
  }

  // Khai báo phiên bản hiện tại của game (Bản 2.3.2 - Sửa lỗi)
  static get CURRENT_VERSION() {
    return new txaversion(
      "2.3.2",
      232,
      "29/10/2026",
      [
        {
          title: "Sửa Lỗi",
          desc: "Sửa lỗi hướng dẫn tân thủ hiện lên khi đang ở ngoài phố và chỉ sai chỗ.",
          icon: "🛠️",
          badge: "Sửa Lỗi 🛠️",
          badgeType: "manage"
        }
      ],
      "Sửa Lỗi"
    );
  }

  // Lịch sử các phiên bản
  static get VERSION_HISTORY() {
    return [
      txaversion.CURRENT_VERSION,
      new txaversion(
        "2.3.1",
        231,
        "29/10/2026",
        [
          {
            title: "Bản Đồ Phố Hết Bị Giãn Trên Windows",
            desc: "Mỗi pixel trên bản đồ phố giờ khớp đúng số pixel thật của màn hình, kể cả khi Windows đặt tỉ lệ 125%, 150%. Màn hình rộng thấy trọn con phố, hình sắc nét, không còn bị kéo giãn hay phóng quá to.",
            icon: "🗺️",
            badge: "Sửa Lỗi 🛠️",
            badgeType: "manage"
          }
        ],
        "Sửa Bản Đồ Phố Trên Windows"
      ),
      new txaversion(
        "2.3.0",
        230,
        "29/10/2026",
        [
          {
            title: "Chợ Nguyên Liệu Có Giá & Hạn Dùng",
            desc: "Giá chợ đổi mỗi ngày, có mưa bão, khuyến mãi; chợ bán số lượng có hạn, nhập sỉ được giảm giá. Hàng tươi có hạn dùng, để quá hạn là hỏng phải đổ bỏ.",
            icon: "🏪",
            badge: "Đại Trùng Tu ✨",
            badgeType: "hot"
          },
          {
            title: "Tuyển Dụng Phỏng Vấn & Tâm Trạng",
            desc: "Ứng viên có tay nghề, mức lương và tính cách riêng, thử việc 2 ngày. Nhân viên có tâm trạng, xin tăng lương, nghỉ việc nếu bị nợ lương. Có thể thưởng nóng hoặc sa thải. Khi bạn vắng mặt, chính nhân viên trông tiệm và có thể chán đời nghỉ việc giữa ca.",
            icon: "🧑‍🍳",
            badge: "Mới ✨",
            badgeType: "hot"
          },
          {
            title: "Vay Vốn, Thuế & Hóa Đơn Thật",
            desc: "Vay trả góp có lãi, điểm tín dụng, nợ xấu bị trích sổ. Tiền thuê, điện, nước, gas tính theo lượng khách; thuế khoán 2% nộp mỗi 7 ngày. Lãi tiết kiệm sát thực tế hơn.",
            icon: "🏦",
            badge: "Nâng Cấp 🌟",
            badgeType: "star"
          }
        ],
        "Kinh Tế Thật"
      ),
      new txaversion(
        "2.2.0",
        220,
        "29/10/2026",
        [
          {
            title: "Giao Hàng Online Như Ngoài Đời",
            desc: "Đơn GrabFood, ShopeeFood, BeFood, Baemin: nhận hoặc từ chối đơn trong 15s, nấu niêu, ép màng, đóng túi, kèm đũa sốt, dán tem, báo món xong rồi giao cho tài xế đọc mã lấy hàng.",
            icon: "🛵",
            badge: "Đại Trùng Tu ✨",
            badgeType: "hot"
          },
          {
            title: "Phí Nền Tảng & Tỉ Lệ Nhận Đơn",
            desc: "Mỗi app thu phí riêng (15-20%). Có đơn COD: tài xế thu tiền mặt, đối soát cuối ca, khách có thể bom hàng nên nhớ gọi xác nhận. Ép màng niêu là miết tay quanh miệng niêu thật.",
            icon: "💸",
            badge: "Nâng Cấp 🌟",
            badgeType: "star"
          },
          {
            title: "Đánh Giá Theo Đúng Chuyến Giao",
            desc: "Khách chấm sao theo thực tế: giao trễ hẹn, mì nguội, đổ nước dùng, thiếu đũa ống hút, đóng gói ẩu. Cáo Shiro tự nhận đơn, đóng gói và giao tài xế.",
            icon: "⭐",
            badge: "Tối Ưu 🛠️",
            badgeType: "manage"
          }
        ],
        "Giao Hàng Online Như Thật"
      ),
      new txaversion(
        "2.1.0",
        210,
        "25/10/2026",
        [
          {
            title: "Nội Thất & Nhân Vật Pixel Toàn Diện",
            desc: "Đồng bộ đồ họa Retro Pixel 16-bit từ ngoài phố vào tận trong tiệm: 10 loài khách thú dễ thương, nhân viên bếp/sảnh, niêu đất sôi sùng sục và bàn ghế gỗ ấm cúng.",
            icon: "🏮",
            badge: "Đại Trùng Tu ✨",
            badgeType: "hot"
          },
          {
            title: "Tối Ưu Màn Hình Rộng Desktop",
            desc: "Giao diện cân đối hoàn hảo trên màn hình PC/Laptop (tỉ lệ 980px chuẩn), thanh điều hướng 11 nút trải đều 1 dòng thoáng mắt, không bị xé hình hay che khuất chữ.",
            icon: "🖥️",
            badge: "Nâng Cấp 🌟",
            badgeType: "star"
          },
          {
            title: "Đồng Bộ 7 Theme & Giao Diện Gọn Gàng",
            desc: "Tương thích hoàn hảo 7 bảng màu sắc Anime & Dark Mode; trả lại Bảng Đen Menu phấn trắng nổi bật; xóa bỏ hoàn toàn viền lồng hộp gây rối mắt trên các thẻ.",
            icon: "🎨",
            badge: "Tối Ưu 🛠️",
            badgeType: "manage"
          }
        ],
        "Nội Thất Pixel & Tối Ưu Màn Rộng"
      ),
      new txaversion(
        "2.0.0",
        200,
        "23/10/2026",
        [
          {
            title: "Bản Đồ Phố Pixel",
            desc: "Vào game là đứng ngoài phố ẩm thực. Kéo để dạo phố, chạm Tiệm Mỳ Cay để vào bán hàng; nút 🗺️ để ra phố.",
            icon: "🗺️",
            badge: "Mới ✨",
            badgeType: "hot"
          },
          {
            title: "Phố Có Chợ, Ngân Hàng, Bưu Cục",
            desc: "Chạm Chợ Nguyên Liệu, Ngân Hàng, Việc Làm, Bưu Cục để đi tới và mở thẳng chức năng đó.",
            icon: "🏙️",
            badge: "Mới ✨",
            badgeType: "hot"
          },
          {
            title: "Đoàn Kiểm Tra Sống Động",
            desc: "Cảnh sát pixel đi bộ tới tiệm, hội thoại kiểu RPG khi phát hiện gian lận.",
            icon: "👮",
            badge: "Nâng Cấp 🌟",
            badgeType: "star"
          }
        ],
        "Bản Đồ Phố Pixel"
      ),
      new txaversion(
        "1.9.1",
        191,
        "23/10/2026",
        [
          { title: "Đoàn Kiểm Tra Liên Ngành", desc: "Chơi gian lận (sửa dữ liệu, chỉ số bất thường) có thể bị đoàn kiểm tra ghé thăm, tịch thu cả tiệm. Tỉ lệ rất thấp, chơi thật thì không lo.", icon: "👮", badge: "Mới ✨", badgeType: "hot" }
        ],
        "Đoàn Kiểm Tra Liên Ngành"
      ),
      new txaversion(
        "1.9.0",
        190,
        "23/10/2026",
        [
          { title: "Tab Đánh Giá Mới", desc: "Đánh giá có tab riêng, đủ 1-5 sao. Khách đọc kỹ lời bạn trả lời và đáp lại đúng ý.", icon: "💬", badge: "Mới ✨", badgeType: "hot" },
          { title: "Doanh Thu Offline", desc: "Từ Ngày 30, quán tự bán khi bạn vắng mặt (tối đa 8 giờ/ngày).", icon: "📊", badge: "Mới ✨", badgeType: "hot" },
          { title: "Danh Tiếng & Mặt Bằng", desc: "Danh tiếng lên tới 1000⭐. Có thể mua đứt mặt bằng để miễn tiền thuê.", icon: "🏛️", badge: "Nâng Cấp 🌟", badgeType: "star" }
        ],
        "Tab Đánh Giá & Doanh Thu Offline"
      ),
      new txaversion(
        "1.8.1",
        181,
        "21/10/2026",
        [
          {
            title: "Sửa Lỗi & Tối Ưu",
            desc: "Sửa lỗi không tải được file sao lưu trên Facebook và Messenger browser. Bổ sung tính năng sao chép mã sao lưu và dán mã khôi phục; thêm hướng dẫn mở bằng Chrome/Safari.",
            icon: "🛠️",
            badge: "Sửa Lỗi 🛠️",
            badgeType: "manage"
          }
        ],
        "Sửa Lỗi & Tối Ưu"
      ),
      new txaversion(
        "1.8.0",
        180,
        "20/10/2026",
        [
          {
            title: "Sao Lưu & Khôi Phục",
            desc: "Cài đặt có nút 💾 Sao lưu (tải file .json) và 📂 Khôi phục. Lần đầu vào web có thể khôi phục ngay từ màn hình chờ.",
            icon: "💾",
            badge: "Tính Năng Mới ✨",
            badgeType: "hot"
          },
          {
            title: "Sửa Lỗi & Tối Ưu Logic",
            desc: "HUD hiện điểm sao trung bình chính xác (vd 4.3). Dữ liệu vừa khôi phục không bị game tự lưu đè.",
            icon: "🐞",
            badge: "Sửa Lỗi 🛠️",
            badgeType: "manage"
          }
        ],
        "Sao Lưu & Khôi Phục Dữ Liệu"
      ),
      new txaversion(
        "1.7.0",
        170,
        "19/10/2026",
        [
          {
            title: "Nhiệm Vụ Hằng Ngày & Rương Thưởng",
            desc: "Tab 🎯 Nhiệm vụ mới: mỗi ngày 3 nhiệm vụ ngẫu nhiên (bán đủ tô, giữ chuỗi, bưng thần tốc, đón khách VIP, giao shipper...) khó dần theo tuổi tiệm. Xong cả 3 mở Rương Thưởng Ngày. Quên bấm nhận thì cuối ca tự cộng thưởng, trong bếp có chip 🎯 xem nhanh tiến độ.",
            icon: "🎯",
            badge: "Tính Năng Mới ✨",
            badgeType: "hot"
          },
          {
            title: "Thành Tựu Tiệm 10 Nhóm Nhiều Bậc",
            desc: "Bậc Thầy Niêu Đất, Chuỗi Không Gãy, Đại Gia Mì Cay, Ngôi Sao Khu Phố, Nhà Sưu Tập Thực Khách... mỗi bậc thưởng tiền & XP cấp độ tiệm. Dock hiện chấm đỏ khi có thưởng chờ nhận.",
            icon: "🏆",
            badge: "Thành Tựu 🏆",
            badgeType: "star"
          },
          {
            title: "Khách Gọi Kèm Trà Sữa & Thưởng Tốc Độ",
            desc: "Khách tại quán giờ gọi kèm đồ uống ngay trên phiếu order. Bưng khi khách còn ≥70% kiên nhẫn được Thần tốc (+25% tip, nạp Giờ Vàng nhanh hơn); mỗi mốc chuỗi x5 cộng thêm +5% doanh thu (tối đa +25%).",
            icon: "🧋",
            badge: "Lối Chơi Mới 🎮",
            badgeType: "hot"
          },
          {
            title: "Đại Tu Logic Bán Hàng",
            desc: "Chỉ tính tiền đúng món khách gọi (hết cảnh pha nước khách không gọi vẫn thu tiền). Khách chỉ gọi món còn đủ hàng; món kèm hết giữa chừng thì được bưng thiếu. Nâng cấp Sốt Ớt/Shichimi không còn khiến khách chê đắt. Nguyên liệu phụ (mì sợi, nước hầm, niêu, trà, sữa) giờ thực sự tiêu hao mỗi phần bán.",
            icon: "⚖️",
            badge: "Cân Bằng Game 🍲",
            badgeType: "manage"
          },
          {
            title: "Nhân Viên Thông Minh Hơn",
            desc: "Kenji ưu tiên nấu cho khách sốt ruột nhất, Ducky pha đúng ly khách gọi (hết lỗi trừ kho 2 lần), Usagi kiểm tra đủ size & đồ uống trước khi bưng nên không còn kẹt bếp. Shipper chỉ tới 1 người mỗi lượt và không giao được khi kho hết mì.",
            icon: "🐼",
            badge: "Tối Ưu ⚡",
            badgeType: "manage"
          },
          {
            title: "Giao Diện Lần 2 Gọn & Rõ Hơn",
            desc: "Toast bưng món không còn bị toast \"dọn niêu\" đè mất, gom gọn mọi khoản thưởng trong 1 dòng. Tiêu đề bếp, tab Sảnh Bàn Ăn và thanh Giờ Vàng không còn bị cắt chữ trên điện thoại. Hóa đơn cuối ngày thêm thống kê ly nước, chuỗi max và nhiệm vụ.",
            icon: "🎨",
            badge: "Giao Diện Mới 🎨",
            badgeType: "visual"
          },
          {
            title: "Sửa Lỗi Quan Trọng",
            desc: "Tải lại trang không còn quay về Ngày 1. Giờ Vàng thống nhất x1.5 doanh thu ở mọi nơi hiển thị. Gói tiết kiệm kỳ hạn được cân bằng lại (3 ngày 4.5%/ngày, 7 ngày 7%/ngày). Đồng hồ ca hiển thị đúng 2:00.",
            icon: "🐞",
            badge: "Sửa Lỗi 🛠️",
            badgeType: "manage"
          }
        ],
        "Nhiệm Vụ Hằng Ngày & Đại Tu Logic Bán Hàng"
      ),
      new txaversion(
  "1.6.0",
        160,
        "17/10/2026",
        [
          {
            title: "Khung Cảnh Tiệm Sống Động",
            desc: "Tiệm mì giờ là một thế giới thật sự: khách chibi bước vào từ cửa, xếp hàng ở quầy gọi món, cầm tô đi về bàn ngồi ăn xì xụp rồi mới ra về. Đầu bếp và nhân viên đứng quầy nói chuyện rôm rả, nồi niêu bốc khói, ánh sáng đổi từ sáng sớm sang hoàng hôn rồi đêm theo giờ ca bán!",
            icon: "🏮",
            badge: "Đại Tu Giao Diện 🎮",
            badgeType: "hot"
          },
          {
            title: "Chạm Khách Để Nấu & Bưng Món",
            desc: "Chạm vào khách trong khung cảnh để nấu đúng món (bong bóng chuyển xanh ✓), chạm lần nữa để bưng ra. Chạm bàn bẩn 🧹 để dọn nhận tip, chạm khách đang ăn để nghe khen ngon!",
            icon: "👆",
            badge: "Lối Chơi Mới ✨",
            badgeType: "hot"
          },
          {
            title: "HUD Game, Cấp Độ Tiệm & Xu Vàng Bay",
            desc: "Thanh trạng thái kiểu game với ví xu vàng, sao đánh giá, đồng hồ ca bán. Tiệm có Cấp độ (Lv) và thanh XP, mỗi tô bán ra đều cộng kinh nghiệm, lên cấp có pháo giấy ăn mừng. Tiền vào là xu vàng bay thẳng về ví!",
            icon: "🪙",
            badge: "Cấp Độ Tiệm ⭐",
            badgeType: "star"
          },
          {
            title: "Dock Nút Tròn & Nút Bấm 3D",
            desc: "Thanh điều hướng mới dạng dock gỗ cố định đáy màn hình, nút bấm 3D lún xuống khi chạm, bảng nội dung có ruy băng tiêu đề, màn hình chờ mới với mặt tiền quán vẽ tay.",
            icon: "🕹️",
            badge: "Giao Diện Mới 🎨",
            badgeType: "visual"
          },
          {
            title: "Đại Tu Khu Bếp Nấu",
            desc: "Bếp mới khung gỗ ấm cúng: phiếu order giấy treo trên thanh ray inox (đung đưa khi khách mới tới), bếp niêu đặt trên quầy gỗ với tường gạch men và kệ gia vị, dock nguyên liệu dạng thùng 3D bấm lún. Nấu đúng món là phiếu đóng dấu ✓ ĐÚNG MÓN và chuông 🛎️ Bưng rung lên!",
            icon: "🍳",
            badge: "Bếp Mới 🔥",
            badgeType: "hot"
          },
          {
            title: "Chuỗi Phục Vụ, Doanh Thu Hôm Nay & Món Đặc Biệt Ngay Trong Bếp",
            desc: "Thanh tiêu đề bếp đếm Chuỗi phục vụ liên tiếp (mốc x5, x10... có thông báo ăn mừng, về 0 khi khách bỏ về hoặc bị từ chối), số tô · ly · tiền bán được hôm nay, kèm lời nhắc Món đặc biệt hôm nay để nấu đúng nhận Bonus.",
            icon: "🔥",
            badge: "Tính Năng Mới ✨",
            badgeType: "hot"
          },
          {
            title: "Phụ Bếp, Cảnh Báo Sắp Hết Hàng & Phím Tắt",
            desc: "Nhân viên đã thuê (Kenji, Ducky, Usagi, Shiba) hiện cạnh bếp. Thùng nguyên liệu báo cam khi còn ≤3 phần và xám khi đã hết. Trên máy tính có bảng gợi ý phím tắt 1·2·3 Bưng khách, C Làm lại, P Tạm dừng, Space Giao shipper.",
            icon: "🧑‍🍳",
            badge: "Tiện Ích 🛠️",
            badgeType: "star"
          },
          {
            title: "Gọn Gàng Trên Điện Thoại & Mượt Hơn",
            desc: "Khu bếp trên điện thoại gọn hơn khoảng 1/3 (phiếu order từ ~650px còn ~220px, bỏ đồng hồ trùng với HUD). Phiếu order không còn bị dựng lại mỗi giây nên không còn mất cú chạm khi đang bấm Nấu/Bưng.",
            icon: "📱",
            badge: "Tối Ưu ⚡",
            badgeType: "manage"
          },
          {
            title: "Sửa Lỗi Phím P Tiếp Tục Bán",
            desc: "Bấm phím P lần thứ hai để tiếp tục ca bán không còn bị lỗi và kẹt hộp thoại Tạm dừng.",
            icon: "🐞",
            badge: "Sửa Lỗi 🛠️",
            badgeType: "manage"
          }
        ],
        "Đại Tu Giao Diện Chuẩn Game Tiệm Nhỏ"
      ),
      new txaversion(
        "1.5.7",
        157,
        "17/10/2026",
        [
          {
            title: "Khắc Phục 100% Offline Trên iOS Safari",
            desc: "Tối ưu bộ điều hướng Cache-First cho Service Worker: Đã cài app vào màn hình chính iPhone/iPad, kể cả tắt mạng hoặc bật chế độ máy bay vẫn mở và chơi mượt mà 100% không còn bị Safari bắt kết nối Internet!",
            icon: "🍏",
            badge: "iOS Offline Fix ⚡",
            badgeType: "hot"
          },
          {
            title: "3 Siêu Nhân Viên Mới (Cụ Rùa, Bạch Hổ & Thần Long)",
            desc: "Đội ngũ nhân sự cao cấp: Cụ Rùa Torto (giảm 50% tiền nhà & sinh lãi két sắt), Bạch Hổ Tora (85% hóa giải khách giận dữ) và Thần Long Ryu (gọi bão FEVER & mưa vàng)!",
            icon: "🐾",
            badge: "Nhân Sự Mới 👥",
            badgeType: "hot"
          },
          {
            title: "5 Nâng Cấp Trang Thiết Bị Chiều Sâu",
            desc: "Mở rộng 5 trang bị cấp cao: Máy Ép Màng Tự Động (+20k/đơn online), Bếp Niêu Đôi Song Song (+40% tốc độ), Quạt Hút Mùi Ion Khói Cay (+35% ăn nhanh), Hồ Cá Koi Zen (+50% khách VIP) và Gia Vị 7 Vị Shichimi (+25% giá mì cay).",
            icon: "🛠️",
            badge: "Trang Bị Mới ✨",
            badgeType: "star"
          },
          {
            title: "Hệ Thống Ngân Hàng Tiết Kiệm (Boba Savings Bank)",
            desc: "Khai trương Ngân Hàng Tiết Kiệm Quán Mì: Gửi tiền an toàn không lo thâm hụt, rút linh hoạt bất kỳ lúc nào. Sinh lãi mỗi đêm từ 2.5%/ngày đến 12%/ngày với các gói kỳ hạn 3 ngày & 7 ngày VIP siêu lợi nhuận, kết hợp đặc quyền buff lãi suất từ Cụ Rùa Torto!",
            icon: "🏦",
            badge: "Ngân Hàng Mới 💳",
            badgeType: "hot"
          },
          {
            title: "Cân Bằng Kinh Tế & Chiều Sâu Chơi Càng Lâu Càng Cuốn",
            desc: "Chuẩn hóa bảng chi phí vận hành, giá bán người chơi thiết lập, phân bổ kiên nhẫn và chuỗi ngày dài hạn đến Ngày 55+ đầy thử thách và cuốn hút!",
            icon: "📈",
            badge: "Cân Bằng Game 🍲",
            badgeType: "manage"
          },
          {
            title: "Tối Ưu Nhập Kho & Cam Kết Bảo Quản Vô Hạn",
            desc: "Khóa thông minh nguyên liệu của những món chưa mở khóa trong Menu (kèm nút chuyển nhanh sang Menu mở khóa, không lo mua nhầm phí tiền). Toàn bộ nguyên liệu & topping nhập kho được bảo quản tươi ngon VÔ HẠN thời gian, vĩnh viễn không hư hỏng qua các ngày!",
            icon: "❄️",
            badge: "Lắng Nghe Góp Ý 💬",
            badgeType: "star"
          }
        ],
        "Đại Tiệc Nâng Cấp & Ngân Hàng Tiết Kiệm"
      ),
      new txaversion("1.5.5", 155, "15/10/2026", [
        {
          title: "Chế Độ Giờ Vàng FEVER RUSH & Khách VIP Thần Tài",
          desc: "Khai mở tính năng FEVER RUSH cực đỉnh: Phục vụ chuỗi khách hoàn hảo để kích hoạt Giờ Vàng bùng nổ, gấp đôi (x2) doanh thu và đóng băng thời gian kiên nhẫn! Đón tiếp những vị khách VIP quý tộc (Mèo Thần Tài Maneki, Đại Gia Shiba, Cửu Vĩ VIP) mang lại tiền tip khổng lồ cho tiệm mì!",
          icon: "👑",
          badge: "VIP Mới 🔥",
          badgeType: "hot"
        },
        {
          title: "Tối ưu hóa & Sửa lỗi",
          desc: "Sửa một số lỗi tồn đọng và tối ưu hóa hiệu năng, cải thiện trải nghiệm chơi mượt mà hơn cho chủ tiệm.",
          icon: "🛠️",
          badge: "Sửa lỗi 🛠️",
          badgeType: "manage"
        }
      ], "Giờ Vàng FEVER RUSH & Khách VIP Thần Tài"),
      new txaversion("1.5.0", 150, "15/10/2026", [
        {
          title: "3 Nhân Viên Mới Toàn Năng (Ducky, Owl, Fawn)",
          desc: "Tuyển dụng Vịt Ducky (Barista pha chế tự động, +25% doanh thu nước), Cú Mèo Owl (Trưởng Marketing kéo bão khách +40%, đơn online 10s, x2 review 5 sao) và Nai Fawn (Quản lý kho chiết khấu sỉ -15%, tự động nhập kho khi cạn & thưởng +50% hoa hồng giao hàng)!",
          icon: "🧑‍🍳",
          badge: "Nhân viên mới 🌟",
          badgeType: "hot"
        },
        {
          title: "Menu Trà Sữa Chuẩn Vị & 5 Topping Boba",
          desc: "Mở rộng 6 loại trà sữa hot trend: Oolong nướng, Matcha Latte boba, Khoai môn béo, Sữa tươi trân châu đường đen, Cà phê muối boba, Trà trái cây nhiệt đới kèm 5 topping: Trân châu đen dẻo, 3Q trắng giòn, Pudding trứng tươi, Thạch dừa non và Kem cheese Macchiato!",
          icon: "🧋",
          badge: "Menu mới 🔥",
          badgeType: "hot"
        },
        {
          title: "2 Theme Độc Quyền: Boba Pastel & Midnight Boba",
          desc: "Biến hóa diện mạo tiệm với sắc hồng kem sữa Boba Pastel ngọt ngào hoặc không gian bar trà sữa đêm tím neon Midnight Boba thời thượng cùng hiệu ứng Glassmorphism hiện đại!",
          icon: "🎨",
          badge: "Theme mới ✨",
          badgeType: "visual"
        },
        {
          title: "8 Khách Hàng Anime Chibi Mới (Tổng 24 Khách)",
          desc: "Chào đón thêm 8 thực khách thú cưng sành điệu: Cú Tú Cú Đêm, Vịt Quỳnh Nghiện Boba, Nai Bambi, Sóc Nutty, Rái Cá Otto Chill, Cánh Cụt Pen, Mèo Mun Luna và Gấu Teddy Hảo Ngọt!",
          icon: "🐾",
          badge: "Khách mới 💖",
          badgeType: "star"
        },
        {
          title: "Âm Thanh Shaker Trà Sữa & Tự Động Hóa Quán",
          desc: "Hiệu ứng âm thanh lắc bình shaker rộn rã khi pha chế đồ uống, tích hợp tự động hóa trọn gói quầy nước và kho bãi không lo đứt hàng!",
          icon: "🎵",
          badge: "Âm thanh 🎶",
          badgeType: "manage"
        },
        {
          title: "Shipper Sống Động & Ép Màng Niêm Phong Thùng",
          desc: "Đội ngũ tài xế đối tác GrabFood, ShopeeFood, BeFood, Baemin với hồ sơ và câu thoại chân thực. Thêm tính năng ép màng nắp niêu & thùng xốp giữ nhiệt nhận thêm +15k tip!",
          icon: "🛵",
          badge: "Shipper 2.0 📦",
          badgeType: "hot"
        },
        {
          title: "Hệ Thống Đánh Giá 2.0 & Voucher Đền Trà Sữa",
          desc: "Biểu đồ phân bổ sao 1-5★, thanh bộ lọc danh mục (5★, 1-3★, Chưa trả lời, Đơn online). Tặng voucher 20% & đền bù ly trà sữa để hóa giải review 1★ thành 5★ xuất sắc!",
          icon: "⭐",
          badge: "Review 2.0 🌟",
          badgeType: "hot"
        }
      ]),
      new txaversion("1.4.0", 140, "14/10/2026", [
        {
          title: "Mã QR Rủ Bạn Bè & Tải Ảnh Sắc Nét",
          desc: "Mở Cài Đặt để lấy mã QR kèm Logo Tiệm Mỳ Cay ở chính giữa! Bạn bè có thể dùng Camera hoặc Zalo quét mã để chơi ngay. Có sẵn nút tải ảnh PNG sắc nét và báo rõ trạng thái tải!",
          icon: "📱",
          badge: "Tính năng mới 🔥",
          badgeType: "hot"
        },
        {
          title: "Chọn Cấp Độ Cay & Size Ngay Trong Khung Chọn Mì",
          desc: "Không cần phải chuyển tab hay cuộn xuống cuối! Giờ đây khi bấm vào Mì, thanh chọn Độ Cay (0 - 7) và Size Niêu (M / L) xuất hiện ngay phía trên để bạn thao tác thần tốc!",
          icon: "🌶️",
          badge: "Tiện lợi ⚡",
          badgeType: "manage"
        }
      ]),
      new txaversion("1.3.0", 130, "14/10/2026", [
        {
          title: "Bộ Sưu Tập 5 Giao Diện Theme Tuyệt Sắc",
          desc: "Thỏa sức biến hóa tiệm mì với 5 phong cách: Ấm Áp Cozy truyền thống, Phố Đêm Tokyo, Hoa Anh Đào Pastel, Lửa Cay và Trà Xanh Matcha!",
          icon: "🎨",
          badge: "Bản 1.3.0",
          badgeType: "hot"
        }
      ]),
      new txaversion("1.2.0", 120, "13/10/2026", [
        {
          title: "Sân Khấu Phố Xá & Khách Dạo Phố Tấp Nập",
          desc: "Dòng khách hoạt hình dạo bước trên vỉa hè trước quán, hít hà mùi nước dùng và ngắm nghía tiệm mì!",
          icon: "🏮",
          badge: "Bản 1.2.0",
          badgeType: "hot"
        }
      ])
    ];
  }

  // Kiểm tra xem có phiên bản mới so với bản lưu trước đó không
  static checkNewVersion() {
    const savedVersion = localStorage.getItem("mycay_seen_version");
    const current = txaversion.CURRENT_VERSION.version;

    if (!savedVersion || savedVersion !== current) {
      return {
        isNew: true,
        lastVersion: savedVersion || "Chưa có",
        currentVersion: txaversion.CURRENT_VERSION
      };
    }
    return {
      isNew: false,
      currentVersion: txaversion.CURRENT_VERSION
    };
  }

  // Đánh dấu đã xem phiên bản hiện tại
  static markAsSeen() {
    localStorage.setItem("mycay_seen_version", txaversion.CURRENT_VERSION.version);
  }

  // Sinh HTML cho modal thông báo phiên bản mới với các card hoạt hình sinh động
  static renderChangelogCards() {
    const current = txaversion.CURRENT_VERSION;
    return `
      <div class="version-banner">
        <div class="version-banner-icon">${current.features[0]?.icon || '👑'}</div>
        <div class="version-banner-info">
          <div class="version-pill-tag">BẢN NÂNG CẤP MỚI v${current.version}</div>
          <h3 class="version-heading">${current.themeName || current.features[0]?.title || 'Bản Cập Nhật Mới'}</h3>
          <span class="version-date">📅 Phát hành: ${current.releaseDate} · Bản chính thức</span>
        </div>
      </div>
      <div class="version-cards-container">
        ${current.features
          .map(
            (item, index) => `
          <div class="version-card anime-bounce-in" style="animation-delay: ${index * 0.08}s">
            <div class="card-icon-wrap">
              <span class="card-icon-circle">${item.icon}</span>
            </div>
            <div class="card-content">
              <div class="card-top-row">
                <h4 class="card-title">${item.title}</h4>
                <span class="card-badge badge-${item.badgeType || 'hot'}">${item.badge}</span>
              </div>
              <p class="card-desc">${item.desc}</p>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }
}
