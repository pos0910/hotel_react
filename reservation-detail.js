document.addEventListener("DOMContentLoaded", async () => {
  const room = getRoomFromQuery();
  let reservedRanges = [];
  try {
    const reservations = await fetchReservations();
    reservedRanges = reservationsToRanges(reservations, room.key);
  } catch (err) {
    console.error(
      "예약 현황을 불러오지 못했습니다. 서버가 실행 중인지 확인해 주세요.",
      err,
    );
  }
  const extraGuests = room.maxGuests - room.baseGuests;

  document.title = `${room.nameKo} 객실 예약 | H HOTEL`;
  document.getElementById("roomTitle").textContent = room.nameKo.toUpperCase();
  document.getElementById("mainPhoto").src = room.main;
  document.getElementById("mainPhoto").alt = `${room.nameKo} 객실`;
  document.getElementById("descKo").textContent = room.descKo;
  document.getElementById("descEn").textContent = room.descEn;

  // ===== 사진 갤러리 (썸네일 + 스와이프) =====
  const mainPhoto = document.getElementById("mainPhoto");
  const thumbWrap = document.getElementById("thumbs");
  const allPhotos = [room.main, ...room.thumbs];
  let currentIndex = 0;

  function showPhoto(index) {
    currentIndex = (index + allPhotos.length) % allPhotos.length;
    mainPhoto.src = allPhotos[currentIndex];
    mainPhoto.alt = `${room.nameKo} 객실 사진 ${currentIndex + 1}`;
    thumbWrap.querySelectorAll("img").forEach((t, i) => {
      t.classList.toggle("is-active", i === currentIndex);
    });
  }

  if (room.thumbs.length) {
    room.thumbs.forEach((src, i) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = `${room.nameKo} 객실 사진 ${i + 1}`;
      if (i === 0) img.classList.add("is-active");
      img.addEventListener("click", () => showPhoto(i));
      thumbWrap.appendChild(img);
    });
  } else {
    thumbWrap.style.display = "none";
  }

  // 모바일 스와이프 감지
  let touchStartX = 0;
  let touchEndX = 0;

  mainPhoto.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].screenX;
    },
    { passive: true },
  );

  mainPhoto.addEventListener(
    "touchend",
    (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    },
    { passive: true },
  );

  function handleSwipe() {
    const diff = touchEndX - touchStartX;
    const threshold = 40; // 최소 스와이프 거리(px)
    if (Math.abs(diff) < threshold) return;

    if (diff < 0) {
      showPhoto(currentIndex + 1); // 왼쪽으로 스와이프 → 다음 사진
    } else {
      showPhoto(currentIndex - 1); // 오른쪽으로 스와이프 → 이전 사진
    }
  }

  // ===== 인원 선택 =====
  const guestSelect = document.getElementById("extraGuests");
  guestSelect.innerHTML = "";
  for (let i = 0; i <= extraGuests; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i === 0 ? "없음" : `${i}명`;
    guestSelect.appendChild(opt);
  }
  guestSelect.disabled = extraGuests === 0;
  document.getElementById("guestsHint").textContent =
    `기준 인원 ${room.baseGuests}명, 추가 시 한 명당 객실 가격의 20%`;

  // ===== 가격/예약 =====
  const totalEl = document.getElementById("totalPrice");
  const bookBtn = document.getElementById("bookBtn");
  let checkin = null;
  let checkout = null;

  function updateTotal() {
    const nights =
      checkin && checkout ? Math.round((checkout - checkin) / 86400000) : 0;
    const guests = Number(guestSelect.value || 0);
    const total = nights > 0 ? room.price * nights * (1 + guests * 0.2) : 0;
    totalEl.textContent = `${formatWon(total)} 원`;
    bookBtn.disabled = !(checkin && checkout);
  }

  const calendar = new BookingCalendar(
    document.getElementById("calendar"),
    (ci, co) => {
      checkin = ci;
      checkout = co;
      updateTotal();
    },
    { reservedRanges },
  );

  guestSelect.addEventListener("change", updateTotal);
  updateTotal();

  document.getElementById("cancelBtn").addEventListener("click", () => {
    location.href = "reservation-rooms.html";
  });

  bookBtn.addEventListener("click", () => {
    if (!checkin || !checkout) {
      showAlert("체크인/체크아웃 날짜를 선택해 주세요.");
      return;
    }
    const nights = Math.round((checkout - checkin) / 86400000);
    const guests = Number(guestSelect.value || 0);
    const total = room.price * nights * (1 + guests * 0.2);
    const params = new URLSearchParams({
      room: room.key,
      checkin: toDateKey(checkin),
      checkout: toDateKey(checkout),
      guests: String(guests),
      total: String(Math.round(total)),
    });
    location.href = `reservation-form.html?${params.toString()}`;
  });
});
