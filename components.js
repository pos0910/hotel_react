// Shared header / footer / back-to-top button as native Web Components.
// No build step or server-side include needed: each custom element renders
// its markup into the light DOM on connect, so existing CSS (style.css)
// and existing script.js selectors (.header, #toTop, etc.) keep working
// unchanged.

function isHomePage() {
  const path = location.pathname;
  return path === "/" || path.endsWith("/index.html") || path === "";
}

class SiteHeader extends HTMLElement {
  connectedCallback() {
    const current = this.getAttribute("current") || "";
    const prefix = isHomePage() ? "" : "index.html";
    const isCurrent = (name) => (name === current ? "is-current" : "");

    //header
    this.innerHTML = `
    <header class="header">
    <a href="${prefix || "index.html"}" class="logo">H</a>
    <nav class="nav">
    
    <div class="nav__item">
      <a class="${isCurrent("about")}">ABOUT</a>
      <div class="nav__submenu">
        <a>호텔 소개</a>
        <a>오시는길</a>
      </div>
    </div>
    <span class="nav__divider"></span>

      <div class="nav__item">
        <a class="${isCurrent("rooms")}">ROOMS</a>
        <div class="nav__submenu">
          <a>ROOM1</a>
          <a>ROOM2</a>
          <a>ROOM3</a>
        </div>
      </div>
      <span class="nav__divider"></span>

      <div class="nav__item">
        <a class="${isCurrent("reservation")}">RESERVATION</a>
        <div class="nav__submenu">
          <a href="reservation.html">예약안내</a>
          <a href="reservation-rooms.html">실시간안내</a>
        </div>
      </div>
      <span class="nav__divider"></span>

      <div class="nav__item">
        <a class="${isCurrent("community")}">COMMUNITY</a>
        <div class="nav__submenu">
          <a>공지사항</a>
          <a>이벤트</a>
          <a>FAQ</a>
        </div>
      </div>
      
    </nav>
  </header>
`;
  }
}
//footer
class SiteFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="footer">
        <a href="index.html" class="footer__logo">H</a>
        <div class="footer__social">
          <a href="#" aria-label="Instagram">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.2" cy="6.8" r="1" />
            </svg>
          </a>
          <a href="#" aria-label="Facebook">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
              <path d="M15 3h-2a4 4 0 0 0-4 4v3H7v4h2v7h4v-7h2.5l.5-4h-3V7a1 1 0 0 1 1-1h2z" />
            </svg>
          </a>
          <a href="#" aria-label="Youtube">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
              <rect x="2" y="6" width="20" height="12" rx="3" />
              <path d="M10 9.5v5l5-2.5z" fill="currentColor" stroke="none" />
            </svg>
          </a>
        </div>
        <p class="footer__address">
          서울특별시 강남구 테헤란로 123 H호텔 4F&nbsp;5F<br />
          대표전화 02-000-0000&nbsp;&nbsp;팩스 02-000-0000
        </p>
        <p class="footer__copy">Copyright ⓒ 2026 H Hotel All rights reserved.</p>
      </footer>
    `;
  }
}

//위 버튼
class ToTopButton extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <button class="to-top" id="toTop" aria-label="맨 위로">
       <img src="images/arrow-up.png">
      </button>
    `;
  }
}

customElements.define("site-header", SiteHeader);
customElements.define("site-footer", SiteFooter);
customElements.define("to-top-button", ToTopButton);
