require("dotenv").config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const PDFDocument = require('./pdf-kit');
const moment = require('moment-timezone');
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImageToCloudinary = async (file) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: "pengeluaran-images",
          resource_type: "image",
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result.secure_url);
        }
      )
      .end(file.buffer);
  });
};


// Fungsi untuk mendapatkan tabel berdasarkan tipe
const getTableByType = (type) => {
    if (type === 'pengeluaran') {
        return { table: prisma.pengeluaran, idField: 'idTransaksiPengeluaran' };
    } else if (type === 'pemasukan') {
        return { table: prisma.pemasukan, idField: 'idTransaksiPemasukan' };
    }
    return null;
};

// const uploadImageToGCS = async (file) => {
//     const { buffer, originalname } = file;
//     const destination = `pengeluaran-images/${originalname}`;

//     const bucket = storage.bucket(bucketName);
//     const blob = bucket.file(destination);
//     const blobStream = blob.createWriteStream();

//     return new Promise((resolve, reject) => {
//         blobStream.on('finish', () => {
//             const publicUrl = `https://storage.googleapis.com/${bucketName}/${destination}`;
//             resolve(publicUrl);
//         }).on('error', (err) => {
//             reject(err);
//         }).end(buffer);
//     });
// };



exports.getAllTransactionsByUser = async (req, res) => {
    const { type, idUser } = req.params;
    const tableInfo = getTableByType(type);

    if (!tableInfo) {
        return res.status(400).json({ error: true, message: 'Invalid transaction type' });
    }

    try {
        const transactions = await tableInfo.table.findMany({
            where: { idUser },
            include: {
                user: true,
            },
        });

        // Map transactions to desired format
        const formattedTransactions = transactions.map(curr => {
            const transactionData = {
                idTransaksi: curr[tableInfo.idField],
                jumlah: curr.jumlah,
                deskripsi: curr.deskripsi,
                tanggal: curr.tanggal,
                kategori: curr.kategori,
                sumber: curr.sumber,
            };
            if (type === 'pengeluaran') {
                transactionData.lampiran = curr.lampiran;
            }
            return transactionData;
        });

        // Return the formatted transactions
        res.json({
            error: false,
            message: "Message Success",
            transactions: formattedTransactions
        });
    } catch (err) {
        res.status(500).json({ error: true, message: err.message });
    }
};

exports.getTransactionById = async (req, res) => {
    const { idTransaksi, type } = req.params;
    const tableInfo = getTableByType(type);

    if (!tableInfo) {
        return res.status(400).json({ error: true, message: 'Invalid transaction type' });
    }

    try {
        // Cari ID transaksi dalam tabel laporan
        const laporanData = await prisma.laporan.findUnique({
            where: {
                OR: [
                    { idTransaksiPengeluaran: parseInt(idTransaksi) },
                    { idTransaksiPemasukan: parseInt(idTransaksi) }
                ]
            }
        });

        if (!laporanData) {
            return res.status(404).json({ error: true, message: 'Transaction not found in report' });
        }

        // Ambil data transaksi dari tabel yang sesuai, kecuali idTransaksi dan idUser
        const transactionData = await tableInfo.table.findUnique({
            where: {
                [tableInfo.idField]: parseInt(idTransaksi)
            },
            select: {
                jumlah: true,
                deskripsi: true,
                tanggal: true,
                kategori: true,
                sumber: true,
                lampiran: true // Sesuaikan dengan kolom-kolom yang ingin ditampilkan
            },
        });

        if (!transactionData) {
            return res.status(404).json({ error: true, message: 'Transaction data not found' });
        }

        res.json({ error: false, message: 'Success', data: transactionData });
    } catch (err) {
        res.status(500).json({ error: true, message: err.message });
    }
};


