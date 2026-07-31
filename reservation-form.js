document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const room = ROOMS[params.get("room")] || ROOMS.standard;
  const checkin = params.get("checkin") || "";
  const checkout = params.get("checkout") || "";
  const guests = Number(params.get("guests") || 0);
  const total = Number(params.get("total") || room.price);

  document.getElementById("roomField").textContent = room.nameKo;
  document.getElementById("guestsField").textContent =
    guests > 0
      ? `기준 ${room.baseGuests}명 + 추가 ${guests}명`
      : `기준 ${room.baseGuests}명`;
  document.getElementById("checkinField").textContent = checkin || "-";
  document.getElementById("checkoutField").textContent = checkout || "-";
  document.getElementById("totalField").textContent = `${formatWon(total)} 원`;

  const calendarEl = document.getElementById("calendar");
  if (calendarEl && checkin && checkout) {
    const [ciY, ciM, ciD] = checkin.split("-").map(Number);
    const [coY, coM, coD] = checkout.split("-").map(Number);
    new BookingCalendar(calendarEl, () => {}, {
      readOnly: true,
      checkin: new Date(ciY, ciM - 1, ciD),
      checkout: new Date(coY, coM - 1, coD),
    });
  }

  const form = document.getElementById("bookingForm");
  const nameField = document.getElementById("guestName");
  const phoneField = document.getElementById("guestPhone");

  function validate() {
    let ok = true;
    if (!nameField.value.trim()) {
      nameField.closest(".form-field").classList.add("is-invalid");
      ok = false;
    } else {
      nameField.closest(".form-field").classList.remove("is-invalid");
    }
    const phoneDigits = phoneField.value.replace(/[^0-9]/g, "");
    if (!phoneDigits || phoneDigits.length < 9) {
      phoneField.closest(".form-field").classList.add("is-invalid");
      ok = false;
    } else {
      phoneField.closest(".form-field").classList.remove("is-invalid");
    }
    return ok;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!checkin || !checkout) {
      showAlert("예약 날짜 정보가 없습니다. 객실 선택부터 다시 진행해 주세요.");
      return;
    }
    if (!validate()) return;

    const booking = {
      id: `H${Date.now()}`,
      room: room.key,
      roomName: room.nameKo,
      checkin,
      checkout,
      guests,
      total,
      name: nameField.value.trim(),
      phone: phoneField.value.replace(/[^0-9]/g, ""),
      createdAt: new Date().toISOString(),
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(booking),
      });
      // fetch는 네트워크 장애가 아니면 reject되지 않으므로
      // HTTP 상태 코드로 성공 여부를 직접 확인해야 합니다.
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      submitBtn.disabled = false;
      showAlert(
        "예약 저장 중 오류가 발생했습니다.<br /><br />" +
          "서버(http://localhost:8899)가 실행 중인지, " +
          "이 페이지를 서버 주소로 열었는지 확인해 주세요.<br />" +
          "(file:// 또는 다른 포트의 미리보기로 열면 저장되지 않습니다.)",
      );
      return;
    }

    showAlert(
      `예약이 완료되었습니다.<br />`,
      // +
      //   `예약번호 : ${booking.id}<br />` +
      //   `${booking.roomName} · ${booking.checkin} ~ ${booking.checkout}<br />` +
      //   `예약자 : ${booking.name} (${booking.phone})<br />` +
      //   `총 결제금액 : ${formatWon(booking.total)} 원`,
      "안내",
      () => {
        location.href = "index.html";
      },
    );
  });

  document.getElementById("cancelFormBtn").addEventListener("click", () => {
    history.back();
  });
});
