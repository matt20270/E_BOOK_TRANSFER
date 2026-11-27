// 인식 엔진 작업자의 메인 스레드 쪽 창구. 모든 호출은 Promise로 돌려준다.
export function createEngine() {
  const w = new Worker(new URL("./engine-worker.js", import.meta.url), { type: "module" });
  let seq = 0; const pending = new Map();
  w.onmessage = e => { const { id, ok, error, ...rest } = e.data, p = pending.get(id); if (!p) return; pending.delete(id); ok ? p.res(rest) : p.rej(new Error(error)); };
  w.onerror = e => { for (const p of pending.values()) p.rej(new Error(e.message || "worker")); pending.clear(); };
  const call = (cmd, payload = {}, transfer = []) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); w.postMessage({ cmd, id, ...payload }, transfer); });
  const buf = d => (d.buffer.byteLength === d.length ? d.buffer : d.slice().buffer);
  return {
    initBook: lang => call("initBook", { lang }),
    book: (img, lang) => { const b = buf(img.data); return call("book", { rgba: b, w: img.width, h: img.height, lang }, [b]); },
    paperBegin: (mode, lang, pdf) => call("paperBegin", { mode, lang, pdf }, pdf ? [pdf] : []),
    paperPage: (index, img, scale) => { const b = buf(img.data); return call("paperPage", { index, rgba: b, w: img.width, h: img.height, scale }, [b]); },
    paperFinish: name => call("paperFinish", { name }),
    terminate: () => { w.terminate(); for (const p of pending.values()) p.rej(new Error("terminated")); pending.clear(); },
  };
}
