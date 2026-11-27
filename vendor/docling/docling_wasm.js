/* @ts-self-types="./docling_wasm.d.ts" */

/**
 * A digital PDF being converted page by page. Construct it from the file's
 * bytes (the text layer is parsed once, in Rust), then feed the rasterized
 * pages in order.
 */
export class DigitalConverter {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        DigitalConverterFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_digitalconverter_free(ptr, 0);
    }
    /**
     * [`add_page`](Self::add_page) with TableFormer for the table regions whose
     * geometric reconstruction looks unreliable.
     * @param {number} index
     * @param {Uint8Array | number[]} rgba
     * @param {number} px_w
     * @param {number} px_h
     * @param {number} scale
     * @param {any} layout
     * @param {any} tf
     * @param {any | null} [rec]
     * @returns {Promise<void>}
     */
    addPageTf(index, rgba, px_w, px_h, scale, layout, tf, rec) {
        const val2 = +index;
        const val3 = +px_w;
        const val4 = +px_h;
        const val5 = +scale;
        const ptr0 = passArray8ToWasm0(rgba, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.digitalconverter_addPageTf(this.__wbg_ptr, val2, ptr0, len0, val3, val4, val5, layout, tf, isLikeNone(rec) ? 0 : addToExternrefTable0(rec));
        return ret;
    }
    /**
     * Convert page `index` (0-based) given its rendered bitmap: layout
     * detection plus geometric tables. `scale` is the raster's pixels per PDF
     * point (2.0 for pdf.js `{scale: 2}`). With `rec` (and a dictionary at
     * construction), embedded raster pictures that carry no text cells are
     * OCR'd — the text a digital page's images hide from its text layer.
     * @param {number} index
     * @param {Uint8Array | number[]} rgba
     * @param {number} px_w
     * @param {number} px_h
     * @param {number} scale
     * @param {any} layout
     * @param {any | null} [rec]
     * @returns {Promise<void>}
     */
    add_page(index, rgba, px_w, px_h, scale, layout, rec) {
        const val2 = +index;
        const val3 = +px_w;
        const val4 = +px_h;
        const val5 = +scale;
        const ptr0 = passArray8ToWasm0(rgba, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.digitalconverter_add_page(this.__wbg_ptr, val2, ptr0, len0, val3, val4, val5, layout, isLikeNone(rec) ? 0 : addToExternrefTable0(rec));
        return ret;
    }
    /**
     * Assemble the converted pages into a document and render it as `"md"`
     * (default), `"json"`, `"doclang"` or `"latex"`, with `images` picking how pictures
     * render in Markdown. Resets the converter.
     * @param {string} name
     * @param {string | null} [to]
     * @param {string | null} [images]
     * @returns {string}
     */
    finish(name, to, images) {
        let deferred5_0;
        let deferred5_1;
        try {
            let ptr0, len0, ptr1, len1, ptr2, len2;
            try {
                ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
                len0 = WASM_VECTOR_LEN;
                ptr1 = isLikeNone(to) ? 0 : passStringToWasm0(to, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
                len1 = WASM_VECTOR_LEN;
                ptr2 = isLikeNone(images) ? 0 : passStringToWasm0(images, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
                len2 = WASM_VECTOR_LEN;
            } catch (e) {
                if (ptr2) { wasm.__wbindgen_free(ptr2, len2 * 1, 1); }
                if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
                if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
                throw e;
            }
            const ret = wasm.digitalconverter_finish(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2);
            var ptr4 = ret[0];
            var len4 = ret[1];
            if (ret[3]) {
                ptr4 = 0; len4 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred5_0 = ptr4;
            deferred5_1 = len4;
            return getStringFromWasm0(ptr4, len4);
        } finally {
            wasm.__wbindgen_free(deferred5_0, deferred5_1, 1);
        }
    }
    /**
     * Parse the PDF's text layer. Fails when there is none — the caller should
     * fall back to the scanned pipeline, exactly as the demo page does.
     * `dict` (optional) is the recognition dictionary text; with it and a
     * `RecSession` on `add_page`, embedded raster pictures get OCR'd too.
     * @param {Uint8Array | number[]} bytes
     * @param {string | null} [dict]
     */
    constructor(bytes, dict) {
        let ptr0, len0, ptr1, len1;
        try {
            ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            len0 = WASM_VECTOR_LEN;
            ptr1 = isLikeNone(dict) ? 0 : passStringToWasm0(dict, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len1 = WASM_VECTOR_LEN;
        } catch (e) {
            if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
            if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
            throw e;
        }
        const ret = wasm.digitalconverter_new(ptr0, len0, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0];
        DigitalConverterFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Pages the text parser found.
     * @returns {number}
     */
    page_count() {
        const ret = wasm.digitalconverter_page_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Install the recognition dictionary after construction — the host probes
     * the text layer first (the constructor throws on a scan) and only then
     * fetches the recognition model + dictionary.
     * @param {string} dict
     */
    setDict(dict) {
        const ptr0 = passStringToWasm0(dict, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.digitalconverter_setDict(this.__wbg_ptr, ptr0, len0);
    }
}
if (Symbol.dispose) DigitalConverter.prototype[Symbol.dispose] = DigitalConverter.prototype.free;

/**
 * Multi-page scanned-document converter (lite profile). Feed pages in
 * order, then [`finish`](Self::finish) — cross-page paragraph continuations
 * merge exactly like the native pipeline.
 */
export class ScannedConverter {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ScannedConverterFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_scannedconverter_free(ptr, 0);
    }
    /**
     * Convert one page with TableFormer (#157 stage 3): table regions get the
     * ONNX table-structure model + docling's cell matcher instead of the
     * geometric reconstruction. `tf` is the JS-side session over the encoder /
     * decoder / bbox graphs.
     * @param {Uint8Array | number[]} rgba
     * @param {number} px_w
     * @param {number} px_h
     * @param {number} scale
     * @param {any} layout
     * @param {any} rec
     * @param {any} tf
     * @returns {Promise<void>}
     */
    addPageTf(rgba, px_w, px_h, scale, layout, rec, tf) {
        const val2 = +px_w;
        const val3 = +px_h;
        const val4 = +scale;
        const ptr0 = passArray8ToWasm0(rgba, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.scannedconverter_addPageTf(this.__wbg_ptr, ptr0, len0, val2, val3, val4, layout, rec, tf);
        return ret;
    }
    /**
     * Convert one page (lite profile — geometric tables): `rgba` is the
     * rendered bitmap (canvas ImageData), `scale` its pixels-per-PDF-point
     * (2.0 for pdf.js `{scale: 2}`; 1.0 for a standalone image).
     * @param {Uint8Array | number[]} rgba
     * @param {number} px_w
     * @param {number} px_h
     * @param {number} scale
     * @param {any} layout
     * @param {any} rec
     * @returns {Promise<void>}
     */
    add_page(rgba, px_w, px_h, scale, layout, rec) {
        const val2 = +px_w;
        const val3 = +px_h;
        const val4 = +scale;
        const ptr0 = passArray8ToWasm0(rgba, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.scannedconverter_add_page(this.__wbg_ptr, ptr0, len0, val2, val3, val4, layout, rec);
        return ret;
    }
    /**
     * Assemble the accumulated pages into the final document and render it
     * as `"md"` (default), `"json"`, `"doclang"` or `"latex"` — the same four the
     * declarative [`crate::convert`] entry point offers. `images` picks how
     * cropped figures render in Markdown (`"placeholder"` | `"embedded"`),
     * like [`crate::convert`]. Resets the converter.
     * @param {string} name
     * @param {string | null} [to]
     * @param {string | null} [images]
     * @returns {string}
     */
    finish(name, to, images) {
        let deferred5_0;
        let deferred5_1;
        try {
            let ptr0, len0, ptr1, len1, ptr2, len2;
            try {
                ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
                len0 = WASM_VECTOR_LEN;
                ptr1 = isLikeNone(to) ? 0 : passStringToWasm0(to, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
                len1 = WASM_VECTOR_LEN;
                ptr2 = isLikeNone(images) ? 0 : passStringToWasm0(images, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
                len2 = WASM_VECTOR_LEN;
            } catch (e) {
                if (ptr2) { wasm.__wbindgen_free(ptr2, len2 * 1, 1); }
                if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
                if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
                throw e;
            }
            const ret = wasm.scannedconverter_finish(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2);
            var ptr4 = ret[0];
            var len4 = ret[1];
            if (ret[3]) {
                ptr4 = 0; len4 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred5_0 = ptr4;
            deferred5_1 = len4;
            return getStringFromWasm0(ptr4, len4);
        } finally {
            wasm.__wbindgen_free(deferred5_0, deferred5_1, 1);
        }
    }
    /**
     * `dict` is the recognition dictionary text (`en_dict.txt` for the
     * default English model).
     * @param {string} dict
     */
    constructor(dict) {
        const ptr0 = passStringToWasm0(dict, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.scannedconverter_new(ptr0, len0);
        this.__wbg_ptr = ret;
        ScannedConverterFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Number of pages converted so far (progress display).
     * @returns {number}
     */
    page_count() {
        const ret = wasm.scannedconverter_page_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Attach a text-detection session (#429): detected lines no layout region
     * or recognized cell covers — a diagram's labels, a margin note — get
     * recognized and placed as orphan text, as the native pipeline and
     * docling's OCR engines do. Call once before the first `add_page`.
     * @param {any} det
     */
    setDetector(det) {
        wasm.scannedconverter_setDetector(this.__wbg_ptr, det);
    }
}
if (Symbol.dispose) ScannedConverter.prototype[Symbol.dispose] = ScannedConverter.prototype.free;

/**
 * Convert a document (as bytes + filename, the extension drives format
 * detection) to `to`: `"md"` (Markdown, default), `"json"` (docling-core's
 * `DoclingDocument` wire format, schema 1.11.0), `"text"` (plain text,
 * docling's `export_to_text`, #613), `"doclang"` (docling's
 * DocLang XML serialization), `"latex"` (docling 2.124's LaTeX document,
 * #317), `"html"`, `"pandoc"` (Pandoc's JSON AST for `pandoc -f json`,
 * #515) or `"vtt"` (WebVTT, docling's `--to vtt`, #614).
 *
 * `images` controls how pictures render in Markdown — `"placeholder"`
 * (default) or `"embedded"` (base64 data URIs), the same option
 * docling-serve exposes. `max_pages` converts only a PDF's first N pages
 * (issue #80's window, first pinned to 1); other formats ignore it.
 * `page_break_placeholder` is docling's `export_to_markdown` option of the
 * same name: text inserted between pages in the Markdown (e.g.
 * `"<!-- page break -->"`); unset, the Markdown carries no page breaks.
 * @param {Uint8Array | number[]} bytes
 * @param {string} filename
 * @param {string | null} [to]
 * @param {string | null} [images]
 * @param {number | null} [max_pages]
 * @param {string | null} [page_break_placeholder]
 * @returns {string}
 */
export function convert(bytes, filename, to, images, max_pages, page_break_placeholder) {
    let deferred8_0;
    let deferred8_1;
    try {
        const val6 = +(isLikeNone(max_pages) ? Number.MAX_SAFE_INTEGER : (max_pages) >>> 0);
        let ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4;
        try {
            ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            len0 = WASM_VECTOR_LEN;
            ptr1 = passStringToWasm0(filename, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len1 = WASM_VECTOR_LEN;
            ptr2 = isLikeNone(to) ? 0 : passStringToWasm0(to, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len2 = WASM_VECTOR_LEN;
            ptr3 = isLikeNone(images) ? 0 : passStringToWasm0(images, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len3 = WASM_VECTOR_LEN;
            ptr4 = isLikeNone(page_break_placeholder) ? 0 : passStringToWasm0(page_break_placeholder, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len4 = WASM_VECTOR_LEN;
        } catch (e) {
            if (ptr4) { wasm.__wbindgen_free(ptr4, len4 * 1, 1); }
            if (ptr3) { wasm.__wbindgen_free(ptr3, len3 * 1, 1); }
            if (ptr2) { wasm.__wbindgen_free(ptr2, len2 * 1, 1); }
            if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
            if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
            throw e;
        }
        const ret = wasm.convert(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, val6, ptr4, len4);
        var ptr7 = ret[0];
        var len7 = ret[1];
        if (ret[3]) {
            ptr7 = 0; len7 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred8_0 = ptr7;
        deferred8_1 = len7;
        return getStringFromWasm0(ptr7, len7);
    } finally {
        wasm.__wbindgen_free(deferred8_0, deferred8_1, 1);
    }
}

/**
 * One-shot scanned-image conversion through the full lite profile (layout +
 * OCR + assembly) — the browser counterpart of the native image path
 * (a standalone image is its own page at scale 1).
 * @param {Uint8Array | number[]} bytes
 * @param {string} name
 * @param {string} dict
 * @param {any} layout
 * @param {any} rec
 * @param {string | null} [to]
 * @param {string | null} [images]
 * @returns {Promise<string>}
 */
export function convert_scanned_image(bytes, name, dict, layout, rec, to, images) {
    let ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4;
    try {
        ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        len0 = WASM_VECTOR_LEN;
        ptr1 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        len1 = WASM_VECTOR_LEN;
        ptr2 = passStringToWasm0(dict, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        len2 = WASM_VECTOR_LEN;
        ptr3 = isLikeNone(to) ? 0 : passStringToWasm0(to, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        len3 = WASM_VECTOR_LEN;
        ptr4 = isLikeNone(images) ? 0 : passStringToWasm0(images, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        len4 = WASM_VECTOR_LEN;
    } catch (e) {
        if (ptr4) { wasm.__wbindgen_free(ptr4, len4 * 1, 1); }
        if (ptr3) { wasm.__wbindgen_free(ptr3, len3 * 1, 1); }
        if (ptr2) { wasm.__wbindgen_free(ptr2, len2 * 1, 1); }
        if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
        if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
        throw e;
    }
    const ret = wasm.convert_scanned_image(ptr0, len0, ptr1, len1, ptr2, len2, layout, rec, ptr3, len3, ptr4, len4);
    return ret;
}

/**
 * Convert with the full option set as one JSON object (#577): `to` and
 * `images` as in [`convert`], plus every conversion option the CLI,
 * docling-serve, the C ABI and the Python/Node bindings share — the keys of
 * `docling::ConvertOptions` (`strict`, `compact_tables`,
 * `page_break_placeholder`, `pages`, `encoding`, `skip_empty_cells`,
 * `list_attachments`, `xbrl_taxonomy`, …), validated by the same rules.
 * Options of the ML pipeline are accepted and inert in this build (the
 * formats they apply to are rejected at convert time). Unknown keys are an
 * error. `undefined` / `""` means defaults.
 *
 * ```js
 * convert_with_options(bytes, file.name, JSON.stringify({ to: "md", strict: true, pages: "1-3" }));
 * ```
 * @param {Uint8Array | number[]} bytes
 * @param {string} filename
 * @param {string | null} [options_json]
 * @returns {string}
 */
export function convert_with_options(bytes, filename, options_json) {
    let deferred5_0;
    let deferred5_1;
    try {
        let ptr0, len0, ptr1, len1, ptr2, len2;
        try {
            ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            len0 = WASM_VECTOR_LEN;
            ptr1 = passStringToWasm0(filename, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len1 = WASM_VECTOR_LEN;
            ptr2 = isLikeNone(options_json) ? 0 : passStringToWasm0(options_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len2 = WASM_VECTOR_LEN;
        } catch (e) {
            if (ptr2) { wasm.__wbindgen_free(ptr2, len2 * 1, 1); }
            if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
            if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
            throw e;
        }
        const ret = wasm.convert_with_options(ptr0, len0, ptr1, len1, ptr2, len2);
        var ptr4 = ret[0];
        var len4 = ret[1];
        if (ret[3]) {
            ptr4 = 0; len4 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred5_0 = ptr4;
        deferred5_1 = len4;
        return getStringFromWasm0(ptr4, len4);
    } finally {
        wasm.__wbindgen_free(deferred5_0, deferred5_1, 1);
    }
}

/**
 * OCR a scanned image entirely in the browser: `bytes` is the image file
 * (PNG/JPEG/…), `dict` the recognition dictionary text (`en_dict.txt` for
 * the default English model), `session` the JS inference wrapper. Returns
 * Markdown (default) or docling JSON per `to`, one paragraph per recognized
 * line.
 * @param {Uint8Array | number[]} bytes
 * @param {string} dict
 * @param {any} session
 * @param {string | null} [to]
 * @returns {Promise<string>}
 */
export function ocr_image(bytes, dict, session, to) {
    let ptr0, len0, ptr1, len1, ptr2, len2;
    try {
        ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        len0 = WASM_VECTOR_LEN;
        ptr1 = passStringToWasm0(dict, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        len1 = WASM_VECTOR_LEN;
        ptr2 = isLikeNone(to) ? 0 : passStringToWasm0(to, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        len2 = WASM_VECTOR_LEN;
    } catch (e) {
        if (ptr2) { wasm.__wbindgen_free(ptr2, len2 * 1, 1); }
        if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
        if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
        throw e;
    }
    const ret = wasm.ocr_image(ptr0, len0, ptr1, len1, session, ptr2, len2);
    return ret;
}

export function start() {
    wasm.start();
}

/**
 * The file extensions this build can convert, as a JSON string array —
 * handy for an `<input accept=…>` filter: the engine's own
 * [`InputFormat::supported_extensions`] (what `docling-rs
 * --list-input-formats` prints), which leaves out what this build lacks —
 * the ML formats (images, audio, video, METS), as the `asr` and full `pdf`
 * features are not compiled in; PDF stays, converting via its text layer
 * (`pdf-text`). A format added to the engine is listed here with no edit.
 * @returns {string}
 */
export function supported_extensions() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.supported_extensions();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * The docling.rs version this module was built from.
 * @returns {string}
 */
export function version() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.version();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_208446807d0d1e30: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg___wbindgen_debug_string_f249a2a76caa9a55: function(arg0, arg1) {
            const ret = debugString(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 1, len1, true);
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_is_function_741ff2bb612836f5: function(arg0) {
            const ret = typeof(arg0) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_undefined_be5b34249ff1fc15: function(arg0) {
            const ret = arg0 === undefined;
            return ret;
        },
        __wbg___wbindgen_number_get_934b640d0889af78: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'number' ? obj : undefined;
            getDataViewMemory0().setFloat64((arg0 >>> 0) + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_throw_4c88d8bf264fd984: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg__wbg_cb_unref_09736879a3f67559: function(arg0) {
            arg0._wbg_cb_unref();
        },
        __wbg_bbox_f2572ba737583789: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.bbox(arg1, arg2 >>> 0);
            return ret;
        }, arguments); },
        __wbg_call_a410eb4b59ed5965: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.call(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_encode_d061cec18875d371: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.encode(arg1);
            return ret;
        }, arguments); },
        __wbg_error_757e9472f8410341: function(arg0, arg1) {
            let deferred0_0;
            let deferred0_1;
            try {
                deferred0_0 = arg0;
                deferred0_1 = arg1;
                console.error(getStringFromWasm0(arg0, arg1));
            } finally {
                wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
            }
        },
        __wbg_getRandomValues_8b6f1f663e6f188d: function() { return handleError(function (arg0, arg1) {
            globalThis.crypto.getRandomValues(getArrayU8FromWasm0(arg0, arg1));
        }, arguments); },
        __wbg_get_2080c49015e35254: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_get_d7176cfb76d71114: function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return ret;
        },
        __wbg_instanceof_Float32Array_94718abab7dc1d7f: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Float32Array;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_isArray_bcf1376d0d732d08: function(arg0) {
            const ret = Array.isArray(arg0);
            return ret;
        },
        __wbg_length_6e9d2869242cabf3: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_length_b03a0fabb109b1e9: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_new_bb74001155cb8ca8: function() {
            const ret = new Error();
            return ret;
        },
        __wbg_new_from_slice_355c10c5d8f2addb: function(arg0, arg1) {
            const ret = new Float32Array(getArrayF32FromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_new_typed_e09da9dae6ee5935: function(arg0, arg1) {
            try {
                var state0 = {a: arg0, b: arg1};
                var cb0 = (arg0, arg1) => {
                    const a = state0.a;
                    state0.a = 0;
                    try {
                        return wasm_bindgen_9ed46e28887cd6de___convert__closures_____invoke___js_sys_45320a985b9deeec___Function_fn_wasm_bindgen_9ed46e28887cd6de___JsValue_____wasm_bindgen_9ed46e28887cd6de___sys__Undefined___js_sys_45320a985b9deeec___Function_fn_wasm_bindgen_9ed46e28887cd6de___JsValue_____wasm_bindgen_9ed46e28887cd6de___sys__Undefined_______true_(a, state0.b, arg0, arg1);
                    } finally {
                        state0.a = a;
                    }
                };
                const ret = new Promise(cb0);
                return ret;
            } finally {
                state0.a = 0;
            }
        },
        __wbg_prototypesetcall_22b1bb88c4ec5c5a: function(arg0, arg1, arg2) {
            Float32Array.prototype.set.call(getArrayF32FromWasm0(arg0, arg1), arg2);
        },
        __wbg_queueMicrotask_1e8503a8a690f0a3: function(arg0) {
            const ret = arg0.queueMicrotask;
            return ret;
        },
        __wbg_queueMicrotask_4a1a4d8dd332373b: function(arg0) {
            queueMicrotask(arg0);
        },
        __wbg_resolve_dbf78ab4942478b0: function(arg0) {
            const ret = Promise.resolve(arg0);
            return ret;
        },
        __wbg_run_1f495febe884c914: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = arg0.run(arg1 >>> 0, arg2 >>> 0, arg3);
            return ret;
        }, arguments); },
        __wbg_run_a6854a06169b9fb5: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.run(arg1);
            return ret;
        }, arguments); },
        __wbg_run_a96b6bd6091439d3: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            const ret = arg0.run(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4);
            return ret;
        }, arguments); },
        __wbg_stack_575c4e0918581b9c: function(arg0, arg1) {
            const ret = arg1.stack;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 1, len1, true);
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, ptr1, true);
        },
        __wbg_static_accessor_GLOBAL_THIS_003ee833af9699fc: function() {
            const ret = typeof globalThis === 'undefined' ? undefined : globalThis;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_GLOBAL_e4293fb22cbe77da: function() {
            const ret = typeof global === 'undefined' ? undefined : global;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_SELF_53bb20457401453d: function() {
            const ret = typeof self === 'undefined' ? undefined : self;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_WINDOW_b5e0810bfecb7feb: function() {
            const ret = typeof window === 'undefined' ? undefined : window;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_step_ccd8090d7857fa19: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.step(arg1);
            return ret;
        }, arguments); },
        __wbg_then_656f253a5dd7d8ea: function(arg0, arg1, arg2) {
            const ret = arg0.then(arg1, arg2);
            return ret;
        },
        __wbg_then_e3f7f2d365708be8: function(arg0, arg1) {
            const ret = arg0.then(arg1);
            return ret;
        },
        __wbindgen_generic_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 115, ret: Result(Unit), inner_ret: Some(Result(Unit)) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm_bindgen_9ed46e28887cd6de___convert__closures_____invoke___wasm_bindgen_9ed46e28887cd6de___JsValue__core_d941ad8722425d2e___result__Result_____wasm_bindgen_9ed46e28887cd6de___JsError___true_);
            return ret;
        },
        __wbindgen_generic_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            table.set(0, undefined);
            table.set(1024, undefined);
            table.set(1025, null);
            table.set(1026, true);
            table.set(1027, false);
        },
    };
    return {
        __proto__: null,
        "./docling_wasm_bg.js": import0,
    };
}

function wasm_bindgen_9ed46e28887cd6de___convert__closures_____invoke___wasm_bindgen_9ed46e28887cd6de___JsValue__core_d941ad8722425d2e___result__Result_____wasm_bindgen_9ed46e28887cd6de___JsError___true_(arg0, arg1, arg2) {
    const ret = wasm.wasm_bindgen_9ed46e28887cd6de___convert__closures_____invoke___wasm_bindgen_9ed46e28887cd6de___JsValue__core_d941ad8722425d2e___result__Result_____wasm_bindgen_9ed46e28887cd6de___JsError___true_(arg0, arg1, arg2);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

function wasm_bindgen_9ed46e28887cd6de___convert__closures_____invoke___js_sys_45320a985b9deeec___Function_fn_wasm_bindgen_9ed46e28887cd6de___JsValue_____wasm_bindgen_9ed46e28887cd6de___sys__Undefined___js_sys_45320a985b9deeec___Function_fn_wasm_bindgen_9ed46e28887cd6de___JsValue_____wasm_bindgen_9ed46e28887cd6de___sys__Undefined_______true_(arg0, arg1, arg2, arg3) {
    wasm.wasm_bindgen_9ed46e28887cd6de___convert__closures_____invoke___js_sys_45320a985b9deeec___Function_fn_wasm_bindgen_9ed46e28887cd6de___JsValue_____wasm_bindgen_9ed46e28887cd6de___sys__Undefined___js_sys_45320a985b9deeec___Function_fn_wasm_bindgen_9ed46e28887cd6de___JsValue_____wasm_bindgen_9ed46e28887cd6de___sys__Undefined_______true_(arg0, arg1, arg2, arg3);
}

const DigitalConverterFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_digitalconverter_free(ptr, 1));
const ScannedConverterFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_scannedconverter_free(ptr, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => wasm.__wbindgen_destroy_closure(state.a, state.b));

function debugString(val) {
    switch (typeof val) {
        // primitive types
        case 'number':
        case 'boolean':
        case 'undefined':
        return `${val}`;
        case 'string':
        return JSON.stringify(val);
        case 'bigint':
        return `${val}n`;
        case 'symbol':
        return val.description !== undefined
            ? `Symbol(${val.description})`
            : 'Symbol';
        case 'function':
        return typeof val.name === 'string' && val.name !== ''
            ? `Function(${val.name})`
            : 'Function';
        case 'object': {
            if (val === null) {
                return 'null';
            }
            // objects
            if (Array.isArray(val)) {
                return '[' + Array.from(val, debugString).join(', ') + ']';
            }
            // errors
            if (val instanceof Error) {
                return `${val.name}: ${val.message}\n${val.stack}`;
            }

            const toStringOutput = toString.call(val);
            // Test for built-in
            const className = /\[object ([^\]]+)\]/.exec(toStringOutput)?.[1];

            // Failed to match the standard '[object ClassName]'
            if (className === undefined) {
                return toStringOutput;
            }
            if (className === 'Object') {
                // we're a user defined class or Object
                // JSON.stringify avoids problems with cycles, and is generally much
                // easier than looping through ownProperties of `val`.
                try {
                    return 'Object(' + JSON.stringify(val) + ')';
                } catch (_) {
                    return 'Object';
                }
            }
            // TODO we could test for more things here, like `Set`s and `Map`s.
            return className;
        }
        // Per MDN: 'This list of values is exhaustive.'
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof#description
    }
}

function getArrayF32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function makeMutClosure(arg0, arg1, f) {
    const state = { a: arg0, b: arg1, cnt: 1 };
    const real = (...args) => {

        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            state.a = a;
            real._wbg_cb_unref();
        }
    };
    real._wbg_cb_unref = () => {
        if (--state.cnt === 0) {
            wasm.__wbindgen_destroy_closure(state.a, state.b);
            state.a = 0;
            CLOSURE_DTORS.unregister(state);
        }
    };
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(bytes) {
    numBytesDecoded += bytes.length;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true });
        cachedTextDecoder.decode();
        numBytesDecoded = bytes.length;
    }
    return cachedTextDecoder.decode(bytes);
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedFloat32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

let __wbg_init_promise;
async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;
    if (__wbg_init_promise === undefined) {
        __wbg_init_promise = __wbg_init_once(module_or_path);
        __wbg_init_promise.catch(() => { __wbg_init_promise = undefined; });
    }
    return __wbg_init_promise;
}

async function __wbg_init_once(module_or_path) {

    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('docling_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
