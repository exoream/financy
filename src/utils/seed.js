const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const educationContents = [
    {
      title: "Cara Mengelola Pengeluaran untuk Meraih Keseimbangan Keuangan",
      description:
        "Mengelola pengeluaran adalah kunci keseimbangan keuangan yang sehat. Hal tersebut bukan hanya tentang menahan diri dari pembelian yang tidak perlu, tetapi juga merencanakan tujuan keuangan masa depan. Pelajari cara membuat anggaran efektif, menetapkan prioritas keuangan, dan mengembangkan kebiasaan pengeluaran bijaksana untuk mencapai kestabilan finansial dan meraih impian tanpa stres.",
      content: "Mengamankan Masa Depan dengan Pendidikan Keuangan",
      imageUrl:
        "https://raw.githubusercontent.com/exoream/financy/refs/heads/main/public/images/1.jpg",
      source:
        "https://www.prudential.co.id/id/pulse/article/cara-mengelola-pengeluaran/",
    },
    {
      title: "Pentingnya Penghematan Pengeluaran untuk Rencana Finansial Anda",
      description:
        "Penghematan membantu membangun cadangan dana darurat dan mengelola pengeluaran dengan bijak. Pengelolaan keuangan yang efektif juga membantu merencanakan masa depan keuangan yang lebih stabil.",
      content: "Penghematan Sekarang, Kesejahteraan Masa Depan",
      imageUrl:
        "https://raw.githubusercontent.com/exoream/financy/refs/heads/main/public/images/2.jpg",
      source: "http://repository.stei.ac.id/5615/3/BAB%20II.pdf",
    },
    {
      title: "Tips Pengelolaan Keuangan untuk Generasi Muda",
      description:
        "Dapatkan tips mengelola keuangan untuk generasi muda, termasuk perencanaan keuangan, menabung, hidup dengan anggaran, dan mencari penghasilan tambahan. Pahami pentingnya pengelolaan keuangan untuk masa depan yang lebih baik.",
      content: "Rencanakan Hari Ini, Sukseskan Esok",
      imageUrl:
        "https://raw.githubusercontent.com/exoream/financy/refs/heads/main/public/images/4.jpg",
      source:
        "https://buletin.nscpolteksby.ac.id/tips-pengelolaan-keuangan-untuk-generasi-muda/",
    },
    {
      title: "Pentingnya Pengelolaan Keuangan bagi Generasi Z",
      description:
        "Dapatkan pandangan menarik tentang pentingnya mengelola keuangan sejak muda untuk membentuk fondasi yang kokoh dalam merencanakan masa depan. Generasi Z ditantang untuk memahami pengelolaan keuangan guna menghadapi risiko finansial di masa mendatang. Mulailah hari ini dengan bijaksana mengelola keuangan dan menetapkan tujuan yang jelas untuk masa depan yang sukses.",
      content: "Bijak Mengelola Keuangan, Mewujudkan Masa Depan Generasi Z",
      imageUrl:
        "https://raw.githubusercontent.com/exoream/financy/refs/heads/main/public/images/5.jpg",
      source:
        "https://rri.co.id/keuangan/519622/pentingnya-pengelolaan-keuangan-bagi-generasi-z",
    },
    {
      title: "Para Generasi Z, Ayo Kelola Uangmu dengan Bijak!",
      description:
        "Temukan strategi menarik untuk Generasi Z dalam mengatur keuangan mereka. Artikel ini membahas pentingnya menabung sejak dini, komitmen dalam mengelola uang, serta strategi khusus untuk menghadapi dampak negatif dari era digital.",
      content: "Gen Z, Atur Uangmu dengan Bijak!",
      imageUrl:
        "https://raw.githubusercontent.com/exoream/financy/refs/heads/main/public/images/6.png",
      source:
        "https://www.uii.ac.id/gen-z-biar-gak-boros-yuk-atur-uang-dengan-cara-ini/",
    },
    {
      title:
        "Mengatasi Perilaku Boros Sebagai Kunci Menuju Kesehatan Finansial dan Lingkungan",
      description:
        "Temukan cara mengatasi perilaku boros yang merugikan kesehatan finansial dan lingkungan. Artikel ini membahas dampak negatif perilaku boros pada kesadaran sosial, kesejahteraan mental, dan lingkungan, serta memberikan solusi untuk mengatasinya.",
      content: "Ayo, Lawan Perilaku Boros!",
      imageUrl:
        "https://raw.githubusercontent.com/exoream/financy/refs/heads/main/public/images/7.png",
      source:
        "https://greatdayhr.com/id-id/blog/akibat-berperilaku-boros-dan-cara-mengatasinya/",
    },
    {
      title: "Understanding The Reason of Impulse Purchases and Solutions",
      description:
        "Explore the reason behind impulse buying and discover effective strategies to curb it. This article delves into the reasons why we often succumb to impulse purchases and provides actionable tips to regain control. Learn how to manage your impulsive shopping urges and cultivate wiser financial habits.",
      content: "Master Your Impulses, Master Your Wallet!",
      imageUrl:
        "https://raw.githubusercontent.com/exoream/financy/refs/heads/main/public/images/8.jpeg",
      source: "https://www.ramseysolutions.com/budgeting/stop-impulse-buys",
    },
  ];

  for (const content of educationContents) {
    await prisma.educationContent.create({
      data: content,
    });
  }

  console.log("Database has been seeded. 🌱");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
