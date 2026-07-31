// Shared data + logic for the reservation flow (detail + form pages).
// No backend: state is passed between pages via the URL and persisted
// to localStorage only at final submission.

const ROOMS = {
  standard: {
    key: "standard",
    title: "STANDARD",
    nameKo: "스탠다드",
    price: 150000,
    baseGuests: 2,
    maxGuests: 2,
    main: "images/room-standard-main.jpg",
    thumbs: [
      "images/room-standard-thumb1.jpg",
      "images/room-standard-thumb2.jpg",
      "images/room-standard-thumb3.jpg",
      "images/room-standard-thumb4.jpg",
    ],
    descKo:
      "스튜디오 타입 파스텔 톤 객실에 휴식을 취할 수 있는 테이블과 체어, 그리고 라탄 타입의 아늑한 체어를 완비한 가장 기본적인 룸입니다.",
    descEn:
      "A standard room is the most basic type of hotel room, typically offering a bed, a desk, and a private bathroom.",
  },
  deluxe: {
    key: "deluxe",
    title: "DELUXE",
    nameKo: "디럭스",
    price: 180000,
    baseGuests: 2,
    maxGuests: 3,
    main: "images/rooms1.png",
    thumbs: [
      "images/room-standard-thumb1.jpg",
      "images/room-standard-thumb2.jpg",
      "images/room-standard-thumb3.jpg",
      "images/room-standard-thumb4.jpg",
    ],
    descKo:
      "은은한 벚꽃 무늬 헤드보드와 트윈 베드를 갖춘 객실로, 가족 또는 친구와의 여행에 어울리는 넉넉한 공간을 제공합니다.",
    descEn:
      "A deluxe room offers twin beds and extra space, ideal for family or friends traveling together.",
  },
  premium: {
    key: "premium",
    title: "PREMIUM",
    nameKo: "프리미엄",
    price: 200000,
    baseGuests: 2,
    maxGuests: 4,
    main: "images/rooms3.png",
    thumbs: [
      "images/room-standard-thumb1.jpg",
      "images/room-standard-thumb2.jpg",
      "images/room-standard-thumb3.jpg",
      "images/room-standard-thumb4.jpg",
    ],
    descKo:
      "우드톤 인테리어와 별도 거실 공간을 갖춘 프리미엄 객실로, 여유로운 휴식과 모임을 동시에 즐길 수 있습니다.",
    descEn:
      "A premium room features a wood-tone interior with a separate living area for relaxed stays and gatherings.",
  },
  sweet: {
    key: "sweet",
    title: "SWEET",
    nameKo: "스위트",
    price: 250000,
    baseGuests: 4,
    maxGuests: 6,
    main: "images/rooms4.png",
    thumbs: [
      "images/room-standard-thumb1.jpg",
      "images/room-standard-thumb2.jpg",
      "images/room-standard-thumb3.jpg",
      "images/room-standard-thumb4.jpg",
    ],
    descKo:
      "고급스러운 우드 파티션과 대형 침대 두 대를 갖춘 스위트 객실로, 최대 6인까지 편안하게 머무를 수 있습니다.",
    descEn:
      "A suite room with elegant wood partitions and two large beds, comfortably accommodating up to six guests.",
  },
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_DAYS = 6; // 체크인~체크아웃 포함 일수가 이 값 이상이면 예약 불가
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function formatWon(n) {
  return n.toLocaleString("ko-KR");
}

function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Deterministic demo "already booked" dates so the calendar always shows
// a few blocked days, regardless of which month is displayed.
function isBlocked(date) {
  const day = date.getDate();
  return [5, 6, 13, 22, 23].includes(day);
}

// Real reservations already submitted through the booking form, stored in
// db.json on the server (see server.js). Fetched once and passed into the
// calendar as a plain array so date-lookup itself stays synchronous.
async function fetchReservations() {
  const res = await fetch("/api/reservations");
  return res.json();
}

async function cancelReservation(id) {
  const res = await fetch(`/api/reservations/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return res.json();
}

function reservationsToRanges(reservations, roomKey) {
  if (!roomKey) return [];
  return reservations
    .filter((b) => b.room === roomKey)
    .map((b) => {
      const [ciY, ciM, ciD] = b.checkin.split("-").map(Number);
      const [coY, coM, coD] = b.checkout.split("-").map(Number);
      return {
        checkin: new Date(ciY, ciM - 1, ciD),
        checkout: new Date(coY, coM - 1, coD),
      };
    });
}

function isReserved(date, reservedRanges) {
  return (reservedRanges || []).some(
    ({ checkin, checkout }) => date >= checkin && date < checkout,
  );
}

function getRoomFromQuery() {
  const params = new URLSearchParams(location.search);
  const key = params.get("room");
  return ROOMS[key] || ROOMS.standard;
}

// Custom alert modal (replaces the native browser alert() popup).
// Pass onConfirm to run something (e.g. navigate away) when "확인" is clicked.
function showAlert(message, title = "", onConfirm = null) {
  const overlay = document.createElement("div");
  overlay.className = "custom-alert-overlay";
  overlay.innerHTML = `
    <div class="custom-alert-box">
      <div class="custom-alert-title">${title}</div>
      <p class="custom-alert-message">${message}</p>
      <button type="button" class="custom-alert-btn">확인</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector(".custom-alert-btn").addEventListener("click", () => {
    close();
    if (onConfirm) onConfirm();
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
}

class BookingCalendar {
  constructor(container, onChange, options = {}) {
    this.container = container;
    this.onChange = onChange;
    this.readOnly = !!options.readOnly;
    this.reservedRanges = options.reservedRanges || [];
    const today = startOfDay(new Date());
    this.viewYear = today.getFullYear();
    this.viewMonth = today.getMonth();
    this.today = today;
    // 오늘 기준 6주(42일) 이내 날짜만 선택 가능. 그 이후 날짜는
    // 달력에는 보이지만 선택할 수 없도록 막는다.
    this.maxSelectable = new Date(today);
    this.maxSelectable.setDate(this.maxSelectable.getDate() + 6 * 7 - 1);
    this.checkin = options.checkin || null;
    this.checkout = options.checkout || null;
    if (this.checkin) {
      this.viewYear = this.checkin.getFullYear();
      this.viewMonth = this.checkin.getMonth();
    }
    if (this.readOnly) this.container.classList.add("calendar--readonly");
    this.render();
  }

  isUnavailable(date) {
    return isBlocked(date) || isReserved(date, this.reservedRanges);
  }

  isOutOfSelectableRange(date) {
    return date > this.maxSelectable;
  }

  changeMonth(delta) {
    this.viewMonth += delta;
    if (this.viewMonth < 0) {
      this.viewMonth = 11;
      this.viewYear -= 1;
    } else if (this.viewMonth > 11) {
      this.viewMonth = 0;
      this.viewYear += 1;
    }
    this.render();
  }

  handleDayClick(date) {
    if (
      date < this.today ||
      this.isUnavailable(date) ||
      this.isOutOfSelectableRange(date)
    )
      return;

    if (!this.checkin || (this.checkin && this.checkout)) {
      this.checkin = date;
      this.checkout = null;
    } else if (date.getTime() === this.checkin.getTime()) {
      this.checkin = null;
      this.checkout = null;
    } else if (date > this.checkin) {
      const nights = Math.round((date - this.checkin) / MS_PER_DAY);
      const days = nights + 1; // 체크인~체크아웃 포함 일수
      if (days >= MAX_DAYS) {
        showAlert(`${MAX_DAYS}일 이상 예약하실 수 없습니다.`);
        return;
      }
      // reject range that swallows a blocked date
      let blocked = false;
      for (
        let t = this.checkin.getTime() + MS_PER_DAY;
        t < date.getTime();
        t += MS_PER_DAY
      ) {
        if (this.isUnavailable(new Date(t))) blocked = true;
      }
      if (blocked) {
        this.checkin = date;
        this.checkout = null;
      } else {
        this.checkout = date;
      }
    } else {
      this.checkin = date;
      this.checkout = null;
    }
    this.render();
    this.onChange(this.checkin, this.checkout);
  }

  render() {
    const { viewYear, viewMonth } = this;
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay());

    let theadCells = WEEKDAY_LABELS.map(
      (label, i) => `<th class="${i === 0 ? "is-sun" : ""}">${label}</th>`,
    ).join("");

    let rows = "";
    const cursor = new Date(gridStart);
    // Always render exactly 6 weeks so the calendar height never changes
    // between months (previously it could stop after 5 weeks once the
    // cursor rolled into the next month, causing the grid to jump between
    // 5 and 6 rows depending on the month).
    for (let week = 0; week < 6; week++) {
      let rowHtml = "<tr>";
      for (let day = 0; day < 7; day++) {
        const d = startOfDay(cursor);
        const inMonth = d.getMonth() === viewMonth;
        const classes = ["calendar__day"];
        if (!inMonth) classes.push("is-muted");
        if (day === 0 && inMonth) classes.push("is-sun");
        if (d.getTime() === this.today.getTime()) classes.push("is-today");

        const blocked = inMonth && this.isUnavailable(d) && d >= this.today;
        if (blocked) classes.push("is-blocked");
        if (d < this.today) classes.push("is-muted");

        const outOfRange =
          inMonth && d >= this.today && this.isOutOfSelectableRange(d);
        if (outOfRange) classes.push("is-disabled");

        let tag = "";
        if (this.checkin && d.getTime() === this.checkin.getTime()) {
          classes.push("is-selected");
          tag = `<span class="tag">입실</span>`;
        } else if (this.checkout && d.getTime() === this.checkout.getTime()) {
          classes.push("is-selected");
          tag = `<span class="tag">퇴실</span>`;
        } else if (
          this.checkin &&
          this.checkout &&
          d > this.checkin &&
          d < this.checkout
        ) {
          classes.push("is-in-range");
        }

        rowHtml += `<td><div class="${classes.join(" ")}" data-date="${toDateKey(
          d,
        )}">${d.getDate()}${blocked ? '<span class="tag">예약완료</span>' : tag}</div></td>`;
        cursor.setDate(cursor.getDate() + 1);
      }
      rowHtml += "</tr>";
      rows += rowHtml;
    }

    this.container.innerHTML = `
      <div class="calendar__head">
        <button type="button" class="calendar__nav" data-nav="-1" aria-label="이전 달">&#10094;</button>
        <span>${viewYear}년 ${String(viewMonth + 1).padStart(2, "0")}월</span>
        <button type="button" class="calendar__nav" data-nav="1" aria-label="다음 달">&#10095;</button>
      </div>
      <table>
        <thead><tr>${theadCells}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    this.container.querySelectorAll("[data-nav]").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.changeMonth(Number(btn.dataset.nav)),
      );
    });
    if (!this.readOnly) {
      this.container
        .querySelectorAll(
          ".calendar__day:not(.is-muted):not(.is-blocked):not(.is-disabled)",
        )
        .forEach((el) => {
          el.addEventListener("click", () => {
            const [y, m, d] = el.dataset.date.split("-").map(Number);
            this.handleDayClick(new Date(y, m - 1, d));
          });
        });
    }
  }
}