exports.createTransaction = async (req, res) => {
    const { idUser, jumlah, deskripsi, kategori, sumber, tanggal } = req.body;
    const { type } = req.params;
    const tableInfo = getTableByType(type);

    if (!tableInfo) {
        return res.status(400).json({ message: 'Jenis transaksi tidak valid' });
    }

    try {
        let lampiranUrl = null;

        if (type === 'pengeluaran' && req.file) {
            lampiranUrl = await uploadImageToCloudinary(req.file);
        }

        const dateToUse = tanggal ? new Date(tanggal) : new Date();

        const transactionData = {
            idUser,
            jumlah: parseFloat(jumlah),
            deskripsi,
            tanggal: dateToUse,
            kategori,
            sumber,
            ...(type === 'pengeluaran' && { lampiran: lampiranUrl }) // Sertakan lampiran jika tipe pengeluaran
        };

        const Transaksi = await tableInfo.table.create({ data: transactionData });

        // Membuat laporan
        await prisma.laporan.create({
            data: {
                idUser,
                keterangan: deskripsi,
                tanggal: dateToUse,
                ...(type === 'pengeluaran' ? { idTransaksiPengeluaran: Transaksi.idTransaksiPengeluaran }
                     : { idTransaksiPemasukan: Transaksi.idTransaksiPemasukan })
            }
        });

        res.status(201).json(Transaksi);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};
exports.updateTransaction = async (req, res) => {
    const { id, type } = req.params;
    const updateData = {...req.body};
    if (updateData.tanggal) {
        updateData.tanggal = new Date(updateData.tanggal);
    }
    const tableInfo = getTableByType(type);

    if (!tableInfo) {
        return res.status(400).json({ message: 'Invalid transaction type' });
    }

    try {
        // Validasi bahwa data yang diterima tidak kosong
        if (!updateData || Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'No data provided for update' });
        }

        const Transaksi = await tableInfo.table.update({
            where: { [tableInfo.idField]: id },
            data: updateData,
        });

        res.json(Transaksi);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.deleteTransaction = async (req, res) => {
    const { id, type } = req.params;
    const tableInfo = getTableByType(type);

    if (!tableInfo) {
        return res.status(400).json({ message: 'Invalid transaction type' });
    }

    try {
        // Memeriksa apakah transaksi dengan id yang diberikan ada
        const transaction = await tableInfo.table.findUnique({
            where: { [tableInfo.idField]: id },
        });

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Menghapus transaksi
        await tableInfo.table.delete({
            where: { [tableInfo.idField]: id },
        });

        res.json({ message: 'Transaction removed' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.exportToPDF = async (req, res) => {
    const userId = req.params.userId;
    const userTz = req.headers['timezone'] || 'Asia/Makassar';
    const { month, year } = req.query;

    try {
        moment.locale('id');

        let filterPemasukan = { idUser: userId };
        let filterPengeluaran = { idUser: userId };

        if (month && year) {
            const startDate = moment.tz(`${year}-${month}-01`, userTz).startOf('month').toDate();
            const endDate = moment.tz(`${year}-${month}-01`, userTz).endOf('month').toDate();

            filterPemasukan.tanggal = { gte: startDate, lte: endDate };
            filterPengeluaran.tanggal = { gte: startDate, lte: endDate };
        }

        const pemasukan = await prisma.pemasukan.findMany({
            where: filterPemasukan,
            include: { user: true },
            orderBy: { tanggal: 'desc' }
        });

        const pengeluaran = await prisma.pengeluaran.findMany({
            where: filterPengeluaran,
            include: { user: true },
            orderBy: { tanggal: 'desc' }
        });

        // === Buat dokumen PDF ===
        const doc = new PDFDocument({ margin: 50 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            let pdfData = Buffer.concat(buffers);
            res.setHeader('Content-Disposition', 'attachment; filename=transactions.pdf');
            res.setHeader('Content-Type', 'application/pdf');
            res.end(pdfData);
        });

        // ===== HEADER PDF =====
        doc.fillColor('#000000')
            .font('Helvetica-Bold')
            .fontSize(20)
            .text('Transaction Report FinancyQ', { align: 'center' });

        doc.moveDown(0.5)
            .fontSize(10)
            .font('Helvetica')
            .text('FinancyQ', { align: 'right' })
            .fontSize(10)
            .font('Helvetica')
            .text('Makassar, Sulawesi Selatan', { align: 'right' });

        // ===== PERIODE =====
        if (month && year) {
            const bulanNama = moment(month, 'MM').format('MMMM');
            doc.moveDown(1)
                .fontSize(13)
                .font('Helvetica-Bold')
                .text(`Periode: ${bulanNama} ${year}`, { align: 'center' });
        } else {
            doc.moveDown(1)
                .fontSize(13)
                .font('Helvetica-Bold')
                .text(`Periode: Semua Data`, { align: 'center' });
        }

        doc.moveDown(2);

        // ===== PEMASUKAN =====
        doc.fontSize(15)
            .font('Helvetica-Bold')
            .text('Pemasukan', { align: 'left' });

        const pemasukanTable = {
            headers: ['Tanggal', 'Deskripsi', 'Jumlah', 'Kategori', 'Sumber'],
            rows: []
        };
        let totalPemasukan = 0;
        pemasukan.forEach((trx, idx) => {
            const formattedDate = moment(trx.tanggal).tz(userTz).format('DD MMMM YYYY, HH:mm');
            pemasukanTable.rows.push([
                formattedDate,
                trx.deskripsi,
                trx.jumlah,
                trx.kategori,
                trx.sumber
            ]);
            totalPemasukan += trx.jumlah;
        });
        pemasukanTable.rows.push(['', 'Total Pemasukan', totalPemasukan, '', '']);
        doc.moveDown(0.5).table(pemasukanTable, { width: 500 });

        // ===== PENGELUARAN =====
        doc.moveDown(2)
            .fontSize(15)
            .font('Helvetica-Bold')
            .text('Pengeluaran', { align: 'left' });

        const pengeluaranTable = {
            headers: ['Tanggal', 'Deskripsi', 'Jumlah', 'Kategori', 'Sumber'],
            rows: []
        };
        let totalPengeluaran = 0;
        pengeluaran.forEach((trx, idx) => {
            const formattedDate = moment(trx.tanggal).tz(userTz).format('DD MMMM YYYY, HH:mm');
            pengeluaranTable.rows.push([
                formattedDate,
                trx.deskripsi,
                trx.jumlah,
                trx.kategori,
                trx.sumber
            ]);
            totalPengeluaran += trx.jumlah;
        });
        pengeluaranTable.rows.push(['', 'Total Pengeluaran', totalPengeluaran, '', '']);
        doc.moveDown(0.5).table(pengeluaranTable, { width: 530 });

        doc.end();

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getTotalTransactions = async (req, res) => {
    const { type, idUser } = req.params;
    const tableInfo = getTableByType(type);

    if (!tableInfo) {
        return res.status(400).json({ message: 'Invalid transaction type' });
    }

    try {
        const transactions = await tableInfo.table.findMany({
            where: { idUser },
        });

        const total = transactions.reduce((acc, transaction) => acc + transaction.jumlah, 0);

        res.json({
            error: false,
            message: 'Success',
            data: {
                type,
                idUser,
                total,
            },
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};



