document.addEventListener("DOMContentLoaded", () => {
  /* ---------- Fixed header offset ---------- */
  // .header is position:fixed, so push the page content down by its actual
  // (dynamic, breakpoint-dependent) height to avoid it hiding under the header.
  const header = document.querySelector(".header");
  function syncHeaderOffset() {
    if (header) document.body.style.paddingTop = `${header.offsetHeight}px`;
  }
  syncHeaderOffset();
  window.addEventListener("resize", syncHeaderOffset);

  /* ---------- Hero dot slider (visual indicator + autoplay) ---------- */
  const dots = document.querySelectorAll(".hero__dot");
  const heroTrack = document.querySelector(".hero__track");
  const heroTitle = document.querySelector("#heroTitle");
  // 슬라이드별 노출 문구 (1/2/3번째 사진 순서)
  const heroTitles = ["SWEET MOMENT", "URBAN RESORT", "RELAX & RELIEF"];
  const slideCount = dots.length;
  let current = 0;
  let timer = null;

  //슬라이드 로직 변경
  function goToSlide(index) {
    current = (index + slideCount) % slideCount;
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === current));
    if (heroTrack) {
      heroTrack.style.transform = `translateX(-${current * (100 / slideCount)}%)`;
    }
    if (heroTitle) {
      heroTitle.textContent = heroTitles[current] ?? "";
    }
  }

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      goToSlide(i);
      restartAutoplay();
    });
  });

  //메인화면 4초마다 페이지 전환
  function startAutoplay() {
    timer = setInterval(() => goToSlide(current + 1), 4000);
  }
  function restartAutoplay() {
    clearInterval(timer);
    startAutoplay();
  }
  startAutoplay();

  /* ---------- Sliding rows (click-and-drag with mouse + touch) ----------
     Applies to every .scroll-row (ROOMS, EVENT, ...) instead of one
     hardcoded element, so any current or future sliding row gets the same
     mouse-drag support (touch already works natively via overflow-x). */
  function enableDragScroll(row) {
    let isDown = false;
    let dragged = false;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;

    // 공통 시작 지점: mouse / touch 모두 같은 로직 사용
    function beginDrag(clientX, clientY) {
      isDown = true;
      dragged = false;
      row.classList.add("is-dragging");
      startX = clientX;
      startY = clientY;
      startScrollLeft = row.scrollLeft;
    }

    function moveDrag(clientX, clientY) {
      if (!isDown) return;
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;
      // 가로 드래그가 세로보다 클 때만 슬라이드로 처리 (페이지 세로 스크롤 방해 금지)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 5) {
        dragged = true;
        row.scrollLeft = startScrollLeft - deltaX;
      }
    }

    function endDrag() {
      isDown = false;
      row.classList.remove("is-dragging");
    }

    // --- 마우스 ---
    row.addEventListener("mousedown", (e) => {
      beginDrag(e.pageX, e.pageY);
    });
    window.addEventListener("mouseup", endDrag);
    row.addEventListener("mouseleave", endDrag);
    row.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      moveDrag(e.pageX, e.pageY);
    });

    // --- 터치(모바일/태블릿) ---
    row.addEventListener(
      "touchstart",
      (e) => {
        const t = e.touches[0];
        beginDrag(t.pageX, t.pageY);
      },
      { passive: true },
    );
    row.addEventListener(
      "touchmove",
      (e) => {
        if (!isDown) return;
        const t = e.touches[0];
        const deltaX = t.pageX - startX;
        // 가로 드래그 중일 때만 기본 세로 스크롤을 막아 줌
        if (
          Math.abs(deltaX) > Math.abs(t.pageY - startY) &&
          Math.abs(deltaX) > 5
        ) {
          e.preventDefault();
        }
        moveDrag(t.pageX, t.pageY);
      },
      { passive: false },
    );
    row.addEventListener("touchend", endDrag);
    row.addEventListener("touchcancel", endDrag);

    // 드래그 중엔 카드/링크 이동 금지 (의도치 않은 페이지 이동 방지)
    // 룸 카드는 드래그가 아니었을 때 확대(라이트박스)로 열어줌
    row.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", (e) => {
        if (dragged) {
          e.preventDefault();
          return;
        }
        if (link.classList.contains("room-card")) {
          e.preventDefault();
          const img = link.querySelector("img");
          if (img) openLightbox(img.src, img.alt);
        }
      });
    });
  }

  /* ---------- Lightbox (자세히보기) for room photos ---------- */
  function openLightbox(src, alt) {
    const overlay = document.createElement("div");
    overlay.className = "lightbox-overlay";
    overlay.innerHTML = `
      <button type="button" class="lightbox-overlay__close" aria-label="닫기">&times;</button>
      <img src="${src}" alt="${alt || ""}" />
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.closest(".lightbox-overlay__close"))
        close();
    });
    document.addEventListener(
      "keydown",
      function onKey(e) {
        if (e.key === "Escape") {
          close();
          document.removeEventListener("keydown", onKey);
        }
      },
      { once: true },
    );
  }

  document.querySelectorAll(".scroll-row").forEach(enableDragScroll);

  /* ---------- Mobile nav: tap a menu to show its sub-items in the bottom bar
     Desktop still opens the submenu via CSS :hover. On touch/small screens a
     tap toggles .is-open instead — real link navigation is deferred to the
     sub-items, since each menu here mainly groups sub-pages. */
  const isMobileNav = () =>
    window.matchMedia("(hover: none), (max-width: 600px)").matches;

  document.querySelectorAll(".nav__item").forEach((item) => {
    const toggle = item.querySelector(":scope > a");
    if (!toggle) return;
    toggle.addEventListener("click", (e) => {
      if (!isMobileNav()) return;
      e.preventDefault();
      document
        .querySelectorAll(".nav__item.is-open")
        .forEach((el) => el.classList.remove("is-open"));
      item.classList.add("is-open");
    });
  });
  // tapping outside the menus closes the bottom bar
  document.addEventListener("click", (e) => {
    if (!isMobileNav()) return;
    if (!e.target.closest(".nav__item")) {
      document
        .querySelectorAll(".nav__item.is-open")
        .forEach((el) => el.classList.remove("is-open"));
    }
  });
  // open the current (or first) menu by default so the bottom bar isn't empty
  function openDefaultSubmenu() {
    if (!isMobileNav()) return;
    if (document.querySelector(".nav__item.is-open")) return; // keep existing state
    const items = document.querySelectorAll(".nav__item");
    if (!items.length) return;
    const current = document
      .querySelector(".nav__item .is-current")
      ?.closest(".nav__item");
    (current || items[0]).classList.add("is-open");
  }
  openDefaultSubmenu();
  window.addEventListener("resize", () => {
    if (!isMobileNav()) {
      document
        .querySelectorAll(".nav__item.is-open")
        .forEach((el) => el.classList.remove("is-open"));
    } else {
      openDefaultSubmenu();
    }
  });

  /* ---------- Back to top button ---------- */
  const toTopBtn = document.getElementById("toTop");

  function toggleToTop() {
    if (window.scrollY > 400) {
      toTopBtn.classList.add("is-visible");
    } else {
      toTopBtn.classList.remove("is-visible");
    }
  }

  window.addEventListener("scroll", toggleToTop, { passive: true });
  toggleToTop();

  toTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ---------- Header shadow on scroll ---------- */
  window.addEventListener(
    "scroll",
    () => {
      header.style.boxShadow =
        window.scrollY > 10 ? "0 2px 10px rgba(0,0,0,.06)" : "none";
    },
    { passive: true },
  );
});
