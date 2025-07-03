// controllers/ocrController.js
const { OpenAI } = require("openai");
const jsonic      = require("jsonic");    // sedikit lebih toleran parsing JSON
const debug       = require("debug")("app:ocr");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // (jika mau override baseURL: baseURL: process.env.OPENAI_API_BASE )
});

/**
 * POST /api/transactions/ocr
 * field: file (Form-Data)
 */
exports.processReceipt = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "field `file` wajib di-upload" });
    }

    // 1) encode buffer → data URI
    const mime = req.file.mimetype; // ex: image/jpeg
    const b64  = req.file.buffer.toString("base64");
    const dataUri = `data:${mime};base64,${b64}`;
    debug("dataUri:", dataUri.slice(0,50)+"…");

    // 2) siapkan prompt
    const systemPrompt = 
      "Kamu adalah extractor JSON untuk struk belanja.\n" +
    "- **tanggal**: cari pola tanggal di struk (DD.MM.YY, DD-MM-YYYY, dsb.) → format YYYY-MM-DD.\n" +
     `  Jika TIDAK ADA tanggal sama sekali, fallback ke tanggal hari ini.\n` +
    "- **kategori**: nama merchant (jika nggak ada, pakai “Struk Belanja”).\n" +
    "- **items**: untuk setiap baris item,\n" +
    "    • HARUS ambil **nama barang** dan **qty** → gabungkan jadi `\"<nama barang> x<qty>\"`.\n" +
    "    • HARUS ambil **harga satuan**, lalu hitung `total_pengeluaran = qty * harga_satuan`.\n" +
    "- **sumber**: selalu “foto”.\n" +
    "Output **pure JSON** tanpa teks lain, format:\n" +
    "{\n" +
    '  "items":[\n' +
    "    {\n" +
    '      "tanggal":"<YYYY-MM-DD>",\n' +
    '      "kategori":"<merchant>",\n' +
    '      "nama_pengeluaran":"<nama barang> x<qty>",\n' +
    '      "total_pengeluaran":<qty*harga_satuan>,\n' +
    '      "sumber":"foto"\n' +
    "    },\n" +
    "    …\n" +
    "  ]\n" +
    "}";

    // 3) panggil GPT-4o
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",    // atau “gpt-4o-mini” sesuai langganan
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: [
            { type: "text",      text: "Berikut struk belanja (image di bawah).  Kembalikan JSON sesuai spec." },
            { type: "image_url", image_url: { url: dataUri } }
          ]
        }
      ],
      temperature: 0,
      max_tokens:   800,
    });

    const raw = completion.choices[0].message.content;
    debug("GPT raw:", raw);

    // 4) strip ``` serta parse JSON
    const cleaned = raw.replace(/```(?:json)?\n?|```/g,"").trim();
    let result;
    try {
      result = JSON.parse(cleaned);
    } catch(err) {
      // coba parsing tolerant
      result = jsonic(cleaned);
    }

    return res.json(result);

  } catch(err) {
    console.error("OCR error:", err);
    return next(err);
  }
};
