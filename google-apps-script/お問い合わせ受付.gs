/**
 * 建設業AI顧問LP — お問い合わせ受付
 *
 * ■ 事前準備
 * 1. スプレッドシートを新規作成し、URLから「スプレッドシートID」をコピー
 * 2. 下の SPREADSHEET_ID に貼り付け
 * 3. エディタで「実行」→ setupHeaders() を1回選んで実行（初回は権限承認が必要）
 *
 * ■ ウェブアプリのデプロイ
 * 1. 「デプロイ」→「新しいデプロイ」
 * 2. 種類: ウェブアプリ
 * 3. 次のユーザーとして実行: 本人
 * 4. アクセスできるユーザー: 全員  （LPを誰でも見る想定の場合）
 * 5. デプロイ → 表示されたURL（/exec）を config.js の GAS_WEB_APP_URL に貼る
 */
var SPREADSHEET_ID = "ここにスプレッドシートIDを貼り付け";
var SHEET_NAME = "お問い合わせ";
/** 任意。空なら未チェック。LPの config.js と同じ文字列にすると簡易スパム対策になります。 */
var OPTIONAL_SHARED_SECRET = "";

/**
 * 初回だけエディタから実行: 1行目にヘッダを書きます。
 */
function setupHeaders() {
  var sheet = getOrCreateSheet_();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "受信日時",
      "お名前",
      "メールアドレス",
      "会社名",
      "電話番号",
      "お問い合わせ内容",
      "個人情報取り扱い同意",
      "送信元"
    ]);
  }
}

/**
 * LP から POST: application/x-www-form-urlencoded（e.parameter）または JSON
 */
function doPost(e) {
  var out = { ok: false, error: "" };
  try {
    var d = parseContactPayload_(e);
    if (OPTIONAL_SHARED_SECRET && (d._secret || "") !== OPTIONAL_SHARED_SECRET) {
      throw new Error("unauthorized");
    }
    if (!d.name || String(d.name).trim() === "") {
      throw new Error("お名前は必須です");
    }
    if (!d.email || String(d.email).trim() === "") {
      throw new Error("メールアドレスは必須です");
    }
    if (d.privacy !== true && d.privacy !== "true" && d.privacy !== "on") {
      throw new Error("同意が必要です");
    }

    var sheet = getOrCreateSheet_();
    if (sheet.getLastRow() === 0) {
      setupHeaders();
    }
    sheet.appendRow([
      new Date(),
      String(d.name || "").trim(),
      String(d.email || "").trim(),
      String(d.company || "").trim(),
      String(d.phone || "").trim(),
      String(d.message || "").trim(),
      d.privacy === true || d.privacy === "true" || d.privacy === "on" ? "同意" : "",
      String(d.source || "LP")
    ]);
    out.ok = true;
  } catch (err) {
    out.error = err.message || String(err);
  }
  return ContentService
    .createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * フォーム(e.parameter) / JSON 両方に対応
 */
function parseContactPayload_(e) {
  if (e.parameter) {
    var p = e.parameter;
    if (
      (p.name && String(p.name).trim() !== "") ||
      (p.email && String(p.email).trim() !== "")
    ) {
      return {
        _secret: p._secret,
        name: p.name,
        email: p.email,
        company: p.company,
        phone: p.phone,
        message: p.message,
        privacy: p.privacy,
        source: p.source
      };
    }
  }
  if (e.postData && e.postData.contents) {
    return JSON.parse(e.postData.contents);
  }
  throw new Error("受信データがありません。フォームの method=post か、JSON本文をご確認ください。");
}

/**
 * 動作確認用（ブラウザで /exec を開いたときの表示）
 */
function doGet() {
  return ContentService
    .createTextOutput("お問い合わせ受付: 有効")
    .setMimeType(ContentService.MimeType.TEXT);
}

function getOrCreateSheet_() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.indexOf("ここ") === 0) {
    throw new Error("SPREADSHEET_ID を設定してください");
  }
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName(SHEET_NAME);
  if (sh) return sh;
  return ss.insertSheet(SHEET_NAME);
}
