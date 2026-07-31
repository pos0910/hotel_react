// ============================================================
// H HOTEL - 로컬 개발용 백엔드 서버 (Node.js) - HTTP 버전
// ============================================================
// 역할:
//   1) 이 폴더의 정적 파일(index.html, .js, 이미지 등)을 웹에 제공
//   2) db.json 파일을 "데이터베이스" 삼아 예약 데이터를 저장/조회/삭제
//
// TLS는 앞단의 Traefik이 처리(termination)하므로 이 서버는 순수 HTTP만 담당
// 실행: node server.js  →  http://0.0.0.0:8899 에서 동작
// ============================================================

const http = require("http"); // HTTP 서버 생성용 내장 모듈
const fs = require("fs"); // 파일 읽기/쓰기용 내장 모듈
const path = require("path"); // 파일 경로 조작용 내장 모듈

const PORT = 8899; // 서버가 열릴 포트 번호
const ROOT = __dirname; // 이 파일(server.js)이 있는 폴더 경로 = 프로젝트 루트
const DB_PATH = path.join(ROOT, "db.json"); // 데이터베이스 역할을 할 JSON 파일 경로

// 파일 확장자에 따른 MIME 타입(콘텐츠 종류) 매핑표
// 브라우저가 파일을 올바르게 해석하도록 Content-Type 헤더를 지정할 때 사용
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

// ------------------------------------------------------------
// [DB 읽기] db.json 파일을 읽어서 자바스크립트 배열로 반환
// 파일이 없거나 JSON 형식이 잘못되었으면 빈 배열([])을 반환해 안전하게 처리
// ------------------------------------------------------------
function readDb() {
  if (!fs.existsSync(DB_PATH)) return []; // 파일이 없으면 빈 배열
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")); // 파일 읽어서 배열로 변환
  } catch {
    return []; // JSON 파싱 실패 시 빈 배열
  }
}

// ------------------------------------------------------------
// [DB 쓰기] 예약 배열을 db.json 파일에 저장 (덮어쓰기)
// JSON.stringify의 3번째 인자 "2" → 들여쓰기 2칸으로 예쁘게 저장
// ------------------------------------------------------------
function writeDb(reservations) {
  fs.writeFileSync(DB_PATH, JSON.stringify(reservations, null, 2), "utf-8");
}

// ------------------------------------------------------------
// [응답 도우미] 클라이언트에게 JSON 형태로 응답을 보냄
// status: HTTP 상태 코드 (200=성공, 201=생성됨, 400=잘못된 요청 등)
// payload: 응답으로 보낼 데이터 (객체/배열)
// ------------------------------------------------------------
function sendJson(res, status, payload) {
  const body = JSON.stringify(payload); // 데이터를 JSON 문자열로 변환
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body), // 한글 등 깨짐 방지용 바이트 길이
  });
  res.end(body); // 응답 본문 전송 → 요청 종료
}

// ------------------------------------------------------------
// [요청 본문 읽기] POST 요청으로 들어온 데이터(body)를 문자열로 모아 반환
// HTTP 요청은 데이터가 여러 조각(chunk)으로 나뉘어 전송되므로,
// 다 받을 때까지(end 이벤트) 모아서 하나로 합침 → Promise로 비동기 처리
// ------------------------------------------------------------
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; // 데이터 조각들을 담을 배열
    req.on("data", (chunk) => chunks.push(chunk)); // 조각 도착할 때마다 저장
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8"))); // 다 모이면 합쳐서 반환
    req.on("error", reject); // 오류 발생 시 Promise 거부
  });
}

// ------------------------------------------------------------
// [정적 파일 서빙] 요청한 URL 경로의 파일을 찾아 브라우저에 전달
// 예: /index.html, /script.js, /images/rooms1.png 등
// ------------------------------------------------------------
function serveStatic(req, res) {
  // 쿼리스트링(?a=1 등)을 제거하고 경로만 추출 후 디코딩(한글 파일명 등 처리)
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html"; // 루트 접속 시 메인 페이지 제공

  const filePath = path.join(ROOT, urlPath);

  // 보안: 요청 경로가 프로젝트 폴더(ROOT) 밖을 가리키면 차단 (경로 탐색 공격 방지)
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); // 403 Forbidden
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found"); // 파일이 없으면 404 응답
      return;
    }
    // 확장자에 맞는 MIME 타입을 찾아 응답 헤더 설정 후 파일 데이터 전송
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
    });
    res.end(data);
  });
}

// ============================================================
// HTTP 서버 생성 및 요청 처리 (핵심 라우팅)
// 클라이언트의 모든 요청이 이 함수로 들어옴
// ============================================================
const server = http.createServer(async (req, res) => {
  const urlPath = req.url.split("?")[0]; // 쿼리스트링 제외한 경로만 추출

  // ------------------------------------------------------------
  // API 1) 전체 예약 목록 조회
  // GET /api/reservations → db.json 전체 내용 반환
  // ------------------------------------------------------------
  if (urlPath === "/api/reservations" && req.method === "GET") {
    sendJson(res, 200, readDb());
    return;
  }

  // ------------------------------------------------------------
  // API 2) 새 예약 추가
  // POST /api/reservations → 요청 본문의 예약 데이터를 db.json에 저장
  // ------------------------------------------------------------
  if (urlPath === "/api/reservations" && req.method === "POST") {
    let data;
    try {
      const bodyText = await readBody(req); // 요청 본문 읽기 (비동기)
      data = JSON.parse(bodyText || "{}"); // JSON 문자열 → 객체 변환
    } catch {
      sendJson(res, 400, { error: "invalid JSON body" }); // JSON 형식 오류 시 400 응답
      return;
    }
    const reservations = readDb(); // 기존 예약 배열 로드
    reservations.push(data); // 새 예약 추가
    writeDb(reservations); // db.json에 다시 저장
    sendJson(res, 201, data); // 201 Created + 저장된 데이터 반환
    return;
  }

  // ------------------------------------------------------------
  // API 3) 예약 취소(삭제)
  // DELETE /api/reservations/<id> → 해당 id의 예약을 db.json에서 제거
  // ------------------------------------------------------------
  if (urlPath.startsWith("/api/reservations/") && req.method === "DELETE") {
    const id = urlPath.split("/").pop(); // URL 마지막 부분에서 id 추출
    const reservations = readDb(); // 기존 예약 배열 로드
    const remaining = reservations.filter((r) => r.id !== id); // 해당 id만 제외
    const removed = remaining.length !== reservations.length; // 실제로 삭제됐는지 여부
    writeDb(remaining); // 걸러진 배열을 db.json에 저장
    sendJson(res, 200, { removed }); // 200 OK + 삭제 여부 반환
    return;
  }

  // ------------------------------------------------------------
  // 위 API에 해당하지 않는 모든 요청 → 정적 파일로 처리
  // (index.html, script.js, 이미지 등을 브라우저에 제공)
  // ------------------------------------------------------------
  serveStatic(req, res);
});

// 서버를 지정한 포트에서 대기 상태로 실행 (모든 인터페이스에서 수신)
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Serving ${ROOT} at http://0.0.0.0:${PORT}`);
});
