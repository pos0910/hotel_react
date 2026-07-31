document.addEventListener("DOMContentLoaded", async () => {
  const listEl = document.getElementById("reservationList");

  async function load() {
    let reservations = [];
    try {
      reservations = await fetchReservations();
    } catch (err) {
      listEl.innerHTML = `<p class="booking-summary" style="text-align:center">예약 목록을 불러오지 못했습니다. 서버가 실행 중인지 확인해 주세요.</p>`;
      return;
    }
    if (!reservations.length) {
      listEl.innerHTML = `<p class="booking-summary" style="text-align:center">예약 내역이 없습니다.</p>`;
      return;
    }
    listEl.innerHTML = reservations
      .map(
        (r) => `
        <div class="reservation-list__item" data-id="${r.id}">
          <div class="reservation-list__info">
            <strong>${ROOMS[r.room] ? ROOMS[r.room].nameKo : r.roomName || r.room}</strong>
            <span>${r.checkin} ~ ${r.checkout}</span>
            <span>${r.name} (${r.phone})</span>
            <span>${formatWon(r.total)} 원</span>
          </div>
          <button type="button" class="btn reservation-list__cancel" data-id="${r.id}">예약 취소</button>
        </div>
      `,
      )
      .join("");

    listEl.querySelectorAll(".reservation-list__cancel").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("이 예약을 취소하시겠습니까?")) return;
        await cancelReservation(btn.dataset.id);
        load();
      });
    });
  }

  load();
});
